# React Native 1.3.0

`@pushplatform/react-native` 1.3.0 is the release that installs with an application id and native SDK 1.2.0.

- `initialize` takes an application id string or `{ applicationId, url, environment }`. It does not send a secret key.
- Android dependency: `com.pushplatform:sdk-android:1.2.0` (commit `46c76cf`), bundled in the npm tarball.
- iOS autolinking dependency: public CocoaPods `PushPlatformSDK` 1.2.0 (tag `v1.2.0`, commit `c7f497f`). The same sources are bundled for the Expo plugin.
- Version 1.2.0 of this package was not published to npm. The npm `latest` tag stayed on 1.1.0 until 1.3.0.
- Installation checks use the repository test app and its current React Native. They are not pinned to another application's Firebase, Vision Camera or Nitro versions.

## Acceptance

- [x] Native lock matches published Android 1.2.0 and iOS 1.2.0.
- [x] Package Android dependency is `com.pushplatform:sdk-android:1.2.0`.
- [x] CocoaPods index lists `PushPlatformSDK` 1.2.0.
- [x] GitHub Actions built the repository test app with default and static linkage.
- [ ] npm `latest` for `@pushplatform/react-native` is 1.3.0 after publication.
