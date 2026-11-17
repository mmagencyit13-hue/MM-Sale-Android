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
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG;
    private boolean authenticating;

    private boolean available() {
        return BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS)
                == BiometricManager.BIOMETRIC_SUCCESS;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", available());
        call.resolve(result);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (authenticating) {
                call.reject("Biometric authentication is already in progress.");
                return;
            }
            if (!available()) {
                call.reject("Set up fingerprint or supported biometrics in Android settings.");
                return;
            }
            authenticating = true;
            BiometricPrompt prompt = new BiometricPrompt(
                    getActivity(), ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            authenticating = false;
                            call.resolve();
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence message) {
                            authenticating = false;
                            call.reject(message.toString());
                        }
                    });
            prompt.authenticate(new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock MMA Tradelink")
                    .setAllowedAuthenticators(AUTHENTICATORS)
                    .setNegativeButtonText("Cancel")
                    .build());
        });
    }
}
