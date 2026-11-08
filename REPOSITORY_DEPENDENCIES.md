# Dependencies between repositories

`@pushplatform/react-native` exposes the TypeScript API and bridges to the native SDKs pinned in `release/native-lock.json`:

- iOS: `PushPlatformSDK` is supplied transitively by the npm package. The separate Notification Service Extension target uses `PushPlatformExtension`; see [installation](docs/INSTALLATION.md).
- Android: `com.pushplatform:sdk-android`. The AAR and Maven metadata are shipped under `native/android/maven`. Maven Local is not required.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration with an application id. A secret key is not required. The server is https://api.pushpilot.ru.

Private repository access is required only while preparing a release tarball. Installation from npm does not need it. See [installation](docs/INSTALLATION.md).
