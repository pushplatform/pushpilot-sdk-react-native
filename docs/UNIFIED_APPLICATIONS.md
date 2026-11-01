# Unified application SDK release

Version: 1.1.0. One application ID/key across SDKs and server. The key is deliberately extractable and grants device registration/read access and message sending/history only for that application; no organization/platform/billing administration.

No project/environment selection is needed. Optional legacy environment arguments remain compatible. APNs sandbox/production follows the build entitlement and is a transport property. Native SDK metadata includes real model/versions/locale/timezone/permission/device kind; Web reports unknown hardware kind. Test subscription is a separate console flag.

Validation on 2026-11-01: Android 170 tests and release Maven staging; iOS metadata tests plus 21 affected API/token integration tests on Simulator; RN 98 JS tests, Expo plugin tests, packed-distribution Maven/Pod probes and actual Android/iOS consumer builds; Flutter 74 tests and actual Android/iOS consumer builds. Web 91 unit tests, 11 browser scenarios headless and the actual notification display scenario in a visible macOS browser (headless macOS resolves showNotification without retaining a visible notification). The actual built Web SDK also registered through the unified real API and origin policy in console acceptance.

Console acceptance uses a disposable postgres database and real queue/worker with guarded mock transports. Same key registers iOS/Android/Web; two native devices share an External ID, metadata/tags/test-marker persist; composer creates one message/two accepted mock deliveries. No real push, credentials exchange with Apple/Firebase, or charging occurred. Real device/provider delivery still requires the customer's actual APNs/Firebase/Web credentials, OS permission and signed builds.

## Publication verified on 2026-11-01

RN 1.1.0 is published to npm; `latest` points to 1.1.0. The public tarball was downloaded anonymously and is byte-for-byte identical to the previously validated 70-file candidate. SHA-256: `61a796c37a72d67c1045da94ac6f2830fb8f96f1c80acb9b454605afc6e5dc80`. Registry SHA-1/SHA-512 integrity also matches. Release source tag `v1.1.0` points to merged main `ef93dc72787c6fe1bcf5109c14455cda22e5d49e`. Publication used the existing candidate with `--ignore-scripts` after npm browser confirmation; no tests/native builds were repeated. The duplicate workflow run 41302802599 was cancelled before its publish job. Debug mode permits local Android emulator HTTP addresses; release URL validation remains strict. The 42 affected validation tests pass in addition to the earlier full suite/builds. [PR #9](https://github.com/pushplatform/pushpilot-sdk-react-native/pull/9).


## Bare iOS dependency correction, 2026-11-01

The earlier iOS consumer used an explicit bundled native Pod path and did not exercise the normal transitive CocoaPods dependency. A user correctly found that RN 1.1.0 could not resolve PushPlatformSDK 1.1.0 because only 1.0.0 was published in Trunk. The native 1.1.0 podspec was submitted from the unchanged v1.1.0 tag after normal CocoaPods build validation. A Trunk HTTP 409/500 did not remove the accepted spec: public Specs commit 9ad0dfc27d72d23843c49dee367e4125b4b4ec6b and the spec CDN endpoint expose that exact version. CDN version-index propagation must be checked separately before claiming installation is fixed.

New release checks reject an absent index entry even when a podspec file exists, validate public source/version/tag, and run normal bare autolinking on macOS. The demo and bare instructions no longer add a local SDK path. Actual clean-consumer acceptance is recorded after the public index becomes visible.
