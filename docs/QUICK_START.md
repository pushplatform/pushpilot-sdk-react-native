# Quick Start

Install the prepared release tarball in your application (npm publication is still pending):

```sh
npm install /absolute/path/to/pushplatform-react-native-1.0.0.tgz
```

Use the tarball from the `rn-sdk-candidate` release artifact. The old tarball in the SDK repository root does not contain the bundled native payload. After npm publication, install with `npm install @pushplatform/react-native` instead.

The package includes both native SDKs: the Android Maven repository is in `native/android/maven`, and the iOS Pod sources are in `native/ios`. Application developers do not need private Git access or a manual Maven Local publication. Public React Native, AndroidX and Firebase dependencies still require their usual registry access.

Complete the platform setup in [INSTALLATION.md](INSTALLATION.md):

- **Expo SDK 54:** install `expo-dev-client`, add `@pushplatform/react-native` to the Expo plugins with your application UUID, APNs environment and Firebase config, then run `npx expo prebuild` and `npx expo run:android` / `npx expo run:ios`. The plugin configures the bundled native dependencies and iOS callbacks. Use a development build; Expo Go does not include this native bridge. For EAS before npm publication, include the tarball in the application upload as described in the installation guide.
- **Bare React Native:** autolinking connects the RN bridge; add the bundled Maven repository to the Android repositories and the local `PushPlatformSDK` Pod to the iOS application target, then run `pod install`. Configure Firebase and iOS capabilities/callbacks using the installation guide.

Initialize the SDK once during app startup:

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

Use the API key and application UUID from PushPlatform. On Android, use your application's real `google-services.json`; on iOS, use the appropriate APNs environment and signing profile for the build.

See the [API reference](API.md) and [troubleshooting guide](TROUBLESHOOTING.md) for details.
