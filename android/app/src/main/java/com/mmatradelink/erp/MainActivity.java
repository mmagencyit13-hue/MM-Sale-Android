package com.mmatradelink.erp;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MMADocumentsPlugin.class);
        registerPlugin(MMABiometricPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING);
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        getBridge().getWebView().addOnLayoutChangeListener((view, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom) -> {
            int width = right - left, height = bottom - top;
            if (width > 0 && height > 0) getBridge().getWebView().evaluateJavascript(
                "window.MMAViewport646={width:" + width + "/devicePixelRatio,height:" + height + "/devicePixelRatio};window.dispatchEvent(new Event('mma-native-viewport646'));", null);
        });
        ViewCompat.requestApplyInsets(content);
    }
}
