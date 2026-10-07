package com.tanziaisystems.floatcalc;
import android.content.*; import android.os.Build; import android.provider.Settings;
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent i){
        if(Settings.canDrawOverlays(c)){
            Intent s=new Intent(c,FloatingCalculatorService.class);
            if(Build.VERSION.SDK_INT>=26)c.startForegroundService(s); else c.startService(s);
        }
    }
}
