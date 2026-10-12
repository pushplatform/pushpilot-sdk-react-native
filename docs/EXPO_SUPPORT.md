# Expo support state

Дата состояния: 2026-10-12. PR #1 из `feat/expo-support` и исправления release
workflow из PR #2 / #3 смерджены в `main`. Подготовка release candidate на GitHub
подтверждена владельцем: **prepare PASS**, **publish Skipped**. Первый публичный
npm-релиз `@pushplatform/react-native@1.0.0` опубликован отдельно владельцем;
установка из публичного registry подтверждена. [Запись выпуска](NPM_RELEASE.md).

Поддерживаемая связка для примера: Expo SDK 54.0.0, React Native 0.81.4, React 19.1.0, development build через `expo-dev-client`. Общий RN SDK поддерживает React Native 0.77+ и New Architecture; Expo Go не поддерживается, потому что PushPilot содержит native bridge и native APNs/FCM SDK.

Официальная документация Expo, использованная при реализации:

- [Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Plugin development for libraries](https://docs.expo.dev/config-plugins/development-for-libraries/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)

## Что делает plugin

`app.plugin.js` экспортирует `withPushPlatform` через стандартную точку входа пакета. Во время prebuild он:

- добавляет `POST_NOTIFICATIONS` и PushPilot application metadata в Android Manifest;
- добавляет Maven repository из установленного npm пакета (`native/android/maven`) для `com.pushplatform:sdk-android:1.0.0`; Maven Local пользователю не нужен;
- при `android.googleServicesFile` добавляет Google Services Gradle plugin и оставляет путь к конфигу в Expo config;
- добавляет `aps-environment`, `remote-notification`, application UUID и Pod `PushPlatformSDK` из `native/ios` установленного npm пакета; приватный Git пользователю не нужен;
- прокидывает APNs token, foreground notification и notification response через стандартный Swift AppDelegate;
- проверяет параметры и использует маркеры/проверки для идемпотентного повторного prebuild.

`applicationId` можно также задавать динамически из `app.config.ts`; plugin не записывает API key в native project.

Native SDK coordinates: iOS — `PushPlatformSDK` 1.0.0; Android — `com.pushplatform:sdk-android:1.0.0`. Release payload собирается из pinned native commits в `release/native-lock.json`. AAR, Maven metadata, Swift sources и лицензии входят в tarball. Удалённые Maven/CocoaPods releases не требуются. Старые `ios.sdkGitUrl` / `ios.sdkGitBranch` нужно удалить; plugin переводит собственные ранее сгенерированные Git/Maven Local записи на bundled dependencies.

## Проверки native интеграции — история 2026-10-04

Следующие команды и результаты относятся к прежней схеме с private native dependencies. Они уже выполнены; повторять их для восстановления состояния не нужно. Текущие инструкции установки — [INSTALLATION.md](INSTALLATION.md), упаковки — [RELEASING.md](RELEASING.md).

Исторический план команд:

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

## Подготовка распространения — 2026-10-11

- Исходное состояние: чистая ветка `feat/expo-support`, HEAD `7433f40`; предыдущие native builds сохранены как подтверждённые результаты. Полные prebuild/Android/iOS builds не повторялись.
- Native SDK зафиксированы: Android `aef4a5122245360771cd0e172f11824ed1259ad3`, iOS `dd759a5878cba045c50f1c4aec82069374106313`. При локальной проверке использованы сохранённые Android build outputs и их Maven metadata; AAR и sources JAR прошли проверку SHA-256 по `.module`. Native checkouts не изменялись.
- Владелец выбрал MIT для собственного native кода обоих SDK. Тексты сохранены в `release/licenses/`; сторонние лицензии и notices описаны в `release/THIRD_PARTY_NOTICES.md`, архивы и source headers копируются без изменения.
- Добавлены staging/check scripts, `prepack`/`prepublishOnly` guards, release workflow с ручным запуском и `publish=false` по умолчанию, pinned private checkouts, candidate artifact и отдельным OIDC publish job через environment `npm-release`. Обычный CI проверяет типы, RN tests, plugin tests и JS build.
- `npm run typecheck`, `npm run build`, RN tests **96/96**, plugin tests **5/5** проходят. YAML и shell syntax обоих workflows проверены локально.
- `npm pack` создал `dist/pushplatform-react-native-1.0.0.tgz`: 67 файлов, включая native payload и установочную инструкцию; tests, example app, secrets и build directories исключены. Проверка **самого архива** по manifest/checksums проходит.
- Проверка целостности также отклонила отдельный тестовый архив с намеренно изменённым AAR (`Checksum mismatch`); рабочий release tarball не изменялся.
- Tarball установлен обычным `npm install` во внешний consumer в `/tmp`, без install scripts и без загрузки RN peer dependencies. Native dependency probes проверяют отдельно новый путь распространения; они не являются повторной сборкой приложения.
- `prepare` hook удалён: JS собирается через `prepack`, а установка готового tarball не выполняет SDK build и не требует разрешения install scripts. Для работы с исходниками используйте `npm run build`.
- Android: Gradle 8.13 `verifyBundledSDK` прошёл offline с обычными `google()` / `mavenCentral()`, разрешил AAR непосредственно из `node_modules/@pushplatform/react-native/native/android/maven`; `mavenLocal()` и private checkout отсутствовали в consumer config. iOS: standalone `pod install --no-repo-update` установил `PushPlatformSDK (1.0.0)` из `native/ios`, без Git и компиляции приложения. Эти проверки сохранены в `scripts/verify-distribution.mjs` и Android-проверка включена в release workflow.

## Проверка release workflow — 2026-10-12

- Владелец создал PAT и добавил environment secret `NATIVE_SDK_READ_TOKEN`
  в `sdk-release-build`.
- В PR #2 исправлен Android SDK setup: вместо default `tools platform-tools`
  устанавливаются `platform-tools`, `platforms;android-34`, `build-tools;35.0.0`
  согласно pinned native SDK (`compileSdk=34`, AGP `8.11.1`).
- В PR #3 publish guard заменён на явное `inputs.publish == true` с проверкой
  ручного запуска и ref `refs/tags/v…`. Branch runs пропускают весь publish job;
  проверка точного version tag внутри job сохранена.
- После исправлений владелец подтвердил подготовку без публикации на `main`:
  **prepare PASS**, **publish Skipped**. Release prepare проверил pinned native
  checkouts, Android staging build, RN tests/plugin/types, tarball и bundled
  Gradle resolution во внешнем npm consumer, затем сохранил `rn-sdk-candidate`.
- Проверка зафиксирована по сообщению владельца, без повторного запуска workflow
  агентом. Run URL, source SHA и checksum скачанного artifact не передавались;
  агент не проверял скачанный GitHub candidate отдельно.
- На этапе prepare OIDC/npm publication ещё не проверялась. Полные локальные prebuild/Android/iOS
  builds не повторялись; GitHub prepare на Linux не проверяет iOS build.

Локальный tarball предыдущего шага относится к feature HEAD `8866fba`;
для следующего решения о выпуске сохраните artifact конкретного успешного run
и проверьте его `source-commit.txt` / `SHA256SUMS`.
На этапе prepare npm/Maven/CocoaPods publication, EAS jobs и проверка реальных push не выполнялись.
Инструкции и подтверждённый статус сохранены в [RELEASING.md](RELEASING.md).

## Первый npm-релиз — 2026-10-12

- Владелец опубликовал `@pushplatform/react-native@1.0.0` из GitHub candidate
  с source SHA `ad1edc19cc050e29176253b2afcf140bfb4e1fff`, подтвердив 2FA.
- Публичный registry подтвердил версию и теги `next` / `latest`, оба указывают
  на `1.0.0`; integrity опубликованного tarball совпал с проверенным candidate.
- Одна установка из публичного npm в чистый проект без npm-входа прошла;
  JS/types/plugin/native bridges и bundled payload присутствуют, 27 native
  checksums совпали. Повторные тесты и сборки не запускались.
- Команда установки: `npm install @pushplatform/react-native@1.0.0`.
  Подробности и ограничения — [NPM_RELEASE.md](NPM_RELEASE.md).
- Реальная доставка push, EAS и OIDC publish не объявляются проверенными.

## Ограничения

- Для iOS нужен Apple Developer provisioning и реальный device для APNs; для Android нужен Firebase project и настоящий `google-services.json`.
- Установите публичный `@pushplatform/react-native@1.0.0`; старый tarball в корне репозитория и неподготовленный Git checkout не содержат bundled native payload.
- Background/silent push зависит от ОС, payload, power policy и состояния процесса. Prebuild или native build не проверяют доставку.
- Expo plugin не обещает VoIP/PushKit/CallKit; это отдельная нативная интеграция.
- Release workflow требует read access к двум private native repositories только для сборщика. Пользовательские установки из tarball/npm этого доступа не требуют. При недоступной сети публичные npm/Gradle dependencies могут блокировать установку.
