# Quick Start

Install `@pushplatform/react-native`:

```sh
npm install https://github.com/pushplatform/pushpilot-sdk-react-native/releases/download/v2.0.5/pushplatform-react-native-2.0.5.tgz
```


Complete the platform setup in [INSTALLATION.md](INSTALLATION.md):

- **Expo:** install `expo-dev-client`, add `@pushplatform/react-native` to the Expo plugins with the PushPilot application UUID, APNs environment and Firebase config, then run `npx expo prebuild` and `npx expo run:android` / `npx expo run:ios`. Use a development build. Expo Go does not include this native bridge.
- **Bare React Native:** autolinking connects the bridge and native dependencies. Add the bundled Maven repository on Android, then run `pod install` on iOS. Add a separate NSE target only when needed.

Initialize once during app startup. Notification listeners may be registered before initialization; early native events are queued for the corresponding JS listener. Await initialization before accessing installation state:

```tsx
import PushPlatform from '@pushplatform/react-native';

export async function startPushPlatform() {
  const registration = PushPlatform.onRegistrationUpdated(() => {
    console.info('APNs/FCM token registration updated');
  });

  await PushPlatform.initialize('YOUR_APPLICATION_UUID');

  const opened = PushPlatform.onNotificationOpened((context) => {
    console.info('Opened', context.notification.id);
  });

  const installationId = await PushPlatform.getInstallationId();
  const permissionGranted = await PushPlatform.requestPermissions();

  return { installationId, permissionGranted, registration, opened };
}
```

`applicationId` is the PushPilot application UUID, not the iOS bundle identifier or Android application id. No secret key is sent. The SDK uses the standard PushPilot server.  The native SDK registers APNs/FCM tokens when the operating system provides them; `getDeviceToken()` exposes the ordinary device token after initialization.

On Android, use the application's real `google-services.json`. On iOS, use the APNs environment and signing profile for the build.

See the [API reference](API.md) and [troubleshooting guide](TROUBLESHOOTING.md) for details.
