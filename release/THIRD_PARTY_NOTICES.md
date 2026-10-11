# Third-party dependencies and notices

The MIT license in `android/LICENSE` and `ios/LICENSE` applies to Push Platform's
own native SDK code. It does not replace licenses of third-party dependencies.

The Android SDK AAR contains Push Platform classes. Its external dependencies
are resolved by Gradle using the original POM and Gradle module metadata.
They are not merged, shaded, or repackaged into the npm tarball. Their original
artifacts retain their own LICENSE, NOTICE, copyright and attribution files.
The AAR and sources JAR are copied byte for byte; embedded notices are preserved.

Direct Android native runtime dependencies for the pinned SDK:

| Dependency | Version / management | License / upstream source |
| --- | --- | --- |
| Kotlin standard library | 1.9.24 | Apache-2.0, [JetBrains Kotlin license](https://github.com/JetBrains/kotlin/blob/master/license/LICENSE.txt) |
| AndroidX Core KTX | 1.12.0 | Apache-2.0, [AndroidX license](https://github.com/androidx/androidx/blob/androidx-main/LICENSE.txt) |
| AndroidX Security Crypto | 1.1.0-alpha06 | Apache-2.0, [AndroidX license](https://github.com/androidx/androidx/blob/androidx-main/LICENSE.txt) |
| OkHttp | 4.12.0 | Apache-2.0, [Square OkHttp license](https://github.com/square/okhttp/blob/master/LICENSE.txt) |
| Firebase Messaging KTX | Firebase BOM 32.7.0 | Apache-2.0, [Firebase Android SDK license](https://github.com/firebase/firebase-android-sdk/blob/master/LICENSE) |

A copy of the Apache-2.0 license is included in `licenses/Apache-2.0.txt`.
Transitive dependencies remain separately licensed by their original authors;
the application's resolved Gradle graph determines their final versions.
This inventory describes direct native dependencies, not all application dependencies.

The iOS SDK has no external package dependencies. Foundation, UIKit,
UserNotifications, PushKit and CallKit are supplied by the Apple operating
system; their code is not included in this tarball.

React Native and React are host peer dependencies, and Expo config plugins
are supplied by the Expo application. They retain their upstream licenses
in the installed packages and are not bundled into the SDK archive.

Any tracked LICENSE / NOTICE files in the pinned native source repositories
are also preserved under each platform's `upstream-notices/` directory.
Source headers are copied unchanged. Updating the native lock requires
reviewing this inventory against the new native dependency metadata.
