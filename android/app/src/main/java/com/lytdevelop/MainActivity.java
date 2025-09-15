// C:\Mahavir\LTY Package Update\lyt-develop\android\app\src\main\java\com\example\app\MainActivity.java

package com.lytdevelop; // Replace with your app's actual package name

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings; // Import WebSettings
import android.webkit.WebView; // Import WebView

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This is a debugging-level change and should not be used for a production build
        // as it makes your application insecure. The best long-term solution is always
        // to migrate your API to HTTPS.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Correct way to set mixed content mode
            WebView myWebView = new WebView(this);
            myWebView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}