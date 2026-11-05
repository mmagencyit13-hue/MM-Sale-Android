package com.mmatradelink.erp;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MMABiometric")
public class MMABiometricPlugin extends Plugin {
    private boolean showing;

    @PluginMethod
    public void available(PluginCall call) {
        int status = BiometricManager.from(getContext())
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        call.resolve(new JSObject().put("ok", status == BiometricManager.BIOMETRIC_SUCCESS));
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (showing) {
                call.reject("Authentication is already open.");
                return;
            }
            int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG;
            if (BiometricManager.from(getContext()).canAuthenticate(authenticators)
                    != BiometricManager.BIOMETRIC_SUCCESS) {
                call.reject("Set up a supported biometric in Android Settings.");
                return;
            }
            showing = true;
            BiometricPrompt prompt = new BiometricPrompt(getActivity(),
                ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        showing = false;
                        call.resolve(new JSObject().put("ok", true));
                    }

                    @Override
                    public void onAuthenticationError(int code, CharSequence message) {
                        showing = false;
                        call.reject(message.toString());
                    }
                });
            prompt.authenticate(new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock MMA Tradelink")
                .setAllowedAuthenticators(authenticators)
                .setNegativeButtonText("Use ERP password")
                .build());
        });
    }
}
