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
    applicationId: string;
    url?: string;
    apiBaseURL?: string;
    apiKey?: string;
    environment?: string;
    debugMode?: boolean;
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

const unavailableError = new Error(
  'PushPlatformBridge native module is not available. Expo Go is unsupported. ' +
  'Install the native dependencies, run `npx expo prebuild`, and rebuild the development app.'
);

const unavailableNativeModule: PushPlatformNativeModule = {
  initialize: () => Promise.reject(unavailableError),
  getInstallationId: () => Promise.reject(unavailableError),
  login: () => Promise.reject(unavailableError),
  logout: () => Promise.reject(unavailableError),
  requestPermissions: () => Promise.reject(unavailableError),
  getPermissionStatus: () => Promise.reject(unavailableError),
};

/**
 * Typed native module
 */
export const NativeModule: PushPlatformNativeModule = PushPlatformBridge || unavailableNativeModule;

/**
 * Native event emitter instance
 */
export const NativeEvents = PushPlatformBridge
  ? new NativeEventEmitter(PushPlatformBridge)
  : {
      addListener: () => ({ remove: () => undefined }),
      removeAllListeners: () => undefined,
    } as unknown as NativeEventEmitter;
