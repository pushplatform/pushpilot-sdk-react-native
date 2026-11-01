# Установка PushPilot для React Native и Expo

Установите пакет из npm:

```sh
npm install @pushplatform/react-native@1.1.0
```

Для фиксации версии укажите её вместо `next` в команде установки.
Native SDK включены в пакет: `native/ios` содержит Pod с Swift sources, а
`native/android/maven` — Maven repository для Android SDK.
Нужна сеть для обычных публичных зависимостей React Native, AndroidX и Firebase.

## Expo SDK 54

```sh
npx expo install expo-dev-client
```

В `app.json`:

```json
{
  "expo": {
    "ios": { "bundleIdentifier": "com.example.app" },
    "android": { "package": "com.example.app" },
    "plugins": [["@pushplatform/react-native", {
      "applicationId": "00000000-0000-4000-8000-000000000000",
      "ios": { "apsEnvironment": "development" },
      "android": { "googleServicesFile": "./google-services.json" }
    }]]
  }
}
```

Замените UUID на приложение PushPilot и укажите настоящий Firebase config.
Затем `npx expo prebuild`, `npx expo run:android` / `npx expo run:ios`.
Expo Go не содержит native bridge. Для production iOS используйте правильный
APNs entitlement/signing profile. В `initialize()` передайте общий ключ приложения из PushPilot; отдельный шлюз не требуется.

Для EAS настройте development/production profile и app credentials. npm-пакет
попадает в remote build обычной установкой dependencies из публичного npm.

## Bare React Native

Autolinking подключает RN bridge и его зависимость `PushPlatformSDK` из публичного CocoaPods. Дополнительная строка `pod 'PushPlatformSDK'` и локальные пути в Podfile не требуются.

```sh
cd ios
bundle exec pod install --repo-update
```

Если проект не использует Bundler, выполните `pod install --repo-update`. Включите Push Notifications, `aps-environment`
и background mode `remote-notification`; передавайте APNs token и notification
callbacks из AppDelegate в `PushPlatform.shared`, как в API native SDK.

Минимальное forwarding APNs token в Swift AppDelegate:

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

Также назначьте `UNUserNotificationCenter.current().delegate` и передавайте
`willPresent` в `handleForegroundNotification`, а `didReceive` — в
`handleNotificationResponse`. Полные Swift callbacks находятся в
[`configureAppDelegate`](../plugin/helpers.js), который входит в npm tarball.
При наличии этих методов в superclass используйте `override`.

В Android `build.gradle`, внутри `allprojects.repositories`, добавьте:

```groovy
maven {
    def sdkPackage = new File(["node", "--print", "require.resolve('@pushplatform/react-native/package.json')"].execute(null, rootDir).text.trim()).parentFile
    url = uri(new File(sdkPackage, "native/android/maven"))
    content { includeModule("com.pushplatform", "sdk-android") }
}
```

Если проект централизует repositories через `dependencyResolutionManagement`
в `settings.gradle`, поместите тот же блок в его `repositories`, сохранив
`google()` / `mavenCentral()`. Не добавляйте project repository при
`RepositoriesMode.FAIL_ON_PROJECT_REPOS`.

Подключите Google Services Gradle plugin и настоящий `app/google-services.json`.
В SDK уже есть FCM service; токены не передаются в JavaScript.

## Обновление предыдущей Expo интеграции

Удалите `ios.sdkGitUrl` / `ios.sdkGitBranch` из plugin options и запустите prebuild.
Plugin заменяет собственную старую Pod Git-запись и Maven Local запись.
Если приватный Pod или `mavenLocal()` добавлялись вручную, замените их по
инструкции выше; вручную заданный Pod plugin сохраняет.

Если отсутствует `native/manifest.json` или Android AAR/iOS Pod, проверьте источник
пакета и переустановите нужную версию из npm. Native SDK должны находиться внутри
установленного `@pushplatform/react-native`; путь Pod и Maven repository должен
указывать на него.

Локальный API: в Android Emulator адрес хоста — `10.0.2.2`, а не `127.0.0.1` ([Android network address space](https://developer.android.com/studio/run/emulator-networking-address)). Для локального HTTP включите `debugMode: true`; release требует HTTPS. На настоящем устройстве используйте доступный HTTPS URL API. Выбор клиентского окружения PushPilot для этого не требуется.
