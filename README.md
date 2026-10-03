# PushPilot React Native SDK

TypeScript API and native bridges for the PushPlatform iOS and Android SDKs.

## Requirements

- React Native 0.77 or later with the New Architecture enabled
- React 18 or later
- iOS 13 or later with CocoaPods
- Android API 26 or later with Kotlin 1.9+
- Node.js 18 or later
- Read access to the private PushPlatform GitHub repositories

## Expo support

Поддерживаемая Expo-связка для этой версии SDK: **Expo SDK 54.0.0 и React Native 0.81.4**. Это зафиксировано по официальной странице Expo SDK 54 и не меняет общий минимум пакета React Native `0.77+`. Expo Go не подходит: пакет содержит native iOS/Android code и требует development build или production/EAS build.

Установка из текущего репозитория (пакет пока не опубликован в npm):

```sh
npm install git+ssh://git@github.com/pushplatform/pushpilot-sdk-react-native.git#feat/expo-support
npx expo install expo-dev-client
```

Добавьте plugin в `app.json` или `app.config.ts`:

```json
{
  "expo": {
    "plugins": [["@pushplatform/react-native", {
      "applicationId": "00000000-0000-4000-8000-000000000000",
      "ios": {
        "apsEnvironment": "development",
        "sdkGitUrl": "git@github.com:pushplatform/pushpilot-sdk-ios.git",
        "sdkGitBranch": "main"
      },
      "android": {
        "sdkPath": "../pushpilot-sdk-android",
        "googleServicesFile": "./google-services.json"
      }
    }]]
  }
}
```

`applicationId` — UUID приложения PushPilot, а не bundle ID/package name. Plugin валидирует UUID, добавляет `POST_NOTIFICATIONS`, `aps-environment`, `remote-notification`, Pod для реального `PushPlatformSDK`, composite Gradle substitution для checkout Android SDK и Google Services plugin, если задан `googleServicesFile`. Повторный `npx expo prebuild` не дублирует строки и не перезаписывает существующий `aps-environment`, `PushPlatformApplicationID`, `googleServicesFile` или пользовательские native настройки.

Пример находится в [`example/expo-app`](example/expo-app). Заполните `.env` по `.env.example`, положите настоящий `google-services.json` (он не коммитится), затем:

```sh
cd example/expo-app
npm install
npx expo prebuild
npx expo run:android   # локальный development build
npx expo run:ios       # macOS + Xcode, локальный development build
```

Для EAS используйте `eas build --platform android --profile development` или `eas build --platform ios --profile development` после настройки credentials. EAS Build и локальный `expo run:*` собирают собственное native приложение; Expo Go не содержит PushPilot bridge и не может доставить APNs/FCM события.

Android требует Firebase project с FCM, package name из `android.package` и настоящий `google-services.json`. Native Android SDK подключается из приватного checkout `pushpilot-sdk-android` через `sdkPath`; Maven artifact `com.pushplatform:sdk-android:1.0.0` пока не опубликован. iOS требует доступ к приватному Git checkout `pushpilot-sdk-ios`, Push Notifications capability и APNs key/certificate, настроенные в Apple Developer/EAS credentials.

Plugin автоматически прокидывает APNs token и notification callbacks из стандартного Swift AppDelegate в native SDK. В существующем Objective-C AppDelegate эти callbacks нужно добавить вручную. Android native SDK регистрирует FCM token и передает notification events в RN bridge; token value в JavaScript не попадает.

## Install the React Native package

Install the current integration branch from GitHub:

```sh
npm install git+ssh://git@github.com/pushplatform/pushpilot-sdk-react-native.git#sdk/rn-installation
```

The package builds its TypeScript entry points during installation. React Native autolinking discovers the iOS podspec and Android Gradle module.

## Connect the native SDKs

The native SDKs are separate private repositories. They are not bundled into this package, and the Android Maven artifact is not published yet.

### iOS

Inside the application target in `ios/Podfile`, add the native SDK source. Keep the line inside the same target where React Native calls `use_native_modules!`:

```ruby
pod 'PushPlatformSDK', :git => 'git@github.com:pushplatform/pushpilot-sdk-ios.git', :branch => 'main'
```

Then install pods:

```sh
cd ios && pod install
```

Enable the Push Notifications capability and the required `aps-environment` entitlement in Xcode. Forward the APNs token callbacks from the app delegate to the native SDK:

```swift
import PushPlatformSDK

func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    PushPlatform.shared.didRegisterAPNsToken(deviceToken)
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    PushPlatform.shared.didFailToRegisterAPNs(error)
}
```

### Android

Clone the native SDK next to the React Native application directory:

```sh
git clone git@github.com:pushplatform/pushpilot-sdk-android.git ../pushpilot-sdk-android
```

In the application's `android/settings.gradle`, include its Gradle build and substitute the native SDK coordinate with its `:sdk` project. The path below assumes the clone is a sibling of the app directory:

```groovy
includeBuild('../../pushpilot-sdk-android') {
    dependencySubstitution {
        substitute(module('com.pushplatform:sdk-android')).using(project(':sdk'))
    }
}
```

Configure Firebase for the Android application: add its `google-services.json`, apply the Google Services Gradle plugin, and enable Firebase Cloud Messaging. The native SDK contributes its FCM service and runtime dependencies.

## Initialize and register an installation

Get `apiKey` and the application UUID from PushPlatform. `apiBaseURL` is the base URL of your PushPlatform server. `applicationId` must be the application's UUID; the native SDKs use it to register the installation.

```tsx
import PushPlatform from '@pushplatform/react-native';

export async function initializePushPlatform() {
  // Subscribe first so an early APNs/FCM registration event is not missed.
  const registration = PushPlatform.onRegistrationUpdated(() => {
    console.info('Push token registration updated');
  });

  await PushPlatform.initialize({
    apiKey: 'YOUR_API_KEY',
    applicationId: '00000000-0000-4000-8000-000000000000',
    apiBaseURL: 'https://api.your-domain.example',
    environment: 'production',
    debugMode: __DEV__,
  });

  const installationId = await PushPlatform.getInstallationId();
  const permissionGranted = await PushPlatform.requestPermissions();

  return { installationId, permissionGranted, registration };
}
```

`initialize()` registers the app installation with the server and resolves with its installation ID available through `getInstallationId()`. After the OS provides an APNs or FCM token, the native SDK registers that token with the server and emits `onRegistrationUpdated`. Token values are never exposed to JavaScript. `onNotificationReceived` and `onNotificationOpened` expose parsed notification metadata through the same native SDK transport. Remove listeners when they are no longer needed:

```ts
registration.remove();
```

Use `environment: 'development'` with the development server URL when testing. On an Android emulator, use the host's reachable emulator address instead of `127.0.0.1`.

Background and silent push behavior is OS-controlled. iOS background execution is best effort and requires `remote-notification` plus an appropriate APNs payload; Android data-only delivery can be delayed by Doze, OEM restrictions, or terminated-process policy. Do not treat JavaScript callbacks as a delivery guarantee. VoIP/PushKit is not promised by the Expo plugin: it requires a separate, verified native CallKit integration and entitlements.

## API and support

- [API reference](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Compatibility](COMPATIBILITY.md)
- [Expo support state and verification](docs/EXPO_SUPPORT.md)

The React Native bridge calls `pushpilot-server` through the native SDKs. It does not send or publish push notifications on its own.

## License

MIT
