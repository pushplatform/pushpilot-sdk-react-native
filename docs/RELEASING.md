# Подготовка и выпуск RN / Expo SDK

Статус: workflow подготовлен; публикации npm, Maven и CocoaPods не выполнялись.
Prebuild и Android/iOS builds, записанные 2026-10-04, уже подтверждены; их не нужно
повторять для восстановления состояния. Новая схема распространения требует
отдельной проверки tarball и разрешения bundled native dependencies.

## Схема пакета

Один публичный npm-пакет `@pushplatform/react-native` содержит JS/TypeScript,
RN bridges, Expo plugin, native Android Maven payload и native iOS Pod sources.
Это устраняет приватный Git-доступ и ручной Maven Local у пользователей;
не требуется запускать отдельные Maven Central / CocoaPods releases.
Native source code iOS станет доступен в публичном npm tarball.

`release/native-lock.json` фиксирует реальные commit SHA и версии обоих SDK.
Изменение native SDK требует обновления lock, dependency в RN Gradle/podspec
и новой версии npm-пакета. Release job собирает Android из pinned checkout;
его существующая Gradle publication пишет только в изолированный staging
Maven repository runner, а не в удалённый registry.

Упаковка копирует tracked Swift sources и podspec, AAR, POM, `.module` и все
артефакты, на которые ссылается Gradle metadata, включая sources JAR.
`native/manifest.json` содержит source SHA и SHA-256 каждого native файла.
`prepack` / `release:check` запрещают неполный release payload.
Проверка архива также запрещает tests, node_modules, build directories и app secrets.

## Доступы и настройки владельца

1. В GitHub environment `sdk-release-build` задайте secret `NATIVE_SDK_READ_TOKEN`:
   fine-grained PAT или GitHub App token с **Contents: read** ровно для
   `pushplatform/pushpilot-sdk-android` и `pushplatform/pushpilot-sdk-ios`.
   Обычный `GITHUB_TOKEN` RN repository не даёт доступ к другим private repositories.
2. Нужны права настройки Actions/environments в `pushplatform/pushpilot-sdk-react-native`.
   Создайте `sdk-release-build` и `npm-release`; ограничьте refs и добавьте
   required reviewers для release environments.
3. Нужны npm-права публикации `@pushplatform/react-native` в scope `@pushplatform`.
   Для OIDC настройте Trusted Publisher: owner `pushplatform`, repository
   `pushpilot-sdk-react-native`, workflow **`release.yml`**, environment **`npm-release`**,
   разрешённое действие `npm publish`. Workflow использует Node 22 и npm 11.15.0.
   Требования: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
4. Если package ещё не существует и его настройки Trusted Publisher недоступны,
   первый релиз выполняется владельцем интерактивно из проверенного tarball
   с npm login/2FA; затем настраивается OIDC. npm token в repository для этого не нужен.
   Пока публикация не разрешена, этот шаг не выполнять.
5. Для автоматической provenance через OIDC RN repository должен соответствовать
   `package.json.repository` и быть публичным:
   [npm provenance prerequisites](https://docs.npmjs.com/generating-provenance-statements/).

Apple/APNs/Firebase/EAS credentials для **SDK release** не нужны. Они нужны
разработчику приложения для signing и проверки реальных push.
Доступы к backend, console и базе не нужны.

## Лицензии native SDK

2026-10-11 владелец выбрал **MIT для собственного кода обоих native SDK**.
Одобренные notices сохранены в `release/licenses/android.LICENSE` и
`release/licenses/ios.LICENSE`; stage включает их в tarball. Это устраняет
неоднозначность старого Apache-2.0 badge в Android README без изменения
native checkout или commit SHA.

Сторонние библиотеки сохраняют свои лицензии: `release/THIRD_PARTY_NOTICES.md`
описывает прямые native зависимости, а `release/licenses/Apache-2.0.txt`
содержит официальный текст Apache-2.0. AAR/JAR копируются без изменения,
исходные source headers и tracked LICENSE/NOTICE files сохраняются.
Внешние библиотеки не включаются в AAR и скачиваются Gradle из публичных
repositories со своими исходными notices. При обновлении lock проверьте inventory.

## Подготовка без публикации

Workflow `.github/workflows/release.yml` запускается только вручную.
Чтобы GitHub показал `workflow_dispatch`, workflow должен быть сохранён в default
branch; перед этим проверьте подготовленные изменения в текущей ветке.
Выберите текущую подготовленную ветку и оставьте **publish=false** (default).
Он проверит RN tests/plugin/types, соберёт pinned Android SDK, упакует и
проверит архив, установит его во внешний npm consumer и разрешит bundled
AAR через Gradle без Maven Local, затем сохранит artifact `rn-sdk-candidate` на 30 дней.
Artifact включает tarball, `pack.json`, `SHA256SUMS`, native manifest и source commit.
Ни push ветки, ни создание тега не запускают публикацию.

Локально, с уже подготовленными native checkouts и Maven payload:

```sh
npm ci
npm run release:stage -- \
  --android-repo /path/to/pushpilot-sdk-android \
  --ios-repo /path/to/pushpilot-sdk-ios \
  --maven-repo /path/to/staged-maven-repository
npm run typecheck
npm test -- --runInBand --watchman=false
npm run test:plugin
mkdir -p dist
npm pack --pack-destination dist
node scripts/check-package.mjs --archive dist/pushplatform-react-native-1.0.0.tgz
node scripts/verify-distribution.mjs \
  --archive dist/pushplatform-react-native-1.0.0.tgz \
  --gradle /path/to/pushpilot-sdk-android/gradlew --ios
```

`native/` и `.release-sources/` игнорируются Git; workflow воссоздаёт payload.
`--ios` требует macOS/CocoaPods и проверяет local Pod installation без
компиляции/signing приложения; Linux workflow проверяет только Gradle resolution.
`--offline` можно добавить при наличии cached Firebase BOM.
Перед повторным stage переместите старый `native/` в другое место.
Stage откажет при другом checkout SHA, tracked изменениях или несовпадении
checksum артефактов с Gradle metadata. Не используйте произвольный устаревший
Maven Local artifact вместо свежей publication pinned checkout.

## Публикация — только после отдельного решения владельца

После проверки candidate, лицензий, scope ownership и installation resolution:

1. Зафиксируйте изменения и создайте `vVERSION`, совпадающий с `package.json.version`.
2. Запустите workflow на этом теге с `publish=true` и нужным `dist_tag`:
   `next` для предварительного распространения, `latest` для общего релиза.
3. Одобрите `npm-release` environment. Publish job повторно проверит архив,
   checksum и source commit и опубликует **тот же tarball**, не перепаковывая его.

Сейчас workflow не запускался, environments/secrets не настраивались и
публикация не выполнялась.
