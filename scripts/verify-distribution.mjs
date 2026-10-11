import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Required: ${name} PATH`);
  return path.resolve(args[index + 1]);
}
const archive = argument('--archive');
const gradle = argument('--gradle');
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(repository, 'scripts/check-package.mjs'), '--archive', archive], { stdio: 'inherit' });
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'pushpilot-distribution-'));
try {
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'pushpilot-distribution-probe', version: '1.0.0', private: true }));
  // Only install this local tarball; native probes do not need RN/Expo peer packages.
  execFileSync('npm', ['install', '--offline', '--legacy-peer-deps', '--no-audit', '--no-fund', '--package-lock=false', '--cache', path.join(consumer, 'npm-cache'), archive], { cwd: consumer, stdio: 'inherit' });
  const sdk = path.join(consumer, 'node_modules/@pushplatform/react-native');
  const manifest = JSON.parse(fs.readFileSync(path.join(sdk, 'native/manifest.json')));
  const coordinate = `${manifest.android.group}:${manifest.android.artifact}:${manifest.android.version}`;
  const aarName = `${manifest.android.artifact}-${manifest.android.version}.aar`;
  const aarPath = `android/maven/${manifest.android.group.replaceAll('.', '/')}/${manifest.android.artifact}/${manifest.android.version}/${aarName}`;
  const helpers = createRequire(import.meta.url)(path.join(sdk, 'plugin/helpers.js'));
  const android = path.join(consumer, 'android');
  fs.mkdirSync(android);
  fs.writeFileSync(path.join(android, 'settings.gradle'), "rootProject.name = 'pushpilot-distribution-probe'\n");
  let build = `import java.security.MessageDigest
import org.gradle.api.attributes.Usage
import org.gradle.api.attributes.LibraryElements
repositories { google(); mavenCentral() }
configurations {
    sdkProbe {
        transitive = false
        attributes {
            attribute(Usage.USAGE_ATTRIBUTE, objects.named(Usage, Usage.JAVA_RUNTIME))
            attribute(LibraryElements.LIBRARY_ELEMENTS_ATTRIBUTE, objects.named(LibraryElements, 'aar'))
        }
    }
}
dependencies { sdkProbe '${coordinate}' }
tasks.register('verifyBundledSDK') {
    doLast {
        def aar = configurations.sdkProbe.singleFile
        assert aar.name == '${aarName}'
        assert MessageDigest.getInstance('SHA-256').digest(aar.bytes).encodeHex().toString() == '${manifest.sha256[aarPath]}'
        assert aar.canonicalPath.startsWith(new File(rootDir, '../node_modules/@pushplatform/react-native/native/android/maven').canonicalPath)
        println 'Resolved bundled SDK: ' + aar
    }
}
`;
  build = helpers.ensureAndroidMavenRepository(build, path.relative(android, path.join(sdk, 'native/android/maven')));
  if (build.includes('mavenLocal()')) throw new Error('Maven Local leaked into the consumer build');
  fs.writeFileSync(path.join(android, 'build.gradle'), build);
  const gradleArguments = ['--project-dir', android, '--no-daemon', '--console=plain', 'verifyBundledSDK'];
  if (args.includes('--offline')) gradleArguments.push('--offline');
  execFileSync(gradle, gradleArguments, { stdio: 'inherit' });
  if (args.includes('--ios')) {
    const ios = path.join(consumer, 'ios');
    fs.mkdirSync(ios);
    const podfile = helpers.addIosPodDependency("platform :ios, '13.0'\ninstall! 'cocoapods', :integrate_targets => false\ntarget 'DistributionProbe' do\nend\n");
    if (/:git|:branch/.test(podfile)) throw new Error('Private Git leaked into the consumer Podfile');
    fs.writeFileSync(path.join(ios, 'Podfile'), podfile);
    execFileSync('pod', ['install', '--no-repo-update'], { cwd: ios, stdio: 'inherit' });
    if (!fs.readFileSync(path.join(ios, 'Podfile.lock'), 'utf8').includes('native/ios')) throw new Error('Pod did not resolve from bundled sources');
  }
  console.log('Distribution consumer probes passed without private Git or Maven Local.');
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
