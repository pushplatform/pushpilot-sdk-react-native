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
