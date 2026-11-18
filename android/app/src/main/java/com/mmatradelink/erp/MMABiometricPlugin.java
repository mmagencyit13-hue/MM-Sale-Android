package com.mmatradelink.erp;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "MMABiometric")
public class MMABiometricPlugin extends Plugin {
    private static final int AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_STRONG;
    private static final String KEY_ALIAS = "mma-biometric-login-v666";
    private boolean authenticating;

    private boolean available() {
        return BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS)
                == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private SharedPreferences vault() {
        return getContext().getSharedPreferences(KEY_ALIAS, Context.MODE_PRIVATE);
    }

    private SecretKey secretKey(boolean create) throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.getKey(KEY_ALIAS, null) instanceof SecretKey) {
            return (SecretKey) store.getKey(KEY_ALIAS, null);
        }
        if (!create) throw new IllegalStateException("Biometric login needs to be set up again.");
        KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= 30) {
            spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        } else {
            spec.setUserAuthenticationValidityDurationSeconds(-1);
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(spec.build());
        return generator.generateKey();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", available());
        result.put("saved", vault().contains("ciphertext"));
        call.resolve(result);
    }

    @PluginMethod
    public void clearLogin(PluginCall call) {
        vault().edit().clear().apply();
        try {
            KeyStore store = KeyStore.getInstance("AndroidKeyStore");
            store.load(null);
            store.deleteEntry(KEY_ALIAS);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not clear biometric setup.");
        }
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        prompt(call, null, false);
    }

    @PluginMethod
    public void saveLogin(PluginCall call) {
        String credentials = call.getString("credentials", "");
        if (credentials.isEmpty()) {
            call.reject("Sign in with your password once to set up biometric login.");
            return;
        }
        prompt(call, credentials, true);
    }

    @PluginMethod
    public void readLogin(PluginCall call) {
        prompt(call, null, true);
    }

    private void prompt(PluginCall call, String credentials, boolean useVault) {
        getActivity().runOnUiThread(() -> {
            if (authenticating || !available()) {
                call.reject("Biometric authentication is already active or unavailable.");
                return;
            }
            final Cipher cipher;
            try {
                cipher = useVault ? Cipher.getInstance("AES/GCM/NoPadding") : null;
                if (useVault && credentials != null) {
                    cipher.init(Cipher.ENCRYPT_MODE, secretKey(true));
                } else if (useVault) {
                    String iv = vault().getString("iv", "");
                    if (iv.isEmpty() || !vault().contains("ciphertext")) {
                        throw new IllegalStateException("Biometric login is not set up.");
                    }
                    cipher.init(Cipher.DECRYPT_MODE, secretKey(false),
                            new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
                }
            } catch (Exception error) {
                call.reject("Sign in with your password to set up biometric login again.");
                return;
            }

            authenticating = true;
            BiometricPrompt biometricPrompt = new BiometricPrompt(
                    getActivity(), ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            authenticating = false;
                            try {
                                if (cipher == null) {
                                    call.resolve();
                                    return;
                                }
                                Cipher authorized = result.getCryptoObject().getCipher();
                                if (credentials != null) {
                                    byte[] encoded = authorized.doFinal(credentials.getBytes(StandardCharsets.UTF_8));
                                    boolean saved = vault().edit()
                                            .putString("iv", Base64.encodeToString(authorized.getIV(), Base64.NO_WRAP))
                                            .putString("ciphertext", Base64.encodeToString(encoded, Base64.NO_WRAP)).commit();
                                    if (!saved) throw new IllegalStateException("Could not save biometric login.");
                                    call.resolve();
                                } else {
                                    byte[] encoded = Base64.decode(vault().getString("ciphertext", ""), Base64.NO_WRAP);
                                    JSObject login = new JSObject();
                                    login.put("credentials", new String(authorized.doFinal(encoded), StandardCharsets.UTF_8));
                                    call.resolve(login);
                                }
                            } catch (Exception error) {
                                call.reject("Biometric login could not be completed. Use your password.");
                            }
                        }

                        @Override
                        public void onAuthenticationError(int code, CharSequence message) {
                            authenticating = false;
                            call.reject(message.toString());
                        }
                    });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock MMA Tradelink")
                    .setAllowedAuthenticators(AUTHENTICATORS)
                    .setNegativeButtonText("Cancel").build();
            if (cipher == null) biometricPrompt.authenticate(info);
            else biometricPrompt.authenticate(info, new BiometricPrompt.CryptoObject(cipher));
        });
    }
}
