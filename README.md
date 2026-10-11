# PushPilot React Native SDK

TypeScript API and native bridges for the PushPlatform iOS and Android SDKs.

## Requirements

- React Native 0.77 or later with the New Architecture enabled
- React 18 or later
- iOS 13 or later with CocoaPods
- Android API 26 or later with Kotlin 1.9+
- Node.js 18 or later

## Установка и Expo

Поддерживаемая Expo-связка: **Expo SDK 54 / React Native 0.81.4**. Expo Go не поддерживается: используйте development build или production/EAS build.

Пакет пока не опубликован. Для установки до релиза используйте подготовленный release tarball, содержащий оба native SDK:

```sh
npm install /absolute/path/to/pushplatform-react-native-1.0.0.tgz
npx expo install expo-dev-client
```

После публикации tarball будет доступен через npm:

```sh
npm install @pushplatform/react-native
```

Приватный Git-доступ, checkout native SDK и ручная публикация в Maven Local пользователям не нужны. Android AAR, Maven POM/Gradle metadata и iOS Pod с исходниками входят в release tarball. Обычный checkout этой ветки нужно сначала подготовить по [release-инструкции](docs/RELEASING.md); старый tarball в корне репозитория не содержит native payload.

Добавьте plugin в `app.json` или `app.config.ts`:

```json
{
  "expo": {
    "plugins": [["@pushplatform/react-native", {
      "applicationId": "00000000-0000-4000-8000-000000000000",
      "ios": { "apsEnvironment": "development" },
      "android": { "googleServicesFile": "./google-services.json" }
    }]]
  }
}
```

`applicationId` — UUID приложения PushPilot, а не bundle ID/package name. Удалите прежние `ios.sdkGitUrl` и `ios.sdkGitBranch`. Plugin добавляет bundled Maven repository, локальный Pod из установленного npm пакета, notification permissions/entitlements и callbacks стандартного Swift AppDelegate. При повторном prebuild он переводит собственные старые Git/Maven Local записи на bundled SDK, сохраняет пользовательские настройки и не дублирует записи.

```sh
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Для EAS: `eas build --platform android --profile development` или `eas build --platform ios --profile development` после настройки app credentials и профиля. EAS получает native SDK из того же npm tarball. До npm-публикации включите tarball в архив приложения и задайте dependency `file:./vendor/pushplatform-react-native-1.0.0.tgz`; абсолютный локальный путь на EAS недоступен.

Android требует настоящий Firebase `google-services.json` с package name приложения. iOS требует Push Notifications capability, Apple Developer provisioning и APNs key/certificate; для реальной доставки нужен device. Эти app credentials не нужны для упаковки SDK.

Пример: [example/expo-app](example/expo-app). Подробная установка Expo и bare RN: [docs/INSTALLATION.md](docs/INSTALLATION.md). В существующем Objective-C AppDelegate callbacks APNs нужно прокинуть вручную; VoIP/PushKit/CallKit остаётся отдельной native интеграцией.

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
