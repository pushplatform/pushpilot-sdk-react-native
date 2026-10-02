# Dependencies between repositories

`pushpilot-sdk-react-native` exposes the TypeScript API and bridges to the two standalone native SDKs:

- iOS: `pushpilot-sdk-ios`, declared as the `PushPlatformSDK` CocoaPods dependency.
- Android: `pushpilot-sdk-android`, included as a Gradle composite build and substituted for `com.pushplatform:sdk-android:1.0.0`. The Maven artifact has not been published.
- Both native SDKs call `pushpilot-server` for installation, token, and user registration using `apiKey`, `applicationId`, and `apiBaseURL`.

The installation instructions and exact Gradle/CocoaPods snippets are in [README.md](README.md).
