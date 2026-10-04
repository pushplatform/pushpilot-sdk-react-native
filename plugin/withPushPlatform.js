const {
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
  withPodfile,
  withProjectBuildGradle,
} = require('@expo/config-plugins');
const {
  addGoogleServicesPlugin,
  addIosPodDependency,
  applyGoogleServicesPlugin,
  configureAppDelegate,
  ensureAndroidApplicationId,
  ensureAndroidMavenLocalRepository,
  ensureAndroidPermission,
  ensureApsEntitlement,
  ensureIosApplicationId,
  ensureRemoteNotificationMode,
  validateOptions,
} = require('./helpers');

const packageJson = require('../package.json');

const DEFAULTS = {
  ios: {
    sdkGitUrl: 'git@github.com:pushplatform/pushpilot-sdk-ios.git',
    sdkGitBranch: 'main',
    apsEnvironment: 'development',
    enableBackgroundRemoteNotifications: true,
  },
  android: {
    googleServicesPluginVersion: '4.4.2',
  },
};

function withPushPlatform(config, options = {}) {
  validateOptions(options);
  const iosOptions = { ...DEFAULTS.ios, ...(options.ios || {}) };
  const androidOptions = { ...DEFAULTS.android, ...(options.android || {}) };
  const googleServicesFile = options.android && options.android.googleServicesFile;

  if (googleServicesFile) {
    config.android = config.android || {};
    config.android.googleServicesFile = config.android.googleServicesFile || googleServicesFile;
  }

  config = withAndroidManifest(config, (mod) => {
    ensureAndroidPermission(mod.modResults);
    ensureAndroidApplicationId(mod.modResults, options.applicationId);
    return mod;
  });

  if (googleServicesFile || (config.android && config.android.googleServicesFile)) {
    config = withProjectBuildGradle(config, (mod) => {
      mod.modResults.contents = addGoogleServicesPlugin(
        mod.modResults.contents,
        androidOptions.googleServicesPluginVersion
      );
      return mod;
    });
    config = withAppBuildGradle(config, (mod) => {
      mod.modResults.contents = applyGoogleServicesPlugin(mod.modResults.contents);
      return mod;
    });
  }

  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = ensureAndroidMavenLocalRepository(mod.modResults.contents);
    return mod;
  });

  config = withEntitlementsPlist(config, (mod) => {
    ensureApsEntitlement(mod.modResults, iosOptions.apsEnvironment);
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    ensureIosApplicationId(mod.modResults, options.applicationId);
    ensureRemoteNotificationMode(mod.modResults, iosOptions.enableBackgroundRemoteNotifications);
    return mod;
  });

  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('PushPilot Expo support currently requires the generated Swift AppDelegate. Objective-C AppDelegate projects must forward APNs callbacks to PushPlatform.shared manually.');
    }
    mod.modResults.contents = configureAppDelegate(mod.modResults.contents);
    return mod;
  });

  config = withPodfile(config, (mod) => {
    mod.modResults.contents = addIosPodDependency(
      mod.modResults.contents,
      iosOptions.sdkGitUrl,
      iosOptions.sdkGitBranch
    );
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(withPushPlatform, packageJson.name, packageJson.version);
