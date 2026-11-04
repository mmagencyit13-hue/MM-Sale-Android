package com.mmatradelink.erp;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "MMADocuments")
public class MMADocumentsPlugin extends Plugin {
    private static final int LIMIT = 25 * 1024 * 1024;
    private byte[] bytes(PluginCall call) throws Exception {
        String raw = call.getString("base64", "");
        if (raw.isEmpty() || raw.length() > ((LIMIT + 2) / 3) * 4 + 10) throw new Exception("Document is empty or exceeds 25 MB");
        byte[] data = Base64.decode(raw, Base64.DEFAULT);
        if (data.length == 0 || data.length > LIMIT) throw new Exception("Document is empty or exceeds 25 MB");
        if ("application/pdf".equals(mime(call)) && (data.length < 5 || data[0] != '%' || data[1] != 'P' || data[2] != 'D' || data[3] != 'F' || data[4] != '-')) throw new Exception("Invalid PDF file");
        return data;
    }
    private String name(PluginCall call) {
        String value = call.getString("name", "MMA_Document.pdf").replaceAll("[\\\\/\\p{Cntrl}]", "_");
        return value.isEmpty() ? "MMA_Document.pdf" : value.substring(0, Math.min(160, value.length()));
    }
    private String mime(PluginCall call) {
        String value = call.getString("mime", "application/pdf");
        return value.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+") ? value : "application/octet-stream";
    }
    private File stage(PluginCall call) throws Exception {
        File folder = new File(getContext().getCacheDir(), "mma-documents/" + UUID.randomUUID());
        if (!folder.mkdirs()) throw new Exception("Document folder unavailable");
        File file = new File(folder, name(call));
        try (FileOutputStream out = new FileOutputStream(file)) { out.write(bytes(call)); }
        // Never retain megabytes of base64 in Activity saved state while another app opens.
        call.getData().remove("base64");
        call.getData().put("stagedPath646", file.getAbsolutePath());
        return file;
    }
    private void picker(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime(call));
        intent.putExtra(Intent.EXTRA_TITLE, name(call));
        startActivityForResult(call, intent, "savedDocument");
    }
    @PluginMethod public void save(PluginCall call) {
        getBridge().execute(() -> {
            Uri uri = null;
            try {
                File file = stage(call);
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                    getActivity().runOnUiThread(() -> picker(call));
                    return;
                }
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, name(call));
                values.put(MediaStore.Downloads.MIME_TYPE, mime(call));
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MMA Tradelink");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("Downloads folder unavailable");
                copy(file, uri);
                values.clear(); values.put(MediaStore.Downloads.IS_PENDING, 0);
                if (getContext().getContentResolver().update(uri, values, null, null) != 1) throw new Exception("Download could not be completed");
                file.delete();
                JSObject reply = new JSObject(); reply.put("saved", true); reply.put("uri", uri.toString()); reply.put("location", "Downloads/MMA Tradelink"); call.resolve(reply);
            } catch (Exception e) {
                if (uri != null) { try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) {} }
                call.reject("Document could not be saved. " + e.getMessage());
            }
        });
    }
    private void copy(File file, Uri uri) throws Exception {
        try (FileInputStream in = new FileInputStream(file); OutputStream out = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (out == null) throw new Exception("Storage location unavailable");
            byte[] buffer = new byte[16384]; int size;
            while ((size = in.read(buffer)) != -1) out.write(buffer, 0, size);
            out.flush();
        }
    }
    @ActivityCallback private void savedDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;
        File staged = new File(call.getString("stagedPath646", ""));
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            staged.delete(); JSObject reply = new JSObject(); reply.put("cancelled", true); call.resolve(reply); return;
        }
        try {
            copy(staged, result.getData().getData()); staged.delete();
            JSObject reply = new JSObject(); reply.put("saved", true); call.resolve(reply);
        } catch (Exception e) { call.reject("Document could not be written. Please retry."); }
    }
    private Intent intent(PluginCall call, File file, boolean share) {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        Intent intent = new Intent(share ? Intent.ACTION_SEND : Intent.ACTION_VIEW);
        if (share) { intent.setType(mime(call)); intent.putExtra(Intent.EXTRA_STREAM, uri); }
        else intent.setDataAndType(uri, mime(call));
        intent.setClipData(ClipData.newRawUri("MMA document", uri));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }
    private void documentIntent(PluginCall call, boolean share) {
        try {
            File file = stage(call); Intent intent = intent(call, file, share);
            try {
                getActivity().startActivity(Intent.createChooser(intent, share ? "Share document" : "Open document"));
                JSObject reply = new JSObject(); reply.put("opened", true); call.resolve(reply);
            } catch (ActivityNotFoundException e) {
                if (share) { call.reject("No document sharing app is installed."); return; }
                picker(call);
            }
        } catch (Exception e) { call.reject("Document could not be opened. " + e.getMessage()); }
    }
    @PluginMethod public void open(PluginCall call) { documentIntent(call, false); }
    @PluginMethod public void share(PluginCall call) { documentIntent(call, true); }
    @PluginMethod public void shareWhatsApp(PluginCall call) {
        try {
            String phone = call.getString("phone", "");
            if (!phone.matches("[0-9]{10,15}")) throw new Exception("Invalid WhatsApp number");
            File file = stage(call);
            for (String pkg : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
                Intent send = intent(call, file, true);
                send.setPackage(pkg);
                // WhatsApp versions which accept jid open this contact; other versions show their recipient picker.
                send.putExtra("jid", phone + "@s.whatsapp.net");
                send.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
                try {
                    getActivity().startActivity(send);
                    JSObject reply = new JSObject(); reply.put("opened", true); reply.put("deliveryVerified", false); call.resolve(reply); return;
                } catch (ActivityNotFoundException missing) { /* Try WhatsApp Business. */ }
            }
            call.reject("WhatsApp is not installed. Install WhatsApp or WhatsApp Business to share this PDF.");
        } catch (Exception e) { call.reject("PDF could not be shared. " + e.getMessage()); }
    }
    @PluginMethod public void openUrl(PluginCall call) {
        try {
            Uri uri = Uri.parse(call.getString("url", ""));
            if (!"https".equals(uri.getScheme()) || !"wa.me".equals(uri.getHost())) throw new Exception("Unsupported WhatsApp URL");
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            JSObject reply = new JSObject(); reply.put("opened", true); call.resolve(reply);
        } catch (Exception e) { call.reject("WhatsApp could not be opened. Check that WhatsApp or a browser is installed."); }
    }
}
