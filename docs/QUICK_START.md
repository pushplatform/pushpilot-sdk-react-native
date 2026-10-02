# Quick Start

Use the installation and native dependency steps in the [repository README](../README.md). The RN package is installed from GitHub; the iOS and Android SDKs are resolved from their separate repositories.

After installing both native SDKs and completing platform setup, initialize the SDK once during app startup:

```tsx
import PushPlatform from '@pushplatform/react-native';

export async function startPushPlatform() {
  const registration = PushPlatform.onRegistrationUpdated(() => {
    console.info('APNs/FCM token registration updated');
  });

  await PushPlatform.initialize({
    apiKey: 'YOUR_API_KEY',
    applicationId: '00000000-0000-4000-8000-000000000000',
    apiBaseURL: 'https://api.your-domain.example',
    environment: 'production',
    debugMode: __DEV__,
  });

  const installationId = await PushPlatform.getInstallationId();
  const permissionGranted = await PushPlatform.requestPermissions();

  return { installationId, permissionGranted, registration };
}
```

`applicationId` is the application UUID from PushPlatform, not the iOS bundle identifier or Android application ID. `initialize()` registers the installation with `pushpilot-server`. The native SDK registers APNs/FCM tokens when the operating system provides them; token values stay native and are not exposed to JavaScript.

On iOS, enable Push Notifications and forward the app delegate's APNs registration callbacks as shown in the README. On Android, configure Firebase Messaging and its `google-services.json` for the app.

See the [API reference](API.md) and [troubleshooting guide](TROUBLESHOOTING.md) for details.
