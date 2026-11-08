# 2.0.3 — 2026-11-08

- Повышена patch-версия React Native SDK; актуальные метаданные и описания согласованы с 2.0.3.
- Нативные зависимости остаются на опубликованной версии 2.0.1; параметры установки и инициализации остаются совместимыми.
- CI запускается также для релизных тегов v*, включая обычную и static iOS consumer-сборки.
- Функциональное поведение push-уведомлений и звонков не менялось.

# 2.0.2 — 2026-11-08

- Упрощены инструкции React Native/Expo: основные native SDK подключаются транзитивно, отдельные app-level pod-записи не нужны.
- Для NSE приведён отдельный target с PushPlatformExtension совместимой ветки 2.x.
- Примеры initialize показывают UUID и options с applicationId/debugMode без адреса сервера.
- Нативные зависимости остаются на опубликованной версии 2.0.1; функциональное поведение SDK не менялось.

# 1.3.14 — 2026-11-05

## 2.0.1

Align package/native dependency versions, installation instructions and production integration documentation.

- Android: `sdk-android` **1.2.6** (явный `firebase-messaging`, совместимо с Firebase BoM 34+ / RN Firebase).

# 1.3.13 — 2026-11-05

- `debugMode: true` разрешает HTTP на RFC1918 LAN (`192.168.x.x`, `10.x`, `172.16–31.x`), не только localhost / `10.0.2.2`.

# 1.3.12 — 2026-11-05

- Один режим storage: custom `url` больше не ставит `environment: development` (default production). Native pin: `PushPlatformSDK` **1.2.11** + `PushPlatformExtension` / `sdk-android` 1.2.5 (git-тег `v1.2.11`; Trunk read-only).

# 1.3.11 — 2026-11-04

- Native pin: `PushPlatformSDK` **1.2.10** + отдельный pod `PushPlatformExtension` / `sdk-android` 1.2.5. NSE: `PushPlatformExtension` (не subspec). Bare Podfile и Expo plugin pin'ят оба pod с одного git-тега / `native/ios` path (Trunk read-only).

# 1.3.10 — 2026-11-04

- Current **latest** npm-релиз (GHA-verified tarball). После publish `1.3.9` registry сначала держал версию в невидимом stage (E409 / empty `npm stage list`); `1.3.9` затем вышел и тоже GHA-ok — предпочтителен **`@1.3.10`**.
- Native pin: `PushPlatformSDK` **1.2.9** / `sdk-android` 1.2.5. NSE: `PushPlatformSDK/Extension` + `import PushPlatformExtension` (не полный App SDK). `1.3.8` помечен `npm deprecate` (битый hand-publish).

# 1.3.9 — 2026-11-04

- Корректный npm-релиз моста на `PushPlatformSDK` 1.2.8 / `sdk-android` 1.2.5 (GHA prepare+verify, затем CLI publish verified tarball).
- **`1.3.8` на npm был ошибочный hand-publish** (не GHA-candidate). Не использовать; ставить `@1.3.9` / `latest`. `1.3.8` будет помечен `npm deprecate`.

# 1.3.8 — 2026-11-04

- Публикация моста на `PushPlatformSDK` 1.2.8 с резолвом через публичный git-тег `v1.2.8` (CocoaPods Trunk read-only; git tag — source of truth). Expo по-прежнему `:path => native/ios`. Android — `sdk-android` 1.2.5.

# 1.3.7 — 2026-11-04

- iOS-мост зависит от `PushPlatformSDK` 1.2.8 (`PushPlatformExtension` для NSE). CocoaPods Trunk сейчас не принимает новые specs — CI и bare Podfile резолвят native SDK с публичного git-тега `v1.2.8` (Expo — `:path => native/ios`). Android остаётся `sdk-android` 1.2.5.

# 1.3.6 — 2026-11-03

- В README и INSTALLATION добавлены шаги Notification Service Extension для iOS и код `NotificationService.swift` для копирования. Новых вызовов из JavaScript нет. Зависимости те же: `PushPlatformSDK` 1.2.6 и `sdk-android` 1.2.5.

# 1.3.5 — 2026-11-03

- Нативные SDK сбрасывают бейдж при входе, подтверждают получение и отправляют сессию. Новых вызовов из JavaScript нет. Экспорты пакета не изменились.
- Expo plugin записывает App Group `group.<bundle id>.pushplatform`. Target Notification Service Extension и тот же App Group на extension добавляет владелец приложения из `Sources/PushPlatformNotificationService/NotificationService.swift`. Без target баннер есть, а `received` при закрытом приложении нет.
- Зависит от опубликованного `PushPlatformSDK` 1.2.6 и `sdk-android` 1.2.5. CocoaPods trunk до 6 ноября не принимает `PushPlatformSDK` 1.2.7, поэтому iOS-мост остаётся на поде, который уже есть в CDN.

# 1.3.4 — 2026-11-02

