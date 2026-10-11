import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archiveIndex = process.argv.indexOf('--archive');
let root = repository;
let temporary;
try {
  if (archiveIndex !== -1) {
    const archive = path.resolve(process.argv[archiveIndex + 1]);
    const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
    for (const name of names) {
      assert(name.startsWith('package/') && !name.split('/').includes('..'), `Unsafe archive path: ${name}`);
      assert(!/\/(__tests__|node_modules|\.git|build|\.gradle|Pods)\//.test(name), `Unwanted file: ${name}`);
      assert(!/\.(test|spec)\.[jt]sx?$|\/(\.env[^/]*|google-services\.json)$/.test(name), `Unwanted file: ${name}`);
    }
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'pushpilot-package-'));
    execFileSync('tar', ['-xzf', archive, '-C', temporary]);
    root = path.join(temporary, 'package');
  }
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const packageJson = JSON.parse(read('package.json'));
  const expectedPackage = JSON.parse(fs.readFileSync(path.join(repository, 'package.json')));
  assert.equal(packageJson.name, expectedPackage.name, 'Unexpected npm package name');
  assert.equal(packageJson.version, expectedPackage.version, 'Unexpected npm package version');
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
    assert(!packageJson.scripts?.[hook], `Consumer install must not need a ${hook} hook`);
  }
  const manifest = JSON.parse(read('native/manifest.json'));
  const lock = JSON.parse(fs.readFileSync(path.join(repository, 'release/native-lock.json')));
  for (const platform of ['android', 'ios']) assert.deepEqual(manifest[platform], lock[platform]);
  assert(Object.keys(manifest.sha256).length > 10, 'Native release payload is incomplete');
  for (const [name, checksum] of Object.entries(manifest.sha256)) {
    assert(!path.isAbsolute(name) && !name.split('/').includes('..'), `Unsafe manifest path: ${name}`);
    const contents = fs.readFileSync(path.join(root, 'native', name));
    assert.equal(createHash('sha256').update(contents).digest('hex'), checksum, `Checksum mismatch: ${name}`);
  }
  const prefix = `native/android/maven/${lock.android.group.replaceAll('.', '/')}/${lock.android.artifact}/${lock.android.version}/${lock.android.artifact}-${lock.android.version}`;
  for (const extension of ['aar', 'pom', 'module']) assert(manifest.sha256[`${prefix.slice(7)}.${extension}`], `Missing Android ${extension}`);
  for (const file of ['native/android/LICENSE', 'native/ios/LICENSE', 'native/THIRD_PARTY_NOTICES.md', 'native/licenses/Apache-2.0.txt', 'native/ios/PushPlatformSDK.podspec', 'lib/index.js', 'lib/index.d.ts', 'app.plugin.js', 'react-native.config.js', 'ios/PushPlatformBridge.swift', 'android/src/main/AndroidManifest.xml']) {
    assert(fs.statSync(path.join(root, file)).size > 0, `Missing ${file}`);
  }
  assert(read('android/build.gradle').includes(`com.pushplatform:sdk-android:${lock.android.version}`));
  assert(read('PushPlatform.podspec').includes(`s.dependency "PushPlatformSDK", "${lock.ios.version}"`));
  assert(!read('plugin/withPushPlatform.js').includes('git@github.com'), 'Plugin still defaults to private Git');
  assert(read('plugin/helpers.js').includes("'native/ios'"), 'Plugin does not use the bundled Pod');
  console.error('Release payload verified: pinned sources, native checksums, Maven metadata, licenses and package entry points.');
} finally {
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
