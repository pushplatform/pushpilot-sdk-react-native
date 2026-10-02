# Troubleshooting

Common issues and solutions for Push Platform React Native SDK.

## Table of Contents

- [Installation Issues](#installation-issues)
- [iOS Issues](#ios-issues)
- [Android Issues](#android-issues)
- [Runtime Issues](#runtime-issues)
- [Notification Issues](#notification-issues)

---

## Installation Issues

### npm install fails with peer dependency conflicts

**Problem:** npm reports peer dependency conflicts during installation.

**Solution:** Use the `--legacy-peer-deps` flag:

```bash
npm install @pushplatform/react-native --legacy-peer-deps
```

Or if using yarn:

```bash
yarn add @pushplatform/react-native --ignore-engines
```

---

### Module not found after installation

**Problem:** `Cannot find module '@pushplatform/react-native'`

**Solution:**

1. Clear Metro bundler cache:
   ```bash
   npm start -- --reset-cache
   ```

2. Reinstall node_modules:
   ```bash
   rm -rf node_modules && npm install
   ```

3. For iOS, reinstall pods:
   ```bash
   cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
   ```

---

## iOS Issues

### CocoaPods installation fails

**Problem:** `pod install` fails with dependency errors.

**Solution:**

1. Update CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```

2. Update pod repo:
   ```bash
   cd ios && pod repo update && pod install && cd ..
   ```

3. If still failing, try:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod cache clean --all
   pod install
   cd ..
   ```

---

### PushPlatformSDK module not found

**Problem:** Build fails with `Module 'PushPlatformSDK' not found`.

**Solution:**

Ensure the native iOS SDK is included in your project. Check that `sdk-ios` is properly linked or available as a Swift Package/CocoaPod dependency.

If using a local development setup:

```ruby
# In ios/Podfile
pod 'PushPlatformSDK', :path => '../pushpilot-sdk-ios'
```

---

### Xcode build fails with Swift version mismatch

**Problem:** Build fails with Swift version compatibility errors.

**Solution:**

1. Ensure Xcode 14+ is installed
2. Set Swift version in project:
   - Open Xcode
   - Select project target
   - Build Settings → Swift Language Version → Swift 5

---

### Notifications not received on iOS

**Problem:** Notifications don't appear on iOS device.

**Solution:**

1. **Check capabilities:**
   - Xcode → Target → Signing & Capabilities
   - Ensure "Push Notifications" capability is enabled
   - Add "Background Modes" with "Remote notifications" checked

2. **Check Info.plist:**
   ```xml
   <key>UIBackgroundModes</key>
   <array>
       <string>remote-notification</string>
   </array>
   ```

3. **Request permissions:**
   ```typescript
   import { requestNotifications } from 'react-native-permissions';
   const { status } = await requestNotifications(['alert', 'badge', 'sound']);
   ```

4. **Test on real device:**
   - Push notifications don't work in iOS Simulator
   - Use a physical device for testing

---

### VoIP push not working

**Problem:** VoIP push notifications not delivered.

**Solution:**

1. **Add VoIP capability:**
   ```xml
   <key>UIBackgroundModes</key>
   <array>
       <string>voip</string>
   </array>
   ```

2. **Ensure PushKit entitlement:**
   - Xcode → Target → Signing & Capabilities
   - Background Modes → Voice over IP

3. **VoIP requires real device and valid certificate**

---

## Android Issues

### Gradle sync fails

**Problem:** Gradle sync fails with dependency resolution errors.

**Solution:**

1. **Update Android Gradle Plugin:**
   ```gradle
   // android/build.gradle
   classpath("com.android.tools.build:gradle:8.1.1")
   ```

2. **Check minimum SDK version:**
   ```gradle
   // android/app/build.gradle
   android {
       defaultConfig {
           minSdkVersion 26
           targetSdkVersion 34
       }
   }
   ```

3. **Clean and rebuild:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

---

### Module not found in Android build

**Problem:** Build fails with `Could not find com.pushplatform:sdk-android`.

**Solution:**

Ensure the Android SDK dependency is correctly referenced:

```gradle
// android/app/build.gradle
dependencies {
    implementation project(':sdk-android:sdk')
}
```

For local development, ensure `settings.gradle` includes:

```gradle
include ':sdk-android:sdk'
project(':sdk-android:sdk').projectDir = new File(rootProject.projectDir, '../pushpilot-sdk-android/sdk')
```

---

### FCM token not registering

**Problem:** Android device doesn't receive push notifications.

**Solution:**

1. **Add google-services.json:**
   - Download from Firebase Console
   - Place in `android/app/google-services.json`

2. **Add Firebase dependencies:**
   ```gradle
   // android/build.gradle
   classpath 'com.google.gms:google-services:4.4.0'
   
   // android/app/build.gradle
   apply plugin: 'com.google.gms.google-services'
   ```

3. **Check Firebase configuration:**
   - Verify package name matches Firebase project
   - Verify SHA-1 fingerprint is registered

---

### Android 13+ notifications not showing

**Problem:** Notifications don't show on Android 13+.

**Solution:**

Android 13+ requires runtime permission for notifications:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

if (Platform.OS === 'android' && Platform.Version >= 33) {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  console.log('Notification permission:', granted);
}
```

---

## Runtime Issues

### SDK not initialized error

**Problem:** `SDKError: NOT_CONFIGURED - SDK not initialized`

**Solution:**

Call `PushPlatform.initialize()` before using any other SDK methods:

```typescript
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  environment: 'production',
});

// Now you can use other methods
const installationId = await PushPlatform.getInstallationId();
```

---

### Network error during initialization

**Problem:** `NETWORK_ERROR` during SDK initialization.

**Solution:**

1. **Check API key:** Verify your API key is correct
2. **Check network connectivity:** Ensure device has internet access
3. **Check baseURL:** If using custom baseURL, verify it's correct
4. **Check firewall:** Ensure API endpoint is not blocked

---

### Promise never resolves

**Problem:** SDK methods hang indefinitely.

**Solution:**

1. **Check native bridge connection:**
   - Restart Metro bundler
   - Rebuild native app

2. **Enable debug mode:**
   ```typescript
   await PushPlatform.initialize({
     // ...
     debugMode: true,
   });
   ```

3. **Check native logs:**
   - iOS: Xcode console
   - Android: `adb logcat`

---

## Notification Issues

### Notifications received but onNotificationReceived not firing

**Problem:** Native notifications arrive but JavaScript callback doesn't fire.

**Solution:**

1. **Ensure listener is registered before notification arrives:**
   ```typescript
   useEffect(() => {
     const subscription = PushPlatform.onNotificationReceived(handler);
     return () => subscription.remove();
   }, []);
   ```

2. **Check event emitter is active:**
   - Don't call `subscription.remove()` prematurely
   - Ensure component is mounted when notification arrives

---

### Notifications not showing in foreground

**Problem:** Notifications don't display when app is in foreground.

**Solution:**

This is expected behavior. Use `onNotificationReceived` to handle foreground notifications:

```typescript
PushPlatform.onNotificationReceived((context) => {
  if (context.foreground) {
    // Show custom in-app notification UI
    showInAppNotification(context.notification);
  }
});
```

---

### Deep links not working

**Problem:** Notification deep links don't navigate to correct screen.

**Solution:**

1. **Parse notification data:**
   ```typescript
   PushPlatform.onNotificationOpened((context) => {
     const deeplink = context.notification.data?.deeplink;
     if (deeplink) {
       navigation.navigate(deeplink);
     }
   });
   ```

2. **Ensure navigation is ready:**
   - Wait for navigation container to be mounted
   - Use `navigationRef` if navigating outside components

---

### Duplicate notifications

**Problem:** Same notification appears multiple times.

**Solution:**

Event deduplication is handled automatically by native SDKs using `event_id` and `call_id` fields. If you're still seeing duplicates:

1. **Ensure notifications include event_id:**
   ```json
   {
     "notification": {
       "title": "Hello",
       "body": "World"
     },
     "data": {
       "event_id": "unique-id-here"
     }
   }
   ```

2. **Check for multiple event listeners:**
   - Ensure you're not registering the same listener multiple times
   - Use `useEffect` cleanup to remove old listeners

---

## Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
await PushPlatform.initialize({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
  environment: 'development',
  debugMode: true, // Enable verbose logging
});
```

**View logs:**

- **iOS:** Xcode → Console
- **Android:** `adb logcat | grep PushPlatform`
- **React Native:** Metro bundler console

---

## Getting Help

If you're still experiencing issues:

1. Check [API Reference](API.md) for correct usage
2. Review [Quick Start Guide](QUICK_START.md) for setup steps
3. Search [GitHub Issues](https://github.com/pushplatform/react-native/issues)
4. File a new issue with:
   - SDK version
   - React Native version
   - Platform (iOS/Android) and version
   - Code snippet reproducing the issue
   - Debug logs

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `NOT_CONFIGURED` | SDK not initialized | Call `initialize()` first |
| `INVALID_CONFIG` | Invalid configuration | Check config parameters |
| `NETWORK_ERROR` | Network request failed | Check connectivity and API key |
| `API_ERROR` | API returned error | Check API response in logs |
| `INVALID_TOKEN` | Token format invalid | Contact support |
| `MAX_RETRIES_EXCEEDED` | Too many failed attempts | Check network and API status |
| `STORAGE_ERROR` | Storage access failed | Check device storage permissions |
| `KEYCHAIN_ACCESS_DENIED` | Keychain access denied (iOS) | Check device security settings |
