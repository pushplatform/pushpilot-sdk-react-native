# Установка PushPilot для React Native и Expo

Установите пакет из npm:

```sh
npm install @pushplatform/react-native@2.0.1
```

React Native SDK 2.0.1 использует нативные iOS и Android SDK 2.0.1.
Пакет включает исходники iOS и Maven-артефакты Android. Expo plugin подключает их
автоматически; для bare React Native настройте Podfile по инструкции ниже.

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
      "ios": { "apsEnvironment": "production" },
      "android": { "googleServicesFile": "./google-services.json" }
    }]]
  }
}
```

Замените UUID на приложение PushPilot и укажите настоящий Firebase config.
Затем `npx expo prebuild`, `npx expo run:android` / `npx expo run:ios`.
Expo Go не содержит native bridge. Для production iOS используйте правильный
APNs entitlement/signing profile. В `initialize()` передайте application id. Секретный ключ в клиент не кладётся.

Для EAS настройте development/production profile и app credentials. npm-пакет
попадает в remote build обычной установкой dependencies из публичного npm.

## Bare React Native

Autolinking подключает RN bridge. Добавьте в `ios/Podfile` (сразу после `platform :ios`) pin с публичного git-тега:

```ruby
pod 'PushPlatformExtension', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v2.0.1'
pod 'PushPlatformSDK', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v2.0.1'
```

Expo plugin вместо этого пишет `:path => native/ios` из npm-пакета.

```sh
cd ios
bundle exec pod install --repo-update
```

Если проект не использует Bundler, выполните `pod install --repo-update`. Включите Push Notifications, `aps-environment`
и background mode `remote-notification`; передавайте APNs token и notification
callbacks из AppDelegate в `PushPlatform.shared`, как в API native SDK.

### Обновление до 2.0.1

Версия 2.0.1 использует `PushPlatformSDK` 2.0.1 и `sdk-android` 2.0.1. При обновлении существующий Podfile.lock нужно обновить штатной командой CocoaPods для этих двух зависимостей:

```sh
npm install @pushplatform/react-native@2.0.1
cd ios
bundle exec pod update PushPlatform PushPlatformSDK PushPlatformExtension --repo-update
```

Другие версии Pods сохраняются. После этого повторные установки используют обычный `pod install`. Удаление npm-пакета не удаляет зафиксированные версии CocoaPods. Для нового проекта без старого lockfile достаточно команды `pod install` из предыдущего раздела.

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

## iOS Notification Service Extension

Нужен, чтобы `received` ушёл, когда приложение закрыто. Баннер без него показывается. Plugin и autolinking target не создают.

1. **File → New → Target → Notification Service Extension**. **Don't Activate**. Deployment Target как у приложения, не ниже iOS 13.
2. Bundle ID: `<bundle id приложения>.PushPlatformNotificationService`.
3. **App Groups** на приложении и на extension: `group.<bundle id приложения>.pushplatform`.
4. В Podfile уже должен быть git-pin `v2.0.1` (см. выше). Добавьте target extension и замените `NotificationService.swift` кодом ниже. В extension — `import PushPlatformExtension`, не `import PushPlatformSDK` (иначе `No such module 'PushPlatformSDK'`). Образец: [NotificationService.swift](https://github.com/pushplatform/pushpilot-sdk-ios/blob/v2.0.1/Sources/PushPlatformNotificationService/NotificationService.swift).

```ruby
target 'PushPlatformNotificationServiceExtension' do
  pod 'PushPlatformExtension', :git => 'https://github.com/pushplatform/pushpilot-sdk-ios.git', :tag => 'v2.0.1'
end
```

```swift
import UserNotifications
import PushPlatformExtension

class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var receivedRequest: UNNotificationRequest!
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.receivedRequest = request
        self.contentHandler = contentHandler
        bestAttemptContent = request.content.mutableCopy() as? UNMutableNotificationContent
        if let bestAttemptContent {
            PushPlatformExtension.didReceive(receivedRequest, with: bestAttemptContent, withContentHandler: contentHandler)
        } else {
            contentHandler(request.content)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttemptContent,
           PushPlatformExtension.serviceExtensionTimeWillExpireRequest(receivedRequest, with: bestAttemptContent) {
            contentHandler(bestAttemptContent)
        }
    }
}
```

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

Переход 2.0: [MIGRATION_2.md](MIGRATION_2.md).
