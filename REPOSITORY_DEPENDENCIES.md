# Dependencies between repositories

`@pushplatform/react-native` 1.3.8 exposes the TypeScript API and bridges to the published native SDKs pinned in `release/native-lock.json`:

- Android: `com.pushplatform:sdk-android:[2.0.0,3.0)`. The AAR and Maven metadata are shipped under `native/android/maven`. Maven Local is not required.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration with an application id. A secret key is not required. The server is https://api.pushpilot.ru.

Private repository access is required only while preparing a release tarball. Installation from npm does not need it. See [installation](docs/INSTALLATION.md).
