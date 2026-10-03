# Expo support state

Дата состояния: 2026-10-03.

Поддерживаемая связка для примера: Expo SDK 54.0.0, React Native 0.81.4, React 19.1.0, development build через `expo-dev-client`. Общий RN SDK поддерживает React Native 0.77+ и New Architecture; Expo Go не поддерживается, потому что PushPilot содержит native bridge и native APNs/FCM SDK.

Официальная документация Expo, использованная при реализации:

- [Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Plugin development for libraries](https://docs.expo.dev/config-plugins/development-for-libraries/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)

## Что делает plugin

`app.plugin.js` экспортирует `withPushPlatform` через стандартную точку входа пакета. Во время prebuild он:

- добавляет `POST_NOTIFICATIONS` и PushPilot application metadata в Android Manifest;
- подключает composite build приватного `pushpilot-sdk-android` и substitution `com.pushplatform:sdk-android:1.0.0`;
- при `android.googleServicesFile` добавляет Google Services Gradle plugin и оставляет путь к конфигу в Expo config;
- добавляет `aps-environment`, `remote-notification`, application UUID и Pod `PushPlatformSDK` из приватного `pushpilot-sdk-ios`;
- прокидывает APNs token, foreground notification и notification response через стандартный Swift AppDelegate;
- проверяет параметры и использует маркеры/проверки для идемпотентного повторного prebuild.

`applicationId` можно также задавать динамически из `app.config.ts`; plugin не записывает API key в native project.

Native SDK coordinates не выдуманы: iOS — `PushPlatformSDK` 1.0.0 из Git repository, Android — source checkout с Gradle project `:sdk`, публикуемый coordinate пока отсутствует.

## Проверки

План команд:

```sh
npm ci
npm run typecheck
npm test -- --runInBand
npm run test:plugin
npm pack
```

Для внешней проверки пакета:

```sh
TMP=/tmp/pushpilot-expo-check
rm -rf "$TMP"
mkdir -p "$TMP"
cd "$TMP"
npx create-expo-app@latest app --template blank-typescript
cd app
npm install /absolute/path/to/pushpilot-sdk-react-native/*.tgz
npx expo prebuild
npx expo prebuild
```

Проверить нужно `android/app/src/main/AndroidManifest.xml`, `android/settings.gradle`, `android/build.gradle`, `android/app/build.gradle`, `ios/Podfile`, `ios/*/*.entitlements`, `ios/*/AppDelegate.swift` и отсутствие повторных Pod/Gradle/Manifest записей. Реальные APNs/FCM push, платные EAS jobs, публикация npm и deploy не выполняются.

Фактический результат этого состояния: `npm run typecheck`, `npm run build`, 4 RN Jest suites (96 tests с `--watchman=false` и отключенной только диагностикой ts-jest), plugin tests (2/2), npm pack и полный plugin harness прошли. `create-expo-app`/Expo prebuild вне SDK не запустились: DNS до `registry.npmjs.org` недоступен. Android Gradle SDK test заблокирован отсутствующим `com.facebook.react:react-native:+` и не подключённым Maven/composite host; TestApp Gradle также не имеет установленного `node_modules/@react-native/gradle-plugin`. Xcode `-showBuildSettings` прошёл, Swift Package test заблокирован отсутствующим модулем React; это не проверка Expo prebuild.

## Ограничения

- Для iOS нужен Apple Developer provisioning и реальный device для APNs; для Android нужен Firebase project и настоящий `google-services.json`.
- Background/silent push зависит от ОС, payload, power policy и состояния процесса. Prebuild или native build не проверяют доставку.
- Expo plugin не обещает VoIP/PushKit/CallKit; это отдельная нативная интеграция.
- При недоступной сети npm registry, Expo CLI или приватных native repositories соответствующая проверка блокируется и должна быть отмечена отдельно, без подмены результата локальным mock.
