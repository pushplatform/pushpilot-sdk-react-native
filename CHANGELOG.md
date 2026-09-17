# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-17

### Added

- Initial release of Push Platform React Native SDK
- TypeScript-first API with strict type safety (no `any` types)
- iOS native bridge wrapping `PushPlatformSDK` (Swift)
- Android native bridge wrapping `sdk-android` (Kotlin)
- Core SDK methods:
  - `initialize()` — SDK initialization with environment selection
  - `getInstallationId()` — Retrieve unique installation ID
  - `login()` — Associate installation with user ID
  - `logout()` — Dissociate user from installation
- Event emitters:
  - `onNotificationReceived()` — Notification received (foreground/background)
  - `onNotificationOpened()` — Notification opened by user
  - `onRegistrationUpdated()` — Token registration status updates
- Native push notification support:
  - Normal push notifications
  - Silent/data-only push notifications
  - VoIP/call push notifications (iOS only, handled natively in Swift)
- Automatic event deduplication via `event_id` and `call_id`
- Security features:
  - No token values exposed to JavaScript layer
  - All token registration handled by native SDKs
  - VoIP/CallKit logic remains entirely in Swift (iOS)
- Platform support:
  - React Native 0.68.0+
  - iOS 13.0+
  - Android 8.0+ (API level 26+)
- Autolinking support:
  - iOS via CocoaPods
  - Android via Gradle
- Complete documentation:
  - Quick Start Guide
  - API Reference
  - Troubleshooting Guide
  - Universal Migration Guide (works with any legacy push provider)
- TypeScript type definitions for all public APIs

### Architecture

- Zero business logic duplication — all push notification logic remains in native SDKs
- JavaScript bridge provides only event forwarding and API exposure
- Native SDKs handle retry logic, token management, and deduplication
- Event-driven architecture with type-safe event emitters

### Security

- ADR-0014 compliant architecture
- No sensitive data (tokens, credentials) exposed to JavaScript
- Secure token storage handled by native SDKs (iOS Keychain, Android EncryptedSharedPreferences)
- VoIP/CallKit operations remain in native Swift layer

[1.0.0]: https://github.com/pushplatform/react-native/releases/tag/v1.0.0
