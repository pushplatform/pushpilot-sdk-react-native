const test = require('node:test');
const assert = require('node:assert/strict');
const {
  addIosPodDependency,
  configureAppDelegate,
  ensureAndroidMavenRepository,
  ensureAndroidPermission,
  ensureApsEntitlement,
  validateOptions,
} = require('./helpers');

test('validates the application UUID and rejects invalid options', () => {
  assert.doesNotThrow(() => validateOptions({
    applicationId: '00000000-0000-4000-8000-000000000000',
  }));
  assert.throws(() => validateOptions({ applicationId: 'com.example.app' }), /applicationId/);
  assert.throws(() => validateOptions({ ios: { apsEnvironment: 'sandbox' } }), /apsEnvironment/);
});

test('adds the bundled Maven repository once, even if the app uses Maven Local', () => {
  const gradle = 'allprojects {\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\n';
  const once = ensureAndroidMavenRepository(gradle, '../node_modules/@pushplatform/react-native/native/android/maven');
  const twice = ensureAndroidMavenRepository(once, '../node_modules/@pushplatform/react-native/native/android/maven');
  assert.equal(twice, once);
  assert.doesNotMatch(twice, /mavenLocal/);
  assert.match(twice, /includeModule\('com.pushplatform', 'sdk-android'\)/);
  assert.match(ensureAndroidMavenRepository(gradle.replace('google()', 'mavenLocal()'), '../native'), /bundled native SDK/);
});

test('migrates previous generated private Git and Maven Local entries', () => {
  const oldGradle = 'allprojects { repositories {\n// PushPlatform native SDK local Maven repository\nmavenLocal()\n} }';
  const updated = ensureAndroidMavenRepository(oldGradle, '../native/android/maven');
  assert.doesNotMatch(updated, /mavenLocal/);
  assert.equal(ensureAndroidMavenRepository(updated, '../native/android/maven'), updated);
  const oldPod = "target 'App' do\n  # PushPlatform native iOS SDK\n  pod 'PushPlatformSDK', :git => 'git@github.com:pushplatform/pushpilot-sdk-ios.git', :branch => 'main'\nend";
  const updatedPod = addIosPodDependency(oldPod);
  assert.doesNotMatch(updatedPod, /:git|:branch/);
  assert.match(updatedPod, /require.resolve/);
  assert.equal(addIosPodDependency(updatedPod), updatedPod);
  assert.throws(() => validateOptions({ ios: { sdkGitBranch: 'main' } }), /no longer used/);
});

test('generates public notification delegate methods for Expo AppDelegate', () => {
  const appDelegate = `import Expo\n\npublic class AppDelegate: ExpoAppDelegate {\n    public override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {\n        return true\n    }\n}`;
  const configured = configureAppDelegate(appDelegate);

  assert.match(configured, /public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate/);
  assert.match(configured, /public override func application\(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken/);
  assert.match(configured, /public override func application\(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError/);
  assert.match(configured, /public func userNotificationCenter\(_ center: UNUserNotificationCenter, willPresent/);
  assert.match(configured, /public func userNotificationCenter\(_ center: UNUserNotificationCenter, didReceive/);
});

test('native config mutations are idempotent and preserve existing values', () => {
  const manifest = { manifest: { 'uses-permission': [] } };
  ensureAndroidPermission(manifest);
  ensureAndroidPermission(manifest);
  assert.equal(manifest.manifest['uses-permission'].length, 1);

  const entitlements = { 'aps-environment': 'production' };
  ensureApsEntitlement(entitlements, 'development');
  assert.equal(entitlements['aps-environment'], 'production');

  const podfile = "target 'App' do\nend\n";
  const once = addIosPodDependency(podfile);
  const twice = addIosPodDependency(once);
  assert.equal(twice, once);
  assert.equal((twice.match(/PushPlatformSDK/g) || []).length, 1);
  assert.match(twice, /:path/);
});
