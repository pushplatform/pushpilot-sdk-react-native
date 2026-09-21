/**
 * @pushplatform/react-native
 *
 * TypeScript type definitions for Push Platform React Native SDK
 */

/**
 * JSON primitive types for type-safe data payloads
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * JSON value (recursive type)
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

/**
 * JSON object type
 */
export interface JSONObject {
  [key: string]: JSONValue;
}

/**
 * JSON array type
 */
export interface JSONArray extends Array<JSONValue> {}

/**
 * Push Platform configuration
 */
export interface PushPlatformConfig {
  /**
   * API key for backend authentication (handled by native SDK, never exposed to JS)
   */
  apiKey: string;

  /** Backend application UUID required by iOS installation registration. */
  applicationId?: string;

  /**
   * Base URL for backend API
   */
  apiBaseURL: string;

  /**
   * Environment: development or production (optional, defaults to production)
   */
  environment?: 'development' | 'production';

  /**
   * Enable debug logging (optional, default: false)
   */
  debugMode?: boolean;
}

/**
 * Installation representation
 */
export interface Installation {
  /**
   * Unique installation ID (UUID v4)
   */
  installationId: string;

  /**
   * Associated user ID (null if not logged in)
   */
  userId?: string;

  /**
   * Installation creation timestamp
   */
  createdAt: Date;
}

/**
 * Push notification data
 */
export interface PushNotification {
  /**
   * Unique notification ID
   */
  id: string;

  /**
   * Notification title (optional)
   */
  title?: string;

  /**
   * Notification body text (optional)
   */
  body?: string;

  /**
   * Custom data payload (type-safe JSON object)
   */
  data: JSONObject;

  /**
   * Badge count (iOS only, optional)
   */
  badge?: number;

  /**
   * Sound name (optional)
   */
  sound?: string;

  /**
   * Notification category (optional)
   */
  category?: string;

  /**
   * Event ID for universal migration deduplication (optional)
   */
  eventId?: string;

  /**
   * Call ID for VoIP call deduplication (optional)
   */
  callId?: string;

  /**
   * VoIP push marker (iOS only, optional)
   */
  isVoIP?: boolean;
}

/**
 * Notification context (when notification is received or opened)
 */
export interface NotificationContext {
  /**
   * The notification data
   */
  notification: PushNotification;

  /**
   * Whether app was in foreground when notification received
   */
  isForegrounded: boolean;

  /**
   * Action ID if user tapped action button (optional)
   */
  actionId?: string;

  /**
   * Whether notification was opened by user interaction
   */
  userInteraction: boolean;
}

/**
 * Permission status (iOS always determined, Android 13+ runtime)
 */
export type PermissionStatus = 'granted' | 'denied' | 'not-determined';

/**
 * Event subscription handle
 */
export interface Subscription {
  /**
   * Remove this event listener
   */
  remove(): void;
}

/**
 * SDK error
 */
export class SDKError extends Error {
  /**
   * Error code
   */
  code: string;

  /**
   * Error details (optional)
   */
  details?: JSONObject;

  constructor(code: string, message: string, details?: JSONObject) {
    super(message);
    this.name = 'SDKError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Registration update payload (when device token is registered or updated)
 */
export interface RegistrationUpdate {
  /**
   * Installation ID (UUID v4)
   */
  installationId: string;

  /**
   * Platform type (apns or fcm)
   */
  type: 'apns' | 'fcm';

  /**
   * Whether registration succeeded
   */
  success: boolean;

  /**
   * Error message if registration failed
   */
  error?: string;
}

/**
 * SDK error codes
 */
export enum ErrorCode {
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  ALREADY_INITIALIZED = 'ALREADY_INITIALIZED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  UNSUPPORTED_ARCHITECTURE = 'UNSUPPORTED_ARCHITECTURE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
