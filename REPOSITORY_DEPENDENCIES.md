# Dependencies between repositories

`pushpilot-sdk-react-native` exposes the TypeScript API and bridges to the two standalone native SDKs:

- iOS: `pushpilot-sdk-ios`, pinned in `release/native-lock.json`; its Pod and Swift sources are bundled in the prepared npm tarball under `native/ios`.
- Android: `pushpilot-sdk-android`, pinned in the same lock; its AAR and Maven metadata are bundled under `native/android/maven`, resolving `com.pushplatform:sdk-android:1.0.0` without Maven Local.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration using `apiKey`, `applicationId`, and `apiBaseURL`.

Private repository access is required only for release preparation. See [installation](docs/INSTALLATION.md) and [release preparation](docs/RELEASING.md). npm publication is pending.
