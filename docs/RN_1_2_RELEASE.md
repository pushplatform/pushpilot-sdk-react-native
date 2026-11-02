# RN 1.2.0 source release

Requested contract: retain the installation scheme of 1.0.3 and the current SDK code. Normal npm installation and React Native autolinking resolve PushPlatformSDK through public CocoaPods. No XCFramework, runtime rollback, patch-package, node_modules edit, custom Podfile native SDK entry, HTTP protocol override or source-repository fallback is introduced.

The wrapper version is 1.2.0. Native Android/iOS remain 1.1.0, pinned to the same source commits and checked payload hashes as the unified application release. Unified application keys, optional legacy environment, automatic APNs transport, FCM startup registration and device metadata are retained. Published 1.1.0 is immutable; the new version is a normal source release.

The original omission of native CocoaPods 1.1.0 and the subsequent CDN propagation problem were separate from the later HTTP/2 download error. At this investigation, old and new public podspecs both returned HTTP 200 over HTTP/2, and the actual CocoaPods resolver returned native 1.1.0. A successful request at one moment is not proof that a CDN transport failure cannot recur. This release does not claim to change third-party CDN transport.

Source corrections: the wrapper podspec references the real vVERSION source tag and no longer defines a global Ruby constant when CocoaPods evaluates it repeatedly. The public native dependency and all new SDK runtime code remain unchanged.

## Acceptance

- [x] Compare 1.0.3/1.1.0/current installation contracts and native pins.
- [x] Build/package the candidate; native checksums, sources and package entries verified.
- [ ] Current repository test app in an independent temporary copy. No second application's lockfile, Firebase flag, Vision Camera or Nitro pin.
- [ ] Normal pod install and native build in that copy, without a native SDK override.
- [ ] Upgrade and reinstall on that same current app, then native build.
- [ ] Static-framework profile installation and native build.
- [ ] CI on the final source and exact release archive.
- [ ] Publication and anonymous public archive verification; no new source changes hidden after candidate acceptance.

CI installs and builds the current test app with default and static linkage. The release workflow requires that same app to pass before its publish job can run. Public source metadata alone does not constitute installation/build acceptance.

No real push, app launch against a production account, changes to the original TOP files, database changes, or owner-console changes are part of this release.
