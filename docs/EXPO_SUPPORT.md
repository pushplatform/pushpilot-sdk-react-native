# Expo support state

Дата состояния: 2026-10-04.

Поддерживаемая связка для примера: Expo SDK 54.0.0, React Native 0.81.4, React 19.1.0, development build через `expo-dev-client`. Общий RN SDK поддерживает React Native 0.77+ и New Architecture; Expo Go не поддерживается, потому что PushPilot содержит native bridge и native APNs/FCM SDK.

Официальная документация Expo, использованная при реализации:

- [Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Plugin development for libraries](https://docs.expo.dev/config-plugins/development-for-libraries/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)

## Что делает plugin

`app.plugin.js` экспортирует `withPushPlatform` через стандартную точку входа пакета. Во время prebuild он:

- добавляет `POST_NOTIFICATIONS` и PushPilot application metadata в Android Manifest;
- добавляет Maven Local для разрешения `com.pushplatform:sdk-android:1.0.0`, собранного из приватного Android SDK checkout;
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
npm test -- --runInBand --watchman=false
npm run test:plugin
npm pack
```

Для внешней проверки пакета и установки приватного native SDK (команды выполняются вне исходников SDK):

```sh
TMP=/tmp/pushpilot-expo-check
rm -rf "$TMP"
mkdir -p "$TMP"
cd "$TMP"
npx create-expo-app@latest app --template blank-typescript
cd app
npm install 'expo@~54.0.0' 'expo-dev-client@~6.0.0' react@19.1.0 react-native@0.81.4
git clone git@github.com:pushplatform/pushpilot-sdk-android.git ../pushpilot-sdk-android
git -C ../pushpilot-sdk-android checkout main
(cd ../pushpilot-sdk-android && ./gradlew :sdk:publishReleasePublicationToMavenLocal)
npm install /absolute/path/to/pushplatform-react-native-1.0.0.tgz
EXPO_HOME=/tmp/pushpilot-expo-home EXPO_NO_TELEMETRY=1 npx expo prebuild --clean --platform all --no-install
EXPO_HOME=/tmp/pushpilot-expo-home EXPO_NO_TELEMETRY=1 npx expo prebuild --platform all --no-install
./android/gradlew -p android assembleDebug
(cd ios && pod install)
xcodebuild -workspace ios/App.xcworkspace -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

Выполнено фактически:

- Вне sandbox: `npm ping --fetch-timeout=15000 --fetch-retries=0` вернул `PONG 400ms`; registry доступен из обычного терминала. Первичный sandbox вызов получил `ENOTFOUND`.
- `npx create-expo-app@latest /tmp/pushpilot-expo-check/app --template blank-typescript --no-install` создал внешний тестовый проект; в нём установлен собранный `@pushplatform/react-native@1.0.0` tarball с Expo SDK 54.0.37, React Native 0.81.4 и React 19.1.0.
- `./gradlew :sdk:publishReleasePublicationToMavenLocal -Dmaven.repo.local=/tmp/pushpilot-m2 --no-daemon` в приватном checkout Android SDK завершился `BUILD SUCCESSFUL`. Удалённый Maven publication не выполнялся.
- `EXPO_HOME=/tmp/pushpilot-expo-home EXPO_NO_TELEMETRY=1 npx expo prebuild --clean --platform all --no-install` и повторный `... npx expo prebuild --platform all --no-install` завершились успешно. В Android generated project: одна `mavenLocal()`, один PushPilot permission и metadata; RN source больше не читает соседний `node_modules`. В iOS generated project: один PushPlatform Pod, одно APNs entitlement и одна запись background mode/application ID; Swift callbacks добавлены один раз.
- `./gradlew assembleDebug --no-daemon -Dmaven.repo.local=/tmp/pushpilot-m2` из внешнего `android/` завершился `BUILD SUCCESSFUL` и создал debug APK. Во время проверки исправлен RN 0.81 Kotlin API: activity берётся из `reactApplicationContext.currentActivity`.
- `pod install --repo-update` в generated `ios/` завершился успешно, установлены 83 Pods, включая приватные `PushPlatform (1.0.0)` и `PushPlatformSDK (1.0.0)`. `xcodebuild -quiet -workspace ios/PushPilotSDKcheck.xcworkspace -scheme PushPilotSDKcheck -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build` завершился с кодом `0`. Xcode compile выявил и помог исправить публичность AppDelegate callbacks.
- `npm run test:plugin`: 4/4; `npm run typecheck`, `npm run build`, `npm test -- --runInBand --watchman=false`: прошли, 4 suites / 96 tests с ts-jest diagnostics включёнными. Диагностика ранее была отключена из-за отсутствующего прямого `jest-util` dependency и несовпадающего TypeScript разрешения RN 0.87 conditional exports; добавлен dependency и явный type path. `npm pack --ignore-scripts` включил plugin/native файлы в tarball.

Статус интеграции: **BUILD VERIFIED** для Expo SDK 54.0.0 / React Native 0.81.4 на Android debug и iOS Simulator. Android debug build использовал локально опубликованный SDK artifact, но Firebase app config не задавался; iOS simulator build не использовал signing credentials. Это проверяет генерацию и компиляцию native проекта, но не реальную APNs/FCM доставку. Реальные push, EAS jobs, npm publish и deploy не выполнялись.

## Ограничения

- Для iOS нужен Apple Developer provisioning и реальный device для APNs; для Android нужен Firebase project и настоящий `google-services.json`.
- Android Maven artifact не опубликован удалённо; перед сборкой приложения выполните `:sdk:publishReleasePublicationToMavenLocal` в приватном checkout. iOS Pod остаётся в приватном Git repository и требует SSH access.
- Background/silent push зависит от ОС, payload, power policy и состояния процесса. Prebuild или native build не проверяют доставку.
- Expo plugin не обещает VoIP/PushKit/CallKit; это отдельная нативная интеграция.
- При недоступной сети npm registry, Expo CLI или приватных native repositories соответствующая проверка блокируется и должна быть отмечена отдельно, без подмены результата локальным mock.
