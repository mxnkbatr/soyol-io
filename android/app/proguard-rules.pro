# Capacitor / plugin classes (required when minifyEnabled is true)
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
  public protected *;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.NativePlugin public class * {
  public protected *;
}
-keep public class * extends org.apache.cordova.* {
  public protected *;
}

# Capacitor Community plugins
-keep class com.getcapacitor.community.** { *; }
-keep class io.capawesome.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
