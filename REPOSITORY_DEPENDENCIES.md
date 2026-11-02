# Dependencies between repositories

`@pushplatform/react-native` 1.3.1 exposes the TypeScript API and bridges to the published native SDKs pinned in `release/native-lock.json`:

- iOS: `PushPlatformSDK` 1.2.2, commit `251527b`. Autolinking depends on the public CocoaPods pod. The Expo plugin also ships those sources under `native/ios`.
- Android: `com.pushplatform:sdk-android:1.2.1`, commit `f902f36`. The AAR and Maven metadata are shipped under `native/android/maven`. Maven Local is not required.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration with an application id. A secret key is not required. With no URL the server is https://api.pushpilot.ru.

Private repository access is required only while preparing a release tarball. Installation from npm does not need it. See [installation](docs/INSTALLATION.md).
