const path = require('node:path');

const APPLICATION_ID_META_DATA = 'com.pushplatform.application_id';
const ANDROID_SDK_MARKER = '// PushPlatform native SDK composite build';
const POD_MARKER = '# PushPlatform native iOS SDK';

function validateOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('PushPlatform Expo plugin options must be an object.');
  }

  if (options.applicationId !== undefined &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(options.applicationId)) {
    throw new TypeError('applicationId must be a valid PushPilot application UUID.');
  }

  if (options.ios !== undefined && (!options.ios || typeof options.ios !== 'object' || Array.isArray(options.ios))) {
    throw new TypeError('ios plugin options must be an object.');
  }
  if (options.android !== undefined && (!options.android || typeof options.android !== 'object' || Array.isArray(options.android))) {
    throw new TypeError('android plugin options must be an object.');
  }

  const apsEnvironment = options.ios && options.ios.apsEnvironment;
  if (apsEnvironment !== undefined && !['development', 'production'].includes(apsEnvironment)) {
    throw new TypeError('ios.apsEnvironment must be "development" or "production".');
  }

  const sdkGitUrl = options.ios && options.ios.sdkGitUrl;
  if (sdkGitUrl !== undefined && !/^https:\/\/github\.com\/pushplatform\/pushpilot-sdk-ios\.git$|^git@github\.com:pushplatform\/pushpilot-sdk-ios\.git$/.test(sdkGitUrl)) {
    throw new TypeError('ios.sdkGitUrl must point to the official pushplatform/pushpilot-sdk-ios repository.');
  }

  const sdkGitBranch = options.ios && options.ios.sdkGitBranch;
  if (sdkGitBranch !== undefined && (typeof sdkGitBranch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(sdkGitBranch))) {
    throw new TypeError('ios.sdkGitBranch must be a non-empty Git branch name.');
  }

  const sdkPath = options.android && options.android.sdkPath;
  if (sdkPath !== undefined && (typeof sdkPath !== 'string' || sdkPath.trim() === '')) {
    throw new TypeError('android.sdkPath must be a non-empty path to the pushpilot-sdk-android checkout.');
  }

  const googleServicesVersion = options.android && options.android.googleServicesPluginVersion;
  if (googleServicesVersion !== undefined && !/^\d+\.\d+\.\d+$/.test(googleServicesVersion)) {
    throw new TypeError('android.googleServicesPluginVersion must be a semantic version such as "4.4.2".');
  }

  return options;
}

function ensureAndroidPermission(manifest) {
  const root = manifest.manifest || manifest;
  root['uses-permission'] = root['uses-permission'] || [];
  const found = root['uses-permission'].some((permission) =>
    permission.$ && permission.$['android:name'] === 'android.permission.POST_NOTIFICATIONS'
  );
  if (!found) {
    root['uses-permission'].push({ $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } });
  }
  return manifest;
}

function ensureAndroidApplicationId(manifest, applicationId) {
  if (!applicationId) return manifest;
  const root = manifest.manifest || manifest;
  root.application = root.application || [{ $: {} }];
  root.application[0].$ = root.application[0].$ || {};
  root.application[0]['meta-data'] = root.application[0]['meta-data'] || [];
  const metadata = root.application[0]['meta-data'];
  const existing = metadata.find((item) => item.$ && item.$['android:name'] === APPLICATION_ID_META_DATA);
  if (existing) {
    existing.$['android:value'] = existing.$['android:value'] || applicationId;
  } else {
    metadata.push({ $: { 'android:name': APPLICATION_ID_META_DATA, 'android:value': applicationId } });
  }
  return manifest;
}

function ensureIosApplicationId(infoPlist, applicationId) {
  if (applicationId && !infoPlist.PushPlatformApplicationID) {
    infoPlist.PushPlatformApplicationID = applicationId;
  }
  return infoPlist;
}

function ensureApsEntitlement(entitlements, apsEnvironment) {
  if (!entitlements['aps-environment']) {
    entitlements['aps-environment'] = apsEnvironment || 'development';
  }
  return entitlements;
}

