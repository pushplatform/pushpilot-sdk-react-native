# React Native SDK Compatibility Matrix

## Supported Versions

| Platform | Minimum Version | Architecture | Status |
|----------|----------------|--------------|--------|
| React Native | 0.77.0 | New Architecture (TurboModules) | ✅ Supported |
| React Native | 0.87.1+ | New Architecture (TurboModules) | ✅ Supported |
| iOS | 13.0 | - | ✅ Supported |
| Android | API 26 (8.0) | - | ✅ Supported |

## Unsupported Versions

| Platform | Version | Reason |
|----------|---------|--------|
| React Native | ≤ 0.75.x | Legacy Architecture only |
| React Native | 0.68.x - 0.75.x | Legacy Bridge mode |
| React Native | New Architecture disabled | Old Bridge incompatible |

## Architecture Requirements

**Required:**
- ✅ New Architecture enabled
- ✅ TurboModules
- ✅ Bridgeless mode (RN 0.77+)

**Not Supported:**
- ❌ Legacy Architecture
- ❌ Old Bridge
- ❌ Interop layer

## Tested Configurations

### React Native 0.77.x

| OS | Version | Architecture | Test Status |
|-----|---------|--------------|-------------|
| iOS | 17.5 | New Arch | ⏳ Pending |
| Android | 14 | New Arch | ⏳ Pending |

### React Native 0.87.1

| OS | Version | Architecture | Test Status |
|-----|---------|--------------|-------------|
| iOS | 17.5 | New Arch | ⏳ Pending |
| Android | 14 | New Arch | ⏳ Pending |

## Migration from Older Versions

If you're using React Native < 0.77:

1. **Upgrade to React Native 0.77+**
2. **Enable New Architecture** in your project
3. **Install PushPlatform React Native SDK**

There is no migration path for Legacy Architecture - New Architecture is required.

## Native SDK Dependencies

### iOS
- PushPlatformSDK 1.0.0+
- CocoaPods dependency from the separate `pushpilot-sdk-ios` GitHub repository

### Android  
- PushPlatform Android SDK 1.0.0+
- Gradle composite build from the separate `pushpilot-sdk-android` GitHub repository
- The Maven artifact is not published yet; use the composite-build substitution in the README

## Known Limitations

1. **Legacy Architecture**: Intentionally not supported
2. **RN < 0.77**: No compatibility layer planned
3. **Android Maven**: Not yet published to a Maven registry; the GitHub source checkout is required.

## Support Policy

- ✅ **Supported**: Active development, bug fixes, updates
- ⏳ **Pending**: Testing in progress
- ❌ **Unsupported**: No support, may not work

Last updated: 2026-09-19
