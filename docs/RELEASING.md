# Подготовка и выпуск RN / Expo SDK

Статус на 2026-10-12: **RELEASE PREPARE VERIFIED** — владелец подтвердил
`prepare: PASS`, `publish: Skipped` для подготовки без публикации на `main`.
PR #1 и исправления release workflow из PR #2 / #3 смерджены в `main`.
Публикации npm, Maven и CocoaPods не выполнялись; OIDC publish job ещё не проверен.
Prebuild и Android/iOS builds, записанные 2026-10-04, уже подтверждены; их не нужно
повторять для восстановления состояния. Bundled tarball, установка во внешний
npm consumer, Gradle resolution и local Pod installation также уже проверены.
Первый успешный запуск подготовки candidate на GitHub подтверждён ниже.

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

### Доступ для подготовки candidate

Владелец уже создал PAT и сохранил его в environment `sdk-release-build` как
`NATIVE_SDK_READ_TOKEN`; успешный prepare подтвердил доступ к pinned native checkouts.
Инструкция ниже сохранена для восстановления и ротации доступа.

Нужны права владельца/admin на `pushplatform/pushpilot-sdk-react-native` и
read access к двум native repositories. Значение токена сохраните в GitHub,
не отправляйте его в чат и не записывайте в репозиторий.

