# PushPilot React Native SDK

PushPilot подключает push-уведомления к приложениям React Native на iOS и Android:
регистрирует установку и токен устройства, запрашивает разрешения и передаёт
события получения и открытия уведомлений. В пакет входят native SDK и Expo plugin.

## Установка

```sh
npm install @pushplatform/react-native@1.1.0
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
  const registration = PushPilot.onRegistrationUpdated(() => {
    console.info('Регистрация push-токена обновлена');
  });
  const opened = PushPilot.onNotificationOpened(notification => {
    // Откройте нужный экран через навигацию вашего приложения.
    console.info('Открыто уведомление', notification.id);
  });

  try {
    await PushPilot.initialize({
      apiBaseURL: 'https://api.example.com',
      apiKey: 'APPLICATION_KEY',
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

`apiBaseURL` — адрес API PushPilot. `applicationId` и `APPLICATION_KEY` скопируйте из одного приложения в консоли. iOS, Android, Web и сервер используют один ключ. Ключ извлекаем из приложения и даёт право отправки только в этом приложении; владельца и платёжные настройки он не администрирует. Приватные APNs/FCM/VAPID credentials остаются на сервере. Отдельный клиентский шлюз не нужен.

`getInstallationId()` возвращает ID установки. Native SDK регистрирует полученный
от APNs или FCM токен в API; `onRegistrationUpdated` сообщает об обновлении.
`onNotificationReceived` передаёт событие получения, а `onNotificationOpened` —
открытия уведомления. Удаляйте listeners, когда они больше не нужны.

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

### Android FCM в 1.0.2

В пакет включён Android SDK 1.0.1. `initialize()` запускает получение текущего токена Firebase и его регистрацию после создания установки. Ранний `onNewToken` больше не теряется; используются environment и package name приложения. `onRegistrationUpdated` сообщает подтверждённый backend результат; сам токен в JavaScript не передаётся. Ручной вызов API регистрации токена не нужен. После обновления переустановите зависимости и пересоберите native приложение / Expo development build. iOS SDK не изменён.


### Unified applications · 1.1.0

One PushPilot application contains iOS, Android and Web providers. Use the same application ID and permanent application key in SDKs and server code. The key is extractable from the client and allows sending only in that application; it cannot administer the organization or billing. Rotate/revoke it in the console.
Omit `environment` during initialization. iOS derives APNs transport from the simulator/build entitlement; Android uses the unified registration scope. The optional legacy argument remains compatible.
Native SDKs report actual model, OS/SDK/app version, language, time zone, permission and physical/simulator/emulator kind (unknown where unavailable). Test subscription is an independent console marker. Metadata refreshes on foreground and permission changes.
