package com.app.whatsappcatalog;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    private JSObject sharedData = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShareReceiverPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
        notifyShareEvent();
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        String type = intent.getType();

        Log.d("MatumShare", "handleIntent action: " + action + ", type: " + type);

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            JSObject data = new JSObject();

            if (type.startsWith("text/")) {
                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                data.put("text", text);
                sharedData = data;
            } else if (type.startsWith("image/")) {
                Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                String caption = intent.getStringExtra(Intent.EXTRA_TEXT);

                data.put("text", caption);
                if (imageUri != null) {
                    String localPath = saveImageToCache(imageUri);
                    if (localPath != null) {
                        data.put("imagePath", localPath);
                    }
                }
                sharedData = data;
            }
        }
    }

    private String saveImageToCache(Uri uri) {
        try {
            InputStream is = getContentResolver().openInputStream(uri);
            if (is == null) return null;

            String extension = "jpg";
            String type = getContentResolver().getType(uri);
            if (type != null && type.contains("/")) {
                extension = type.split("/")[1];
            }

            File cacheDir = getCacheDir();
            if (!cacheDir.exists()) {
                cacheDir.mkdirs();
            }

            File tempFile = new File(cacheDir, "shared_whatsapp_" + System.currentTimeMillis() + "." + extension);
            OutputStream os = new FileOutputStream(tempFile);

            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
            }

            os.close();
            is.close();

            return tempFile.getAbsolutePath();
        } catch (Exception e) {
            Log.e("MatumShare", "Error saving shared image", e);
            return null;
        }
    }

    public JSObject getSharedData() {
        return sharedData;
    }

    public void clearSharedData() {
        sharedData = null;
    }

    private void notifyShareEvent() {
        if (sharedData != null) {
            try {
                ShareReceiverPlugin plugin = (ShareReceiverPlugin) getBridge().getPlugin("ShareReceiver").getInstance();
                if (plugin != null) {
                    plugin.triggerShareEvent(sharedData);
                }
            } catch (Exception e) {
                Log.e("MatumShare", "Error notifying share event", e);
            }
        }
    }
}
