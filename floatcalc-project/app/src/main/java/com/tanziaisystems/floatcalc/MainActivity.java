package com.tanziaisystems.floatcalc;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override public void onCreate(Bundle b){ super.onCreate(b); buildUi(); }
    @Override protected void onResume(){ super.onResume(); if(Settings.canDrawOverlays(this)) startCalc(); }
    private void startCalc(){
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},1002);
        Intent i=new Intent(this,FloatingCalculatorService.class);
        if(Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i);
    }
    private void buildUi(){
        LinearLayout root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setGravity(Gravity.CENTER); root.setPadding(48,64,48,64); root.setBackgroundColor(Color.rgb(8,10,18));
        TextView title=new TextView(this); title.setText("TANZI FloatCalc"); title.setTextColor(Color.WHITE); title.setTextSize(30); title.setGravity(Gravity.CENTER); root.addView(title,new LinearLayout.LayoutParams(-1,-2));
        TextView sub=new TextView(this); sub.setText("מחשבון צף מעל כל אפליקציה\nאישור חד-פעמי ואז הוא תמיד זמין"); sub.setTextColor(Color.rgb(170,210,230)); sub.setTextSize(18); sub.setGravity(Gravity.CENTER); sub.setPadding(0,24,0,36); root.addView(sub,new LinearLayout.LayoutParams(-1,-2));
        Button btn=new Button(this); btn.setText("הפעל מחשבון צף"); btn.setTextSize(20); btn.setOnClickListener(v->{ if(!Settings.canDrawOverlays(this)){ Intent in=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:"+getPackageName())); startActivity(in);} else startCalc(); }); root.addView(btn,new LinearLayout.LayoutParams(-1,150));
        Button stop=new Button(this); stop.setText("כבה מחשבון צף"); stop.setOnClickListener(v->stopService(new Intent(this,FloatingCalculatorService.class))); LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,130); p.topMargin=24; root.addView(stop,p);
        TextView note=new TextView(this); note.setText("לאחר ההפעלה אפשר לצאת מהאפליקציה. העיגול הצף נשאר על המסך."); note.setTextColor(Color.LTGRAY); note.setTextSize(15); note.setGravity(Gravity.CENTER); note.setPadding(0,28,0,0); root.addView(note,new LinearLayout.LayoutParams(-1,-2));
        setContentView(root);
    }
}
