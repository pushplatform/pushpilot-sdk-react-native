# Dependencies between repositories

`@pushplatform/react-native` 2.0.1 exposes the TypeScript API and bridges to the published native SDKs pinned in `release/native-lock.json`:

- iOS: `PushPlatformSDK` 2.0.1. Autolinking depends on PushPlatformSDK 2.0.1; resolve it from the public git tag (or bundled native/ios path) while CocoaPods Trunk omits new specs. The Expo plugin also ships those sources under `native/ios`.
- Android: `com.pushplatform:sdk-android:2.0.1`. The AAR and Maven metadata are shipped under `native/android/maven`. Maven Local is not required.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration with an application id. A secret key is not required. With no URL the server is https://api.pushpilot.ru.

Private repository access is required only while preparing a release tarball. Installation from npm does not need it. See [installation](docs/INSTALLATION.md).
