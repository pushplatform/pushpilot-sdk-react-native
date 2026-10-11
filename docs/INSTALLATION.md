# Установка RN / Expo SDK

До npm-публикации установите **подготовленный release tarball**:

```sh
npm install /absolute/path/to/pushplatform-react-native-1.0.0.tgz
```

После публикации: `npm install @pushplatform/react-native`.
Native SDK уже включены: `native/ios` содержит Pod с Swift sources, а
`native/android/maven` — AAR, POM, Gradle metadata и sources JAR.
Пользователю не нужны приватный Git-доступ, Maven Local, Maven credentials или CocoaPods trunk account.
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
APNs environment/signing profile. API key передаётся в runtime `initialize()`.

Для EAS настройте development/production profile и app credentials. npm-пакет
попадает в remote build обычной установкой dependencies. До публикации положите
tarball в `vendor/` приложения, включите его в EAS upload и используйте
`"@pushplatform/react-native": "file:./vendor/pushplatform-react-native-1.0.0.tgz"`.
Приватные native repositories на EAS не клонируются.

## Bare React Native

Autolinking подключает RN bridge. Для native SDK добавьте в application target
`ios/Podfile` рядом с `use_native_modules!`:

```ruby
pushpilot_package = File.dirname(`node --print "require.resolve('@pushplatform/react-native/package.json')"`.strip)
pod 'PushPlatformSDK', :path => File.join(pushpilot_package, 'native/ios')
```

Выполните `cd ios && pod install`. Включите Push Notifications, `aps-environment`
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

Если отсутствует `native/manifest.json` или bundled AAR/Pod, установлен старый
или неподготовленный пакет: используйте новый release tarball. Старый
`pushplatform-react-native-1.0.0.tgz` в корне SDK репозитория для этой схемы не подходит.