- Необязательный `notificationId` у уведомления в `onNotificationOpened` и `onNotificationWillDisplay`. Поле `notification_id` в `data` не попадает.
- Открытие уведомления нативный SDK отправляет сам через `PUT /notifications/{id}`, включая холодный старт.
- Android: клик, уже переданный нативным SDK, не приходит в `onNotificationOpened` второй раз.
- Экспорты пакета не изменились.
- Зависит от `PushPlatformSDK` 1.2.6 и `sdk-android` 1.2.4.

# 1.3.3 — 2026-11-02

- `foregroundBannerFallback` в объекте `initialize` задаёт секунды запасного системного баннера. Строка application id его не передаёт.
- Зависит от `PushPlatformSDK` 1.2.5 и `sdk-android` 1.2.3.

# 1.3.2 — 2026-11-02

- Адрес только `url`. Старое имя адреса удалено из моста, контрактных тестов и примеров.
- Показ ждёт обработчик без восьмисекундного таймера.
- Зависит от `PushPlatformSDK` 1.2.4 и `sdk-android` 1.2.2.

# 1.3.1 — 2026-11-02

- `onNotificationWillDisplay` с `preventDefault()` до возврата обработчика. `getDeviceToken()` возвращает последний токен. Успешный `onRegistrationUpdated` содержит `token`.
- `apiKey` не отправляется.
- Зависит от `PushPlatformSDK` 1.2.2 и `sdk-android` 1.2.1.

# 1.3.0 — 2026-11-01

- `initialize` takes an application id or `{applicationId, environment}`. No API key is sent.
- Depends on PushPlatformSDK 1.2.0.
- iOS autolinking is checked on the repository test app and its current React Native, including a static-framework build. It is not pinned to another application's Firebase, Vision Camera or Nitro versions.

# 1.2.0

This version was not published to npm. `latest` stayed on 1.1.0.

- Preserve the 1.0.3 installation contract: normal RN autolinking and a transitive CocoaPods dependency. No XCFramework, node_modules patch or additional native Podfile entry.
- Align release source tags and remove global Ruby constant pollution from repeated podspec evaluation.
- A check that pinned React Native 0.83 with Firebase, Vision Camera and Nitro is not the installation contract.

# 1.1.0 — 2026-11-01

- Unified application ID and permanent shared application key for SDK and server; no project/environment setup step.
- Actual device kind, language, time zone, OS/SDK/app version and notification permission metadata. Unknown facts stay unknown.
- Optional legacy environment compatibility; iOS defaults to build-entitlement APNs transport detection.
- Test subscription remains a separate console marker.

# Changelog

## 1.0.3 — 2026-10-31

- Повторный `PushPlatform.initialize()` после успешной инициализации завершается успешно вместо ошибки `PushPlatform already initialized`.
- Текущая конфигурация сохраняется, нативная инициализация повторно не вызывается.

## 1.0.2 — 2026-10-31

- Android native SDK обновлён до 1.0.1: при configure автоматически запрашивается текущий FCM-токен, ранние callback дожидаются регистрации установки; development/production и package name передаются из приложения.
- Никакого ручного API-обхода для первоначального токена. Нативные события успешной/неуспешной регистрации сохраняют прежний контракт и не раскрывают токен в JS/Dart.
- iOS SDK и публичные методы обёртки не менялись.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-17

### Added

- Initial release of Push Platform React Native SDK
- TypeScript-first API with strict type safety (no `any` types)
- iOS native bridge wrapping `PushPlatformSDK` (Swift)
- Android native bridge wrapping `sdk-android` (Kotlin)
- Core SDK methods:
  - `initialize()` — SDK initialization with environment selection
  - `getInstallationId()` — Retrieve unique installation ID
  - `login()` — Associate installation with user ID
  - `logout()` — Dissociate user from installation
- Event emitters:
  - `onNotificationReceived()` — Notification received (foreground/background)
  - `onNotificationOpened()` — Notification opened by user
  - `onRegistrationUpdated()` — Token registration status updates
- Native push notification support:
  - Normal push notifications
  - Silent/data-only push notifications
  - VoIP/call push notifications (iOS only, handled natively in Swift)
- Automatic event deduplication via `event_id` and `call_id`
- Security features:
  - No token values exposed to JavaScript layer
  - All token registration handled by native SDKs
  - VoIP/CallKit logic remains entirely in Swift (iOS)
- Platform support:
  - React Native 0.68.0+
  - iOS 13.0+
  - Android 8.0+ (API level 26+)
- Autolinking support:
  - iOS via CocoaPods
  - Android via Gradle
- Complete documentation:
  - Quick Start Guide
  - API Reference
  - Troubleshooting Guide
  - Universal Migration Guide (works with any legacy push provider)
- TypeScript type definitions for all public APIs

### Architecture

- Zero business logic duplication — all push notification logic remains in native SDKs
- JavaScript bridge provides only event forwarding and API exposure
- Native SDKs handle retry logic, token management, and deduplication
- Event-driven architecture with type-safe event emitters

### Security

- ADR-0014 compliant architecture
- No sensitive data (tokens, credentials) exposed to JavaScript
- Secure token storage handled by native SDKs (iOS Keychain, Android EncryptedSharedPreferences)
- VoIP/CallKit operations remain in native Swift layer

[1.0.0]: https://github.com/pushplatform/react-native/releases/tag/v1.0.0
