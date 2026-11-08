# Expo

Установите `@pushplatform/react-native` и `expo-dev-client`. В app.json добавьте
plugin `@pushplatform/react-native`, applicationId, Firebase google-services.json
для Android и `apsEnvironment: "production"` для production iOS-профиля.

Plugin подключает нативные зависимости npm-пакета, настраивает разрешения и
forwarding APNs callbacks. Используйте EAS build или development build; Expo Go
не содержит нативный модуль.

Notification Service Extension настраивается в Xcode: подключите
PushPlatformExtension совместимой ветки 2.x, включите одну App Group у приложения и extension,
используйте `import PushPlatformExtension` в NotificationService.swift.

Звонками управляет приложение: настройте один PushKit registry и CallKit provider
или нативный VoIP handler. Обычная инициализация SDK включает только push-транспорт.

Полная настройка: [INSTALLATION.md](INSTALLATION.md).
