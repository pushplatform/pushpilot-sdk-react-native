# Dependencies between repositories

`pushpilot-sdk-react-native` wraps the native SDKs:

- iOS: `pushpilot-sdk-ios` via CocoaPods or Swift Package Manager.
- Android: `pushpilot-sdk-android` as the Gradle dependency.

It also calls the API exposed by `pushpilot-server` through the native SDK configuration.
