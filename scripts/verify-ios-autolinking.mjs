import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const index = args.indexOf('--consumer');
const supplied = index >= 0 ? fs.realpathSync(args[index + 1]) : null;
if (supplied) {
  assert(supplied.startsWith(fs.realpathSync(os.tmpdir()) + path.sep), 'Existing probe must be inside the temporary directory');
  assert(path.basename(supplied).startsWith('pushpilot-rn-cocoapods-regression-'), 'Only a controlled regression probe can be reused');
}
const consumer = supplied || fs.mkdtempSync(path.join(os.tmpdir(), 'pushpilot-rn-cocoapods-regression-'));
console.log(`Isolated iOS autolinking consumer: ${consumer}`);
const run = (program, params, cwd, env = process.env) => execFileSync(program, params, { cwd, env, stdio: 'inherit' });
const sourcePackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
if (!supplied) {
  const template = path.join(root, 'TestApp/PushPlatformTestApp');
  fs.cpSync(path.join(template, 'ios'), path.join(consumer, 'ios'), {
    recursive: true,
    filter: file => !['Pods', 'build', 'Podfile.lock', 'xcuserdata', '.xcode.env.local'].includes(path.basename(file)) && !file.endsWith('.xcworkspace'),
  });
  const templatePackage = JSON.parse(fs.readFileSync(path.join(template, 'package.json')));
  const pack = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], { cwd: root, encoding: 'utf8' }))[0];
  const archive = path.join(consumer, pack.filename);
  const packageJson = {
    name: templatePackage.name, private: true, version: '0.0.1',
    dependencies: { ...templatePackage.dependencies, '@pushplatform/react-native': `file:${archive}` },
    devDependencies: Object.fromEntries(Object.entries(templatePackage.devDependencies).filter(([name]) => name.startsWith('@react-native-community/cli'))),
  };
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify(packageJson, null, 2));
  run('npm', ['install', '--no-audit', '--no-fund'], consumer);
}
const installed = path.join(consumer, 'node_modules/@pushplatform/react-native');
assert.equal(JSON.parse(fs.readFileSync(path.join(installed, 'package.json'))).version, sourcePackage.version);
const ios = path.join(consumer, 'ios');
const podfile = fs.readFileSync(path.join(ios, 'Podfile'), 'utf8');
assert(podfile.includes('use_native_modules!'), 'Probe must use actual RN autolinking');
assert(!/pod\s+['"]PushPlatformSDK['"]/.test(podfile), 'Explicit native SDK dependency would hide the bare autolinking defect');
assert(!fs.existsSync(path.join(ios, 'Podfile.lock')), 'Probe must start without an existing lockfile');
run('pod', ['install', '--repo-update'], ios, {
  ...process.env,
  CP_HOME_DIR: path.join(consumer, '.cocoapods'), CP_CACHE_DIR: path.join(consumer, '.pod-cache'),
  COCOAPODS_DISABLE_STATS: 'true', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0',
});
const lock = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load_file(ARGV[0]))', path.join(ios, 'Podfile.lock')], { encoding: 'utf8' }));
const native = JSON.parse(fs.readFileSync(path.join(root, 'release/native-lock.json'))).ios;
assert(lock.PODS.some(pod => pod === `${native.pod} (${native.version})`), 'Locked native pod version differs from the release');
assert(!lock['EXTERNAL SOURCES']?.[native.pod], 'Native dependency must resolve publicly, not through a local or private override');
assert(Object.entries(lock['SPEC REPOS']).some(([repo, pods]) => (repo === 'trunk' || repo === 'https://cdn.cocoapods.org/') && pods.includes(native.pod)), 'Native dependency is absent from public trunk');
assert(fs.existsSync(path.join(ios, 'Pods', native.pod, 'Sources/PushPlatformSDK/Core/DeviceMetadata.swift')), 'Actual native source was not downloaded');
console.log(`Bare RN autolinking passed: PushPlatform ${sourcePackage.version} → public ${native.pod} ${native.version}, no local Podfile dependency.`);
console.log(`Retained probe for inspection/build: ${consumer}`);
