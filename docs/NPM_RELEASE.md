# Release 1.1.0 — unified application integration (2026-11-01)

**Published and anonymously verified:** `@pushplatform/react-native@1.1.0`; npm `latest` points to 1.1.0.

```sh
npm install @pushplatform/react-native@1.1.0
```

One application ID/key is shared by iOS/Android/Web and server integration. Native Android/iOS SDK 1.1.0 payload is bundled; no customer project/environment selection is required. The key is deliberately extractable and grants device registration/read and message send/history access only inside its application. Expo Go is unsupported; rebuild the native app/development build after updating. See [installation](INSTALLATION.md).

Source: merged PR #9, release tag `v1.1.0`, commit `ef93dc72787c6fe1bcf5109c14455cda22e5d49e`. Previously checked candidate `/tmp/pushplatform-react-native-1.1.0.tgz` was published with `--ignore-scripts` after npm login/browser confirmation. All 70 archived files matched the merged source/build output before publication, including native checksums. Public registry archive is byte-for-byte identical; SHA-1/SHA-512 integrity matches. SHA-256: `61a796c37a72d67c1045da94ac6f2830fb8f96f1c80acb9b454605afc6e5dc80`.

The duplicate trusted-publishing workflow run 41302802599 was cancelled before publication once local login succeeded. It did not publish anything; OIDC publishing is not claimed as verified. Previously passed tests/builds were not repeated for publication. No real APNs/FCM notification was sent.

Companion Flutter `push_platform_flutter` 1.1.1 is already published on pub.dev with native Android/iOS 1.1.0. Its PR #4 and RN PR #9 are merged.

---

# Patch 1.0.2 — initial Android FCM registration

Source branch: `release/rn-fcm-1.0.2`. Published 1.0.1 bundled Android SDK 1.0.0, so Android/Expo clients inherited its missing current-token lookup. This patch bundles Android 1.0.1 from the pinned source commit in `release/native-lock.json`. iOS commit, sources and bridge APIs remain unchanged.

The native fix passed 16 targeted Robolectric/MockWebServer tests, including a red test against old 1.0.0 and green assertions on actual token HTTP payloads/scopes/events. No console/owner E2E or physical push is repeated. Release checks verify bundled AAR SHA-256, sources, manifest, Maven resolution and archive contents.

The existing tagged release workflow 41195924644 prepared and verified the candidate successfully. Its OIDC publish step returned `ENEEDAUTH`. After the owner restored local npm login and completed npm's browser authentication, the **same CI archive** was published with `--ignore-scripts`, without rebuilding or repacking. No credentials were added to source or workflow settings.

**Publication complete:** `@pushplatform/react-native@1.0.2` is publicly available from npm. `latest` and the existing `next` channel point to 1.0.2. The public tarball is byte-for-byte identical to the verified CI candidate; registry sha1/sha512 integrity matches. SHA-256: `e9ff52a7716e9fcca413b6db708b28f9cccbcb88a7b06f67c695476591bb71d8`. It contains 68 files. All bundled iOS files are unchanged. The bundled Android AAR matches the public Maven 1.0.1 AAR exactly.

Source release tag `v1.0.2` points to `d6ca7a3c1195b61a5f1db35a299a1d042010d2e3`. Candidate: `/tmp/pushpilot-rn-fcm-ci-candidate/pushplatform-react-native-1.0.2.tgz`. The public registry briefly returned 404 while processing the accepted publish, then exposed the version and archive; publication was not repeated. No tests or builds were repeated after authentication was restored.

Install: `npm install @pushplatform/react-native@1.0.2`, then rebuild the native app/Expo development build. No token-registration API workaround is required. Physical Firebase delivery was not exercised; the native HTTP registration path and package distribution were verified as described above.

Companions: Android PR https://github.com/pushplatform/pushpilot-sdk-android/pull/2 ; Flutter PR https://github.com/pushplatform/pushpilot-sdk-flutter/pull/3 .

---
Historical release report follows.

# Первый публичный npm-релиз RN / Expo SDK

Статус на 2026-10-12: **PUBLISHED / NPM INSTALL VERIFIED**.

