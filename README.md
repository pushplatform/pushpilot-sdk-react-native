# PushPilot React Native SDK

PushPilot подключает push-уведомления к приложениям React Native на iOS и Android:
регистрирует установку и токен устройства, запрашивает разрешения и передаёт
события получения и открытия уведомлений. В пакет входят native SDK и Expo plugin.

## Установка

```sh
npm install @pushplatform/react-native@next
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
      apiBaseURL: 'https://api.example.com/mobile-pushpilot',
      apiKey: 'YOUR_MOBILE_GATEWAY_CREDENTIAL',
      applicationId: 'YOUR_APPLICATION_UUID',
      environment: 'production',
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

`apiBaseURL` и credential должны соответствовать настройке клиентского шлюза
вашего сервера. Шлюз принимает маршруты Device Registry native SDK, проверяет
сессию и владение installation и хранит проектный ключ на сервере.
SDK не создаёт этот шлюз; настройте его перед использованием примера.

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
  Не встраивайте проектный `devices:write` key или ключи отправки/администрирования;
  используйте клиентский шлюз с ограничением операций своей установкой.
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
