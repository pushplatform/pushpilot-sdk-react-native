/**
 * @pushplatform/react-native
 *
 * Native module interface for type-safe bridge to native iOS/Android SDKs
 */

import { NativeModules, NativeEventEmitter } from 'react-native';
import type { JSONObject } from './types';

/**
 * Native module interface (type-safe bridge)
 */
export interface PushPlatformNativeModule {
  /**
   * Initialize the SDK with configuration
   */
  initialize(config: {
    apiKey: string;
    applicationId?: string;
    environment: string;
    debugMode?: boolean;
    apiBaseURL?: string;
  }): Promise<void>;

  /**
   * Get installation ID
   */
  getInstallationId(): Promise<string>;

  /**
   * Login user
   */
  login(userId: string, userData?: JSONObject): Promise<void>;

  /**
   * Logout user
   */
  logout(): Promise<void>;

  /**
   * Request push permissions (Android 13+ / iOS)
   */
  requestPermissions(): Promise<boolean>;

  /**
   * Get current permission status
   */
  getPermissionStatus(): Promise<string>;
}

/**
 * Native module instance
 */
const { PushPlatformBridge } = NativeModules;

if (!PushPlatformBridge) {
  throw new Error(
    'PushPlatformBridge native module is not available. ' +
    'Make sure you have run `pod install` (iOS) or synced Gradle (Android) ' +
    'and rebuilt your app.'
  );
}

/**
 * Typed native module
 */
export const NativeModule: PushPlatformNativeModule = PushPlatformBridge;

/**
 * Native event emitter instance
 */
export const NativeEvents = new NativeEventEmitter(PushPlatformBridge);
