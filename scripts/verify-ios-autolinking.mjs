import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1]; };
const archiveOption = option('--archive');
const fixtureName = option('--fixture');
assert(!fixtureName || fixtureName === 'rn083-firebase-nitro', 'Unknown iOS fixture');
const fixture = fixtureName ? JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/ios', fixtureName + '.json'))) : null;
const linkage = option('--linkage') || 'default';
assert(['default', 'static'].includes(linkage), 'Unsupported framework linkage');
const upgradeFrom = option('--upgrade-from');
const resumeAfterBaseline = args.includes('--resume-after-baseline');
assert(!upgradeFrom || /^\d+\.\d+\.\d+$/.test(upgradeFrom), 'Invalid baseline release');
let candidateArchive = archiveOption && path.resolve(archiveOption);
const index = args.indexOf('--consumer');
const supplied = index >= 0 ? fs.realpathSync(args[index + 1]) : null;
assert(!resumeAfterBaseline || supplied && upgradeFrom, 'Resume requires the controlled baseline consumer and version');
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
  if (!candidateArchive) {
    const pack = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], { cwd: root, encoding: 'utf8' }))[0];
    candidateArchive = path.join(consumer, pack.filename);
  }
  const archive = candidateArchive;
  const packageJson = {
    name: templatePackage.name, private: true, version: '0.0.1',
    dependencies: { ...(fixture?.dependencies || templatePackage.dependencies), '@pushplatform/react-native': upgradeFrom || `file:${archive}` },
    devDependencies: fixture?.devDependencies || Object.fromEntries(Object.entries(templatePackage.devDependencies).filter(([name]) => name.startsWith('@react-native-community/cli'))),
  };
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify(packageJson, null, 2));
  if (fixture) {
    const podfilePath = path.join(consumer, 'ios/Podfile');
    fs.writeFileSync(podfilePath, "ENV['RCT_NEW_ARCH_ENABLED'] = '1'\n$RNFirebaseAsStaticFramework = true\n" + fs.readFileSync(podfilePath, 'utf8').replace("  config = use_native_modules!", "  config = use_native_modules!\n  pod 'GoogleUtilities', :modular_headers => true"));
  }
  run('npm', ['install', '--no-audit', '--no-fund'], consumer);
}
const installed = path.join(consumer, 'node_modules/@pushplatform/react-native');
const ios = path.join(consumer, 'ios');
const podfile = fs.readFileSync(path.join(ios, 'Podfile'), 'utf8');
assert(podfile.includes('use_native_modules!'), 'Probe must use actual RN autolinking');
assert(!/pod\s+['"]PushPlatformSDK['"]/.test(podfile), 'Explicit native SDK dependency would hide the bare autolinking defect');
if (!resumeAfterBaseline) assert(!fs.existsSync(path.join(ios, 'Podfile.lock')), 'Probe must start without an existing lockfile');
else {
  const baseline = fs.readFileSync(path.join(consumer, 'baseline-Podfile.lock'), 'utf8');
  assert(baseline.includes(`PushPlatform (${upgradeFrom})`), 'Wrong migration baseline');
  assert.equal(fs.readFileSync(path.join(ios, 'Podfile.lock'), 'utf8'), baseline, 'Baseline lockfile changed before migration');
}
const podEnv = { ...process.env,
  CP_HOME_DIR: path.join(consumer, '.cocoapods'), CP_CACHE_DIR: path.join(consumer, '.pod-cache'),
  COCOAPODS_DISABLE_STATS: 'true', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0',
};
if (linkage === 'static') podEnv.USE_FRAMEWORKS = 'static';
else delete podEnv.USE_FRAMEWORKS;
const installPods = () => run('pod', ['install', '--repo-update'], ios, podEnv);
if (upgradeFrom && !resumeAfterBaseline) {
  installPods();
  const baseline = fs.readFileSync(path.join(ios, 'Podfile.lock'), 'utf8');
  assert(baseline.includes(`PushPlatform (${upgradeFrom})`), 'Baseline package was not installed');
  fs.copyFileSync(path.join(ios, 'Podfile.lock'), path.join(consumer, 'baseline-Podfile.lock'));
  run('npm', ['install', '--no-audit', '--no-fund', candidateArchive], consumer);
}
assert.equal(JSON.parse(fs.readFileSync(path.join(installed, 'package.json'))).version, sourcePackage.version);
assert(!fs.readFileSync(path.join(installed, 'PushPlatform.podspec'), 'utf8').includes('vendored_frameworks'), 'Installation contract changed to a binary framework');
const installedPackage = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
const evaluatedSpec = JSON.parse(execFileSync('pod', ['ipc', 'spec', path.join(installed, 'PushPlatform.podspec')], { encoding: 'utf8' }));
const lockedIos = JSON.parse(fs.readFileSync(path.join(root, 'release/native-lock.json'))).ios;
assert.equal(evaluatedSpec.version, installedPackage.version, 'Pod/npm package versions differ');
assert.equal(evaluatedSpec.source.tag, `v${installedPackage.version}`, 'Podspec references the wrong source release tag');
const nativeRequirement = evaluatedSpec.dependencies[lockedIos.pod];
assert.equal(nativeRequirement?.length, 1, 'Expected a single exact native requirement');
assert.equal(nativeRequirement[0].replace(/^=\s*/, ''), lockedIos.version, 'Evaluated native dependency differs from the source lock');

installPods();
if (args.includes('--reinstall')) {
  run('npm', ['uninstall', '--no-audit', '--no-fund', '@pushplatform/react-native'], consumer);
  run('npm', ['install', '--no-audit', '--no-fund', candidateArchive], consumer);
  installPods();
}
const lock = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load_file(ARGV[0]))', path.join(ios, 'Podfile.lock')], { encoding: 'utf8' }));
const native = JSON.parse(fs.readFileSync(path.join(root, 'release/native-lock.json'))).ios;
assert(lock.PODS.some(pod => pod === `${native.pod} (${native.version})`), 'Locked native pod version differs from the release');
assert(!lock['EXTERNAL SOURCES']?.[native.pod], 'Native dependency must resolve publicly, not through a local or private override');
assert(Object.entries(lock['SPEC REPOS']).some(([repo, pods]) => (repo === 'trunk' || repo === 'https://cdn.cocoapods.org/') && pods.includes(native.pod)), 'Native dependency is absent from public trunk');
assert(fs.existsSync(path.join(ios, 'Pods', native.pod, 'Sources/PushPlatformSDK/Core/DeviceMetadata.swift')), 'New native source was not downloaded');
if (fixture) {
  for (const [name, expected] of Object.entries(fixture.dependencies))
    assert.equal(JSON.parse(fs.readFileSync(path.join(consumer, 'node_modules', name, 'package.json'))).version, expected, `Unexpected fixture version for ${name}`);
  for (const name of ['RNFBApp', 'RNFBMessaging', 'VisionCamera', 'NitroModules'])
    assert(lock.PODS.some(pod => (typeof pod === 'string' ? pod : Object.keys(pod)[0]).startsWith(`${name} (`)), `Missing real fixture pod ${name}`);
}
console.log(`Bare RN autolinking passed: PushPlatform ${sourcePackage.version} → public ${native.pod} ${native.version}; linkage=${linkage}; fixture=${fixtureName || 'baseline'}.`);
if (args.includes('--build')) {
  run('xcodebuild', ['-workspace', 'PushPlatformTestApp.xcworkspace', '-scheme', 'PushPlatformTestApp', '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', path.join(consumer, 'DerivedData'), '-jobs', '2', 'CODE_SIGNING_ALLOWED=NO', 'build'], ios, podEnv);
}
console.log(`Retained probe for inspection/build: ${consumer}`);