function ensureRemoteNotificationMode(infoPlist, enabled = true) {
  if (!enabled) return infoPlist;
  const modes = Array.isArray(infoPlist.UIBackgroundModes) ? infoPlist.UIBackgroundModes : [];
  if (!modes.includes('remote-notification')) {
    infoPlist.UIBackgroundModes = [...modes, 'remote-notification'];
  }
  return infoPlist;
}

function addGoogleServicesPlugin(projectGradle, version = '4.4.2') {
  if (projectGradle.includes('com.google.gms:google-services') ||
      projectGradle.includes('com.google.gms.google-services')) return projectGradle;

  const pluginsBlock = /plugins\s*\{/.exec(projectGradle);
  if (pluginsBlock) {
    const openingBrace = pluginsBlock.index + pluginsBlock[0].lastIndexOf('{');
    return `${projectGradle.slice(0, openingBrace + 1)}\n    id("com.google.gms.google-services") version "${version}" apply false${projectGradle.slice(openingBrace + 1)}`;
  }

  const buildscript = /buildscript\s*\{/.exec(projectGradle);
  if (buildscript) {
    const openingBrace = buildscript.index + buildscript[0].lastIndexOf('{');
    return `${projectGradle.slice(0, openingBrace + 1)}\n    repositories { google(); mavenCentral() }\n    dependencies { classpath("com.google.gms:google-services:${version}") }${projectGradle.slice(openingBrace + 1)}`;
  }

  return `buildscript {\n    repositories { google(); mavenCentral() }\n    dependencies { classpath("com.google.gms:google-services:${version}") }\n}\n${projectGradle}`;
}

function applyGoogleServicesPlugin(appGradle) {
  if (appGradle.includes('com.google.gms.google-services')) return appGradle;
  const pluginsBlock = /plugins\s*\{/.exec(appGradle);
  if (pluginsBlock) {
    const openingBrace = pluginsBlock.index + pluginsBlock[0].lastIndexOf('{');
    return `${appGradle.slice(0, openingBrace + 1)}\n    id("com.google.gms.google-services")${appGradle.slice(openingBrace + 1)}`;
  }
  return `${appGradle.trimEnd()}\n\napply plugin: "com.google.gms.google-services"\n`;
}

function ensureAndroidCompositeBuild(settingsGradle, projectRoot, sdkPath) {
  if (settingsGradle.includes(ANDROID_SDK_MARKER) || settingsGradle.includes('com.pushplatform:sdk-android')) {
    return settingsGradle;
  }
  const androidRoot = path.join(projectRoot, 'android');
  const sdkRoot = path.resolve(projectRoot, sdkPath || '../pushpilot-sdk-android');
  const relativePath = path.relative(androidRoot, sdkRoot).split(path.sep).join('/') || '.';
  const block = [
    ANDROID_SDK_MARKER,
    `includeBuild("${relativePath}") {`,
    '    dependencySubstitution {',
    '        substitute(module("com.pushplatform:sdk-android")).using(project(":sdk"))',
    '    }',
    '}',
  ].join('\n');
  return `${settingsGradle.trimEnd()}\n\n${block}\n`;
}

function addIosPodDependency(podfile, sdkGitUrl, sdkGitBranch) {
  if (podfile.includes("pod 'PushPlatformSDK'") || podfile.includes('pod "PushPlatformSDK"')) return podfile;
  const target = /target\s+(['"][^'"]+['"])\s+do/.exec(podfile);
  if (!target) {
    throw new Error('PushPilot could not find an iOS target block in the generated Podfile. Keep an application target in the Podfile and run prebuild again.');
  }
  const insertionPoint = target.index + target[0].length;
  const pod = `\n  ${POD_MARKER}\n  pod 'PushPlatformSDK', :git => '${sdkGitUrl}', :branch => '${sdkGitBranch}'`;
  return `${podfile.slice(0, insertionPoint)}${pod}${podfile.slice(insertionPoint)}`;
}

function matchingBrace(contents, openingIndex) {
  let depth = 0;
  for (let index = openingIndex; index < contents.length; index += 1) {
    if (contents[index] === '{') depth += 1;
    if (contents[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function addForwardingToMethod(contents, methodNeedle, call, methodDeclaration) {
  const methodIndex = contents.indexOf(methodNeedle);
  if (methodIndex >= 0) {
    if (contents.slice(methodIndex).includes(call)) return contents;
    const openingBrace = contents.indexOf('{', methodIndex);
    const closingBrace = matchingBrace(contents, openingBrace);
    if (openingBrace < 0 || closingBrace < 0) {
      throw new Error(`PushPilot found ${methodNeedle} in AppDelegate.swift but could not safely update its method body.`);
    }
    return `${contents.slice(0, openingBrace + 1)}\n        ${call}${contents.slice(openingBrace + 1)}`;
  }

  const classIndex = contents.indexOf('class AppDelegate');
  const classOpeningBrace = contents.indexOf('{', classIndex);
  const classClosingBrace = matchingBrace(contents, classOpeningBrace);
  if (classIndex < 0 || classOpeningBrace < 0 || classClosingBrace < 0) {
    throw new Error('PushPilot could not find the AppDelegate class in AppDelegate.swift. Add APNs forwarding methods manually or use the standard Expo Swift AppDelegate.');
  }
  return `${contents.slice(0, classClosingBrace)}\n    ${methodDeclaration}\n${contents.slice(classClosingBrace)}`;
}

function configureAppDelegate(contents) {
  if (!contents.includes('import PushPlatformSDK')) {
    const lines = contents.split('\n');
    let lastImport = -1;
    lines.forEach((line, index) => {
      if (/^\s*import\s+/.test(line)) lastImport = index;
    });
    lines.splice(lastImport + 1, 0, 'import PushPlatformSDK');
    lines.splice(lastImport + 2, 0, 'import UserNotifications');
    contents = lines.join('\n');
  }

  contents = addForwardingToMethod(
    contents,
    'didRegisterForRemoteNotificationsWithDeviceToken',
    'PushPlatform.shared.didRegisterAPNsToken(deviceToken)',
    'override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {\n        PushPlatform.shared.didRegisterAPNsToken(deviceToken)\n    }'
  );
  contents = addForwardingToMethod(
    contents,
    'didFinishLaunchingWithOptions',
    'UNUserNotificationCenter.current().delegate = self',
    'override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {\n        UNUserNotificationCenter.current().delegate = self\n        return true\n    }'
  );
  contents = contents.replace(
    /class AppDelegate\s*:\s*([^\{\n]+)/,
    (match, inheritance) => inheritance.includes('UNUserNotificationCenterDelegate')
      ? match
      : `class AppDelegate: ${inheritance.trim()}, UNUserNotificationCenterDelegate`
  );
  contents = addForwardingToMethod(
    contents,
    'userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification',
    'PushPlatform.shared.handleForegroundNotification(notification, completionHandler: completionHandler)',
    'func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {\n        PushPlatform.shared.handleForegroundNotification(notification, completionHandler: completionHandler)\n    }'
  );
  contents = addForwardingToMethod(
    contents,
    'userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse',
    'PushPlatform.shared.handleNotificationResponse(response, completionHandler: completionHandler)',
    'func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {\n        PushPlatform.shared.handleNotificationResponse(response, completionHandler: completionHandler)\n    }'
  );
  contents = addForwardingToMethod(
    contents,
    'didFailToRegisterForRemoteNotificationsWithError',
    'PushPlatform.shared.didFailToRegisterAPNs(error)',
    'override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {\n        PushPlatform.shared.didFailToRegisterAPNs(error)\n    }'
  );
  return contents;
}

module.exports = {
  APPLICATION_ID_META_DATA,
  addGoogleServicesPlugin,
  addIosPodDependency,
  applyGoogleServicesPlugin,
  configureAppDelegate,
  ensureAndroidApplicationId,
  ensureAndroidCompositeBuild,
  ensureAndroidPermission,
  ensureApsEntitlement,
  ensureIosApplicationId,
  ensureRemoteNotificationMode,
  validateOptions,
};