1. В GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   создайте токен, например `rn-sdk-native-read`, с такими настройками:

   | Поле | Значение |
   | --- | --- |
   | Resource owner | `pushplatform` |
   | Repository access | Only select repositories |
   | Selected repositories | `pushpilot-sdk-android`, `pushpilot-sdk-ios` |
   | Repository permissions → Contents | Read-only |
   | Metadata | Read-only (автоматически) |
   | Expiration | Например, 30 дней; продлить/заменить перед истечением |

   Другие write/admin permissions не нужны. Если организация требует approval,
   дождитесь одобрения токена: `pending` не даёт доступа к private repositories.
   Обычный `GITHUB_TOKEN` RN repository не даёт доступ к этим двум repositories.
   [Настройка fine-grained PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
2. В RN repository **Settings → Environments** создайте `sdk-release-build`.
   В **Deployment branches and tags → Selected branches and tags** добавьте
   отдельные правила: Branch `main` и Tag `v*`.
   В **Environment secrets** добавьте `NATIVE_SDK_READ_TOKEN` со значением токена.
3. Проверьте **Settings → Actions → General**: Actions должны быть разрешены;
   при allowlist разрешите `actions/checkout@v4`, `actions/setup-node@v4`,
   `actions/setup-java@v4`, `android-actions/setup-android@v3`,
   `actions/upload-artifact@v4`, `actions/download-artifact@v4`.
   Права обычного `GITHUB_TOKEN` оставьте read-only; publish job отдельно запрашивает
   `id-token: write`. Нужны также право запускать Actions и доступные hosted runner minutes.

### До публикации: npm и environment для OIDC

1. В RN repository создайте environment **`npm-release`**. Выберите **Selected branches
   and tags** и добавьте только правило **Tag `v*`**. Если тариф поддерживает required
   reviewers, назначьте владельца или release reviewer. При **Prevent self-review**
   запускать и одобрять job должны разные люди. В этом environment npm secret не нужен.
2. Убедитесь, что ваш npm-аккаунт имеет право создавать/публиковать пакет в scope
   **`@pushplatform`** и управлять его настройками; включите 2FA. GitHub-доступ сам по
   себе не даёт npm-права. Если scope принадлежит npm organization, нужен соответствующий
   доступ в этой organization, а после создания пакета — write access к пакету.
3. Публичный registry для `@pushplatform/react-native` на 2026-10-11 вернул **404**.
   Это не подтверждает владение scope и не исключает private package. Проверьте пакет
   под своим npm-аккаунтом. Если его ещё нет и настройки Trusted Publisher недоступны,
   первая публикация потребует отдельного решения владельца и интерактивного npm login/2FA
   из проверенного candidate tarball. Сейчас её не выполнять; `NPM_TOKEN` в GitHub не нужен.
4. Когда пакет существует и готов следующий OIDC-релиз, откройте его npm
   **Settings → Trusted Publisher → GitHub Actions** и задайте:

   | Поле | Значение |
   | --- | --- |
   | Organization or user | `pushplatform` |
   | Repository | `pushpilot-sdk-react-native` |
   | Workflow filename | `release.yml` (только имя файла) |
   | Environment name | `npm-release` |
   | Allowed actions | Разрешить `npm publish` |

   Workflow использует GitHub-hosted runner, Node 22 и npm 11.15.0.
   Создавайте Trusted Publisher перед готовым релизом: новая конфигурация истекает,
   если не выполнена первая успешная публикация в течение двух дней.
   [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

Для private RN repository environments/secrets требуют подходящего GitHub-тарифа;
у организации это Team/Enterprise. Required reviewers в private repository доступны
на Enterprise; на Free/Pro/Team — только в public repository.
Не рассчитывайте на approval gate, если настройки reviewers недоступны.
[Доступность environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

Для автоматической provenance RN repository должен быть публичным и соответствовать
`package.json.repository`. OIDC publishing из private repository возможен, но без
provenance; менять видимость для подготовки candidate не требуется.
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
Для подготовки нового candidate из merged `main`:

```sh
gh workflow run release.yml \
  --repo pushplatform/pushpilot-sdk-react-native \
  --ref main \
  -f publish=false \
  -f dist_tag=next
```

Эквивалентные параметры ручного запуска в Actions: branch `main`, **publish=false**,
dist_tag `next`. Команда выше — инструкция для нового запуска; успешный запуск
владельца уже зафиксирован ниже, повторять его для восстановления состояния не нужно.
Workflow проверит RN tests/plugin/types, соберёт pinned Android SDK, упакует и
проверит архив, установит его во внешний npm consumer и разрешит bundled
AAR через Gradle без Maven Local, затем сохранит artifact `rn-sdk-candidate` на 30 дней.
Artifact включает tarball, `pack.json`, `SHA256SUMS`, native manifest и source commit.
Ни push ветки, ни создание тега не запускают публикацию.

### Успешная проверка — 2026-10-12

По сообщению владельца после исправлений workflow:

- Подготовка без публикации на `main`: **prepare PASS**, **publish Skipped**.
- Успешный prepare включает checkout обоих pinned native SDK, Android release
  build в изолированный staging Maven repository, RN tests/plugin/types, упаковку
  и проверку tarball, внешний npm consumer и разрешение bundled AAR через Gradle,
  а также загрузку artifact `rn-sdk-candidate`.
- Установка Android SDK явно запрашивает `platform-tools`, `platforms;android-34`
  и `build-tools;35.0.0`, без устаревшего пакета `tools` (PR #2).
- Publish job требует ручного запуска, явного `inputs.publish == true` и ref
  `refs/tags/v…`; на `main` весь job пропускается. Точная проверка `vVERSION`
  внутри job сохранена (PR #3).
- Публикация не запускалась. Этот результат подтверждает подготовку candidate
  и пропуск publish job, но не npm permissions, Trusted Publisher или OIDC publish.

Ссылка на run, source SHA и SHA-256 candidate в сообщении не передавались;
отдельная проверка скачанного artifact агентом не выполнялась. Их следует
сохранить из конкретного успешного run перед решением о публикации.
GitHub workflow на Linux не выполняет iOS Pod installation/build;
ранее успешные локальные iOS проверки остаются отдельным подтверждением.

После успешного prepare скачайте `rn-sdk-candidate`, проверьте `SHA256SUMS` и
`source-commit.txt` по SHA выбранного workflow run. Сохранённый локальный candidate
с `source-commit.txt = 8866fbaf8e12ef088f51858530e9584562b73c20` относится к ветке
до merge; не переименовывайте его source identity в SHA `main`.
Уже пройденные локальные проверки для изменений только документации не повторяются.
Проверки release workflow нужны для самого артефакта, собранного на новом runner.

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

После проверки candidate, лицензий, scope ownership и installation resolution,
а также отдельного разрешения на публикацию:

1. Зафиксируйте изменения и создайте `vVERSION`, совпадающий с `package.json.version`.
2. Запустите workflow на этом теге с `publish=true` и нужным `dist_tag`:
   `next` для предварительного распространения, `latest` для общего релиза.
3. Одобрите `npm-release` environment. Publish job повторно проверит архив,
   checksum и source commit и опубликует **тот же tarball**, не перепаковывая его.

Если первая версия опубликована интерактивно для создания пакета, OIDC workflow
не может повторно опубликовать ту же версию. Для следующего реального релиза
обновите `package.json`/lockfile и тег (например, с `1.0.0` на `1.0.1`).
Tagged run заново готовит candidate и публикует архив из **своего** prepare job;
архив из предыдущего запуска на `main` автоматически не переиспользуется.

Подготовка workflow подтверждена владельцем; publish job был пропущен.
Пакет остаётся неопубликованным. Следующий шаг — сохранить candidate из успешного
run и проверить его source identity/checksums; публикация требует отдельного решения.
