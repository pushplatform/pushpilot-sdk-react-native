# Выпуск SDK 2.0.2

Версия пакета должна совпадать в его manifest и lockfile. Версии нативных SDK должны совпадать с release/native-lock.json и нативными зависимостями моста.
Инструкции установки и настройки приложения находятся в README.md;
изменения интеграции звонков — в docs/MIGRATION_2.md.

1. Согласуйте package.json, package-lock.json, Podspec, Gradle и release/native-lock.json: версия пакета 2.0.2; версии native SDK — из release/native-lock.json.
2. В native-lock.json зафиксируйте точные коммиты нативных SDK 2.0.1.
3. Выполните typecheck, JavaScript/Expo/publication tests и нативные consumer builds.
4. Сформируйте native/ командой `npm run release:stage` с нативными исходниками и Maven-артефактами из зафиксированных коммитов.
5. Перед npm-публикацией `npm run release:verify-ios` проверяет публичный iOS-тег и его соответствие native-lock.json; `npm run release:check` проверяет содержимое npm-пакета.
6. Workflow `Prepare / publish React Native SDK` публикует пакет только при ручном запуске с `publish: true` и git-тегом версии. Обычный push публикацию не запускает.

CI сборки проверяет исходники точного native commit через `--source`. Это позволяет проверить PR до создания релизного тега. Проверка публичного тега перед публикацией остаётся обязательной.
