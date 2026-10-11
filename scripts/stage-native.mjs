import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'release/native-lock.json')));
const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Required: ${name} PATH`);
  return path.resolve(args[index + 1]);
}
const android = argument('--android-repo');
const ios = argument('--ios-repo');
const maven = argument('--maven-repo');
const destination = path.join(root, 'native');
if (fs.existsSync(destination)) throw new Error('native/ already exists. Move it aside before staging a new release.');
function git(repo, ...parameters) {
  return execFileSync('git', ['-C', repo, ...parameters], { encoding: 'utf8' }).trim();
}
for (const [platform, repo] of [['android', android], ['ios', ios]]) {
  if (git(repo, 'rev-parse', 'HEAD') !== lock[platform].commit) throw new Error(`${platform}: checkout does not match native-lock.json`);
  if (git(repo, 'diff', 'HEAD', '--name-only')) throw new Error(`${platform}: tracked changes must be committed before staging`);
}
const coordinate = path.join(...lock.android.group.split('.'), lock.android.artifact, lock.android.version);
const androidSource = path.join(maven, coordinate);
const prefix = `${lock.android.artifact}-${lock.android.version}`;
const module = JSON.parse(fs.readFileSync(path.join(androidSource, `${prefix}.module`)));
if (module.component.group !== lock.android.group || module.component.module !== lock.android.artifact || module.component.version !== lock.android.version) {
  throw new Error('Android Gradle metadata coordinates differ from native-lock.json');
}
const files = new Set([`${prefix}.pom`, `${prefix}.module`]);
for (const variant of module.variants) {
  for (const file of variant.files || []) {
    if (path.basename(file.url) !== file.url) throw new Error(`Unsafe Maven artifact path: ${file.url}`);
    const contents = fs.readFileSync(path.join(androidSource, file.url));
    if (contents.length !== file.size || createHash('sha256').update(contents).digest('hex') !== file.sha256) {
      throw new Error(`Android artifact checksum mismatch: ${file.url}`);
    }
    files.add(file.url);
  }
}
const podspec = fs.readFileSync(path.join(ios, 'PushPlatformSDK.podspec'), 'utf8');
if (podspec.match(/s\.version\s*=\s*['"]([^'"]+)['"]/)?.[1] !== lock.ios.version) throw new Error('iOS Pod version differs from native-lock.json');
// Copy tracked source files only, so credentials, examples and build products never enter npm.
const sources = git(ios, 'ls-files', 'Sources/PushPlatformSDK').split('\n').filter(Boolean);
if (!sources.length) throw new Error('iOS sources are missing');
const licenses = {};
for (const [platform, repo] of [['android', android], ['ios', ios]]) {
  const approved = path.join(root, 'release/licenses', `${platform}.LICENSE`);
  const source = fs.existsSync(approved) ? approved : path.join(repo, 'LICENSE');
  if (!fs.existsSync(source)) throw new Error(`${platform}: missing LICENSE. Supply the owner-approved text in release/licenses/${platform}.LICENSE`);
  licenses[platform] = fs.readFileSync(source);
}
fs.mkdirSync(path.join(destination, 'android/maven', coordinate), { recursive: true });
for (const file of files) fs.copyFileSync(path.join(androidSource, file), path.join(destination, 'android/maven', coordinate, file));
for (const file of [...sources, 'PushPlatformSDK.podspec']) {
  const target = path.join(destination, 'ios', file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(ios, file), target);
}
for (const platform of ['android', 'ios']) fs.writeFileSync(path.join(destination, platform, 'LICENSE'), licenses[platform]);
for (const [platform, repo] of [['android', android], ['ios', ios]]) {
  for (const file of git(repo, 'ls-files').split('\n').filter((name) => /(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:[._-][^/]*)?$/i.test(name))) {
    const target = path.join(destination, platform, 'upstream-notices', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(repo, file), target);
  }
}
fs.copyFileSync(path.join(root, 'release/THIRD_PARTY_NOTICES.md'), path.join(destination, 'THIRD_PARTY_NOTICES.md'));
fs.mkdirSync(path.join(destination, 'licenses'));
fs.copyFileSync(path.join(root, 'release/licenses/Apache-2.0.txt'), path.join(destination, 'licenses/Apache-2.0.txt'));
const sha256 = {};
function hashDirectory(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, item.name);
    if (item.isDirectory()) hashDirectory(name);
    else sha256[path.relative(destination, name).split(path.sep).join('/')] = createHash('sha256').update(fs.readFileSync(name)).digest('hex');
  }
}
hashDirectory(destination);
fs.writeFileSync(path.join(destination, 'manifest.json'), `${JSON.stringify({ ...lock, sha256 }, null, 2)}\n`);
console.log(`Staged ${files.size} Maven files and ${sources.length} iOS sources from pinned native commits.`);
