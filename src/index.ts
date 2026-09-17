/**
 * @pushplatform/react-native
 *
 * Main entry point for Push Platform React Native SDK
 */

// Export types
export type {
  JSONPrimitive,
  JSONValue,
  JSONObject,
  JSONArray,
  PushPlatformConfig,
  Installation,
  PushNotification,
  NotificationContext,
  PermissionStatus,
  Subscription,
} from './types';

export { SDKError, ErrorCode } from './types';

// Export main SDK class
export { PushPlatform } from './PushPlatform';

// Re-export as default for convenience
export { PushPlatform as default } from './PushPlatform';
