# PushPilot React Native SDK

PushPilot подключает push-уведомления к приложениям React Native на iOS и Android:
регистрирует установку и токен устройства, запрашивает разрешения и передаёт
события получения и открытия уведомлений. В пакет входят native SDK и Expo plugin.

## Установка

```sh
npm install @pushplatform/react-native@1.3.5
```

Для Expo используйте development build или EAS build. Expo Go не содержит
необходимые native модули.

```sh
npx expo install expo-dev-client
```

## Настройка Expo

В `app.json` укажите UUID приложения PushPilot и Firebase config:

```json
{
  "expo": {
    "ios": { "bundleIdentifier": "com.example.app" },
    "android": { "package": "com.example.app" },
    "plugins": [["@pushplatform/react-native", {
      "applicationId": "YOUR_APPLICATION_UUID",
      "ios": { "apsEnvironment": "development" },
      "android": { "googleServicesFile": "./google-services.json" }
    }]]
  }
}
```

`applicationId` — UUID приложения PushPilot, а не bundle ID или Android package
name. `google-services.json` должен соответствовать вашему Android-приложению.
Для iOS настройте Push Notifications capability и provisioning с соответствующим
APNs environment; для production используйте `apsEnvironment: "production"`.

```sh
npx expo prebuild
npx expo run:android
npx expo run:ios
```

Plugin подключает native SDK из установленного npm-пакета, разрешения уведомлений
и callbacks стандартного Swift AppDelegate. Для EAS настройте профиль build и app
credentials. [Установка Expo и bare React Native](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/docs/INSTALLATION.md).

## Минимальный пример

Вызывайте `initializePushPilot()` один раз при запуске приложения. Запрос
разрешения привяжите к кнопке интерфейса:

```tsx
import PushPilot from '@pushplatform/react-native';

export async function initializePushPilot() {
  const registration = PushPilot.onRegistrationUpdated((update) => {
    console.info('Регистрация push-токена обновлена', update.token);
  });
  const opened = PushPilot.onNotificationOpened(notification => {
    // Откройте нужный экран через навигацию вашего приложения.
    console.info('Открыто уведомление', notification.id);
  });

  try {
    await PushPilot.initialize({
      url: 'https://api.example.com',
      applicationId: 'YOUR_APPLICATION_UUID',
      debugMode: __DEV__,
    });
  } catch (error) {
    registration.remove();
    opened.remove();
    throw error;
  }

  return () => {
    registration.remove();
    opened.remove();
  };
}

// Используйте в onPress вашей кнопки; обработайте ошибку в интерфейсе приложения.
export function requestPushPermission() {
  return PushPilot.requestPermissions();
}
```

`url` — адрес API PushPilot. `applicationId` — UUID приложения. `apiKey` не отправляется. Приватные APNs/FCM/VAPID credentials остаются на сервере.

`getInstallationId()` возвращает ID установки. `getDeviceToken()` возвращает последний APNs или FCM токен. При успешной регистрации `onRegistrationUpdated` содержит `token`. `onNotificationReceived` — доставка, `onNotificationOpened` — клик, `onNotificationWillDisplay` — показ в foreground. `preventDefault()` до возврата обработчика скрывает баннер, звук и бейдж. Удаляйте listeners, когда они больше не нужны.

## Поддержка и ограничения

- React Native 0.77+ с New Architecture, React 18+, iOS 13+, Android API 26+,
  CocoaPods и Node.js 18+. Для Expo используйте SDK 54 / React Native 0.81.4.
- Для Android нужен Firebase config приложения, для iOS — signing и APNs
  credentials. APNs private key и серверные ключи провайдеров хранятся на сервере.
- Любая credential внутри мобильного приложения доступна при анализе приложения.
  Общий ключ приложения намеренно разрешает регистрацию и отправку в одном приложении. Не встраивайте платформенные административные credentials или секреты APNs/FCM.
- Запрос разрешения и регистрация токена не подтверждают доставку уведомления.
  Показ и background/silent поведение зависят от ОС, payload, Doze и ограничений
  производителя устройства. JavaScript callback не является гарантией доставки.
- В существующем Objective-C AppDelegate требуется ручная передача APNs callbacks.
  VoIP/PushKit/CallKit требует отдельной native интеграции; Expo plugin её не настраивает.
- Для локального API на Android emulator используйте доступный адрес хоста,
  а не `127.0.0.1`. Development APNs и production APNs требуют соответствующего
  окружения приложения и сервера.

## Совместимость

Default import можно назвать `PushPilot`, как в примере. Именованный экспорт
`PushPlatform` и native имена `PushPlatformSDK` сохраняются в API интеграции.
RN SDK использует native Device Registry; опция `browserAuth` Web SDK здесь
не применяется.

При обновлении прежней Expo-конфигурации удалите `ios.sdkGitUrl` и `ios.sdkGitBranch`
и запустите prebuild. Plugin использует native SDK из npm-пакета.
[Миграция установки](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/docs/INSTALLATION.md#обновление-предыдущей-expo-интеграции).

## Документация

- [Установка Expo и bare React Native](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/docs/INSTALLATION.md).
- [API](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/docs/API.md).
- [Устранение проблем](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/docs/TROUBLESHOOTING.md).
- [Совместимость платформ](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/COMPATIBILITY.md).
- [Пример Expo-приложения](https://github.com/pushplatform/pushpilot-sdk-react-native/tree/main/example/expo-app).

Лицензия: [MIT](https://github.com/pushplatform/pushpilot-sdk-react-native/blob/main/LICENSE).

### Текущая поставка · 1.3.5

`initialize` принимает application id или `{applicationId, url, environment, foregroundBannerFallback}` и не требует секретного ключа. Android-зависимость — `com.pushplatform:sdk-android:1.2.5`. iOS autolinking берёт опубликованный `PushPlatformSDK` 1.2.6. В tarball также лежит копия этих же native-артефактов для Expo.

Открытие уведомления нативный SDK сообщает сам: при клике, в том числе при холодном старте, он отправляет `PUT /notifications/{id}`; до `initialize` открытие ждёт в очереди. В `onNotificationOpened` и `onNotificationWillDisplay` у уведомления есть необязательный `notificationId` — id из ответа `POST /notifications`. Экспорты пакета не изменились: только `PushPlatform`, `SDKError`, `ErrorCode` и типы.

### Unified applications · 1.1.0

One PushPilot application contains iOS, Android and Web providers. Use the same application ID and permanent application key in SDKs and server code. The key is extractable from the client and allows sending only in that application; it cannot administer the organization or billing. Rotate/revoke it in the console.
Omit `environment` during initialization. iOS derives APNs transport from the simulator/build entitlement; Android uses the unified registration scope. The optional legacy argument remains compatible.
Native SDKs report actual model, OS/SDK/app version, language, time zone, permission and physical/simulator/emulator kind (unknown where unavailable). Test subscription is an independent console marker. Metadata refreshes on foreground and permission changes.
