# Совместимость SDK 2.0.5

- Нативные зависимости: `ru.pushplatform:sdk-android:2.0.4`; PushPlatformSDK и PushPlatformExtension — 2.0.3.
- Node.js: >=18, согласно package.json.
- iOS: >=13.0; Android RN bridge: API >=26.
- Expo использует native build и plugin из npm-пакета; Expo Go не поддерживается.
- Существующие PushKit/CallKit и FirebaseMessagingService остаются под управлением приложения; SDK предоставляет forwarding API.

Нативные зависимости и их точные коммиты зафиксированы в release/native-lock.json.
Требования React/React Native заданы peerDependencies в package.json.