| Поле | Значение |
| --- | --- |
| Пакет | `@pushplatform/react-native` |
| Версия | `1.0.0` |
| npm | [Страница версии 1.0.0](https://www.npmjs.com/package/@pushplatform/react-native/v/1.0.0) |
| Публикация по registry | `2026-10-12T07:08:32.294Z` |
| Dist-tags при проверке | `next → 1.0.0`, `latest → 1.0.0` |
| Source commit candidate | `ad1edc19cc050e29176253b2afcf140bfb4e1fff` |
| SHA-256 tarball | `f19b994eea143f6262271545777fd2a7e72b80baab6c3591dcc96b6a7cfd3202` |

Первый publish выполнен владельцем интерактивно с 2FA из tarball artifact
`rn-sdk-candidate`, без повторной сборки или перепаковки. Registry integrity
совпадает с `pack.json` проверенного candidate. GitHub OIDC publish job этим
выпуском не проверен. Теги зафиксированы по фактическим данным registry;
при проверке установки они не менялись.

## Установка

```sh
npm install @pushplatform/react-native@1.0.0
```

По тегу: `npm install @pushplatform/react-native@next`.
Expo и bare RN требуют native setup из [INSTALLATION.md](INSTALLATION.md).
Android AAR/Maven metadata и iOS Pod sources включены в пакет; приватный
Git-доступ и ручной Maven Local пользователю не нужны.

## Проверка установки из публичного npm

После появления версии в registry выполнена **одна успешная установка** в новый
пустой проект `/tmp/pushpilot-npm-installed-release.Jyt62L` с Node `22.22.1`
и npm `11.16.0`. Использованы пустые user/global npm configs, отдельный пустой
cache и отключены переменные `NODE_AUTH_TOKEN` / `NPM_TOKEN`.
Установка выполнялась без `--ignore-scripts` и без `--legacy-peer-deps`;
авторизация npm, локальный tarball и private repositories не использовались.

- `npm install @pushplatform/react-native@1.0.0` из `https://registry.npmjs.org/`
  завершился с кодом `0`, добавлены 222 пакета. Автоматически установлены peers
  React `19.3.0` и React Native `0.87.1`; это проверка установки, не компиляции этой связки.
- Lockfile разрешил SDK из публичного URL
  `https://registry.npmjs.org/@pushplatform/react-native/-/react-native-1.0.0.tgz`;
  integrity совпал с registry и candidate.
- Версия, JS entry point, types, Expo plugin, RN bridges, bundled AAR и local
  Pod присутствуют. Все 27 native файлов прошли проверку SHA-256 по manifest.
- До появления версии в ответе registry предыдущая попытка установки получила `E404`.
  После повторного подтверждения владельца и ответа registry `200` сделана
  только указанная успешная установка; повторных успешных установок не было.

## Известные ограничения

- Expo Go не поддерживается. Ранее проверенная Expo-связка — SDK 54 / RN 0.81.4;
  установка из npm не является новой проверкой prebuild, Android/iOS builds или EAS.
- Bare RN требует local Pod/bundled Maven configuration, iOS capabilities/callbacks
  и Firebase config по инструкции установки.
- Реальная доставка APNs/FCM **не проверена**. Нужны app credentials,
  настоящий `google-services.json` и iOS device/signing для APNs.
- Background/silent push зависит от ОС и payload; VoIP/PushKit/CallKit остаётся
  отдельной native интеграцией.
- OIDC Trusted Publisher/provenance не проверены первым интерактивным выпуском.
  GitHub-репозитории, backend и console не делались публичными; deploy не выполнялся.
- Tarball `1.0.0` неизменяем и содержит предрелизные формулировки README/INSTALLATION.
  Эти изменения документации в repository не изменяют уже опубликованный архив.

Повторные тесты SDK, Expo prebuild, native builds и проверка push не запускались.

## Пользовательская документация: patch 1.0.1

README и публикуемая INSTALLATION.md приведены к пользовательским инструкциям
PushPilot на русском. Из публичного вступления удалены статусы candidate,
история архивов и подготовка checkout; ограничения установки и платформ оставлены
в соответствующих разделах. Default import в примере назван PushPilot;
экспорты и код SDK не изменены. Description npm-пакета обновлён.

Подготовлена версия `1.0.1` для обновления npm README/description; package.json
и корневой lockfile согласованы, registry подтвердил отсутствие этой версии.
Для обновления README требуется новый publish:
[правило npm](https://docs.npmjs.com/about-package-readme-files/#updating-an-existing-package-readmemd-file).

Исполняемый payload переиспользуется из ранее проверенного npm consumer
`/private/tmp/pushpilot-npm-installed-release.Jyt62L`: lib и native 1.0.0.
Source/plugin/bridge/podspec/native-lock исходники совпадают с release source
`ad1edc1`. Архив `dist/pushplatform-react-native-1.0.1.tgz` упаковывается без
scripts; JS, native, plugin и bridges остаются побайтно прежними. Native manifest
и версии native SDK не меняются. Сборки, установка и уже пройденные тесты
не повторяются. Новая версия не опубликована, старый npm архив неизменяем.

Команда владельцу после ревью/merge документации:

```sh
npm publish /private/tmp/pushpilot-rn-public-readme/dist/pushplatform-react-native-1.0.1.tgz --ignore-scripts --access public --tag next --registry=https://registry.npmjs.org
```

При запросе 2FA добавить `--otp=YOUR_2FA_CODE`. Это документационный patch;
реальная APNs/FCM доставка не заявляется проверенной. Deploy, release workflow
и push-доставка не запускались.
