package app.gridzy.game;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Must run after super.onCreate(), once the splash theme has been replaced by the
        // app theme; earlier, the window would be built with the splash theme's title bar.
        // Transparent system bars with light icons for our dark background.
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );
        keepGameClearOfSystemBars();
    }

    /**
     * The WebView's parent paints the game's gradient over the whole screen and pads the
     * WebView so the game sits between the status bar and the navigation bar. The same
     * result on every Android and WebView version (Capacitor's own inset handling is
     * disabled in capacitor.config.json).
     */
    private void keepGameClearOfSystemBars() {
        View container = (View) getBridge().getWebView().getParent();
        container.setBackgroundResource(R.drawable.window_background);
        ViewCompat.setOnApplyWindowInsetsListener(container, (view, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(container);
    }
}
