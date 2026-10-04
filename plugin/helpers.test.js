const test = require('node:test');
const assert = require('node:assert/strict');
const {
  addIosPodDependency,
  configureAppDelegate,
  ensureAndroidMavenLocalRepository,
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

test('adds the local Maven repository once for native Android SDK resolution', () => {
  const gradle = 'allprojects {\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\n';
  const once = ensureAndroidMavenLocalRepository(gradle);
  const twice = ensureAndroidMavenLocalRepository(once);
  assert.equal(twice, once);
  assert.equal((twice.match(/mavenLocal\(\)/g) || []).length, 1);
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
  const once = addIosPodDependency(podfile, 'git@github.com:pushplatform/pushpilot-sdk-ios.git', 'main');
  const twice = addIosPodDependency(once, 'git@github.com:pushplatform/pushpilot-sdk-ios.git', 'main');
  assert.equal(twice, once);
  assert.equal((twice.match(/PushPlatformSDK/g) || []).length, 1);
});
