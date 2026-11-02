package com.mmagency.sales;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
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
        return data;
    }
    private String name(PluginCall call) {
        String value = call.getString("name", "MM_Document.pdf").replaceAll("[\\\\/\\p{Cntrl}]", "_");
        return value.isEmpty() ? "MM_Document.pdf" : value.substring(0, Math.min(160, value.length()));
    }
    private String mime(PluginCall call) {
        String value = call.getString("mime", "application/pdf");
        return value.matches("[A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+") ? value : "application/octet-stream";
    }
    private void picker(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime(call));
        intent.putExtra(Intent.EXTRA_TITLE, name(call));
        startActivityForResult(call, intent, "savedDocument");
    }
    @PluginMethod public void save(PluginCall call) {
        try { bytes(call); picker(call); }
        catch (Exception e) { call.reject("Unable to save document. " + e.getMessage()); }
    }
    @ActivityCallback private void savedDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            JSObject reply = new JSObject(); reply.put("cancelled", true); call.resolve(reply); return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
            if (stream == null) throw new Exception("Storage location unavailable");
            stream.write(bytes(call));
            JSObject reply = new JSObject(); reply.put("saved", true); call.resolve(reply);
        } catch (Exception e) { call.reject("Document could not be written. Please retry."); }
    }
    private void documentIntent(PluginCall call, boolean share) {
        try {
            File folder = new File(getContext().getCacheDir(), "mma-documents/" + UUID.randomUUID());
            if (!folder.mkdirs()) throw new Exception("Document folder unavailable");
            File file = new File(folder, name(call));
            try (FileOutputStream stream = new FileOutputStream(file)) { stream.write(bytes(call)); }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(share ? Intent.ACTION_SEND : Intent.ACTION_VIEW);
            if (share) { intent.setType(mime(call)); intent.putExtra(Intent.EXTRA_STREAM, uri); }
            else intent.setDataAndType(uri, mime(call));
            intent.setClipData(ClipData.newRawUri("MM document", uri));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            try {
                getActivity().startActivity(Intent.createChooser(intent, share ? "Share document" : "Open document"));
                JSObject reply = new JSObject(); reply.put("opened", true); call.resolve(reply);
            } catch (ActivityNotFoundException e) { picker(call); }
        } catch (Exception e) { call.reject("Document could not be opened. " + e.getMessage()); }
    }
    @PluginMethod public void open(PluginCall call) { documentIntent(call, false); }
    @PluginMethod public void share(PluginCall call) { documentIntent(call, true); }
    @PluginMethod public void openUrl(PluginCall call) {
        try {
            Uri uri = Uri.parse(call.getString("url", ""));
            if (!"https".equals(uri.getScheme()) || !"wa.me".equals(uri.getHost())) throw new Exception("Unsupported WhatsApp URL");
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, uri));
            JSObject reply = new JSObject(); reply.put("opened", true); call.resolve(reply);
        } catch (Exception e) { call.reject("WhatsApp could not be opened. Check that WhatsApp or a browser is installed."); }
    }
}
