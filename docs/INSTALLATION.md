# Установка PushPilot для React Native и Expo

Установите пакет из npm:

```sh
npm install @pushplatform/react-native
```

Версии нативных iOS и Android SDK определяются зависимостями npm-пакета.
Нативные зависимости подключаются пакетом. Дополнительная настройка отдельного
Notification Service Extension описана ниже.

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

Autolinking подключает мост и его нативные зависимости. Отдельные записи
native SDK в основном target Podfile не добавляются.

```sh
cd ios
bundle exec pod install
```

Без Bundler выполните `pod install`. При обновлении используйте штатный
`pod update PushPlatform` и сохраняйте lockfile приложения.
Включите Push Notifications, `aps-environment` и background mode
`remote-notification`; передавайте APNs callbacks, как показано ниже.

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
4. Добавьте отдельный target extension и замените `NotificationService.swift` кодом ниже. В extension используйте `import PushPlatformExtension`.

```ruby
target 'PushPlatformNotificationServiceExtension' do
	pod 'PushPlatformExtension', '>= 2.0.0', '< 3.0'
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



Переход 2.0: [MIGRATION_2.md](MIGRATION_2.md).
