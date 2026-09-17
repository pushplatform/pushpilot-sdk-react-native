/**
 * @pushplatform/react-native
 *
 * Main PushPlatform SDK class
 */

import { NativeModule } from './NativeModule';
import { EventEmitter } from './EventEmitter';
import { Logger } from './utils/logger';
import { Validator } from './utils/validation';
import type {
  PushPlatformConfig,
  PermissionStatus,
  Subscription,
  NotificationContext,
  JSONObject,
} from './types';
import { ErrorCode, SDKError } from './types';

/**
 * Push Platform SDK
 *
 * Main entry point for React Native SDK.
 * Wraps native iOS (Swift) and Android (Kotlin) SDKs.
 */
export class PushPlatform {
  private static initialized = false;

  /**
   * Initialize the SDK
   *
   * Must be called once before using any other SDK methods.
   * Delegates to native SDK for actual initialization.
   *
   * @param config - SDK configuration
   * @throws {SDKError} If configuration is invalid or initialization fails
   *
   * @example
   * ```typescript
   * await PushPlatform.initialize({
   *   apiKey: 'your-api-key',
   *   environment: 'production',
   *   debug: false,
   * });
   * ```
   */
  static async initialize(config: PushPlatformConfig): Promise<void> {
    // Validate configuration
    Validator.validateConfig(config);

    // Check if already initialized
    if (PushPlatform.initialized) {
      Logger.warn('SDK already initialized, skipping initialization');
      return;
    }

    // Enable debug logging if requested
    if (config.debug) {
      Logger.enable();
    }

    Logger.debug('Initializing SDK', { environment: config.environment });

    try {
      // Delegate to native SDK
      await NativeModule.initialize({
        apiKey: config.apiKey,
        environment: config.environment,
        debug: config.debug,
        baseURL: config.baseURL,
      });

      PushPlatform.initialized = true;
      Logger.info('SDK initialized successfully');
    } catch (error) {
      Logger.error('SDK initialization failed', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Initialization failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Get installation ID
   *
   * Returns the unique installation ID (UUID v4).
   * Installation ID is stable across app sessions and survives app reinstalls.
   *
   * @returns Installation ID
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * const installationId = await PushPlatform.getInstallationId();
   * console.log('Installation ID:', installationId);
   * ```
   */
  static async getInstallationId(): Promise<string> {
    PushPlatform.ensureInitialized();

    try {
      const installationId = await NativeModule.getInstallationId();
      Logger.debug('Installation ID retrieved', { installationId });
      return installationId;
    } catch (error) {
      Logger.error('Failed to get installation ID', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to get installation ID: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Login user
   *
   * Associates this installation with a user ID.
   * Enables user-targeted push notifications.
   *
   * @param userId - User identifier (max 255 chars)
   * @param userData - Optional user metadata (JSON object)
   * @throws {SDKError} If SDK not initialized or validation fails
   *
   * @example
   * ```typescript
   * await PushPlatform.login('user-123', {
   *   name: 'John Doe',
   *   email: 'john@example.com',
   * });
   * ```
   */
  static async login(userId: string, userData?: JSONObject): Promise<void> {
    PushPlatform.ensureInitialized();
    Validator.validateUserId(userId);
    Validator.validateUserData(userData);

    Logger.debug('Logging in user', { userId });

    try {
      await NativeModule.login(userId, userData);
      Logger.info('User logged in successfully', { userId });
    } catch (error) {
      Logger.error('Login failed', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Login failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Logout user
   *
   * Dissociates this installation from the current user.
   * Installation remains active and can receive broadcast notifications.
   *
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * await PushPlatform.logout();
   * ```
   */
  static async logout(): Promise<void> {
    PushPlatform.ensureInitialized();

    Logger.debug('Logging out user');

    try {
      await NativeModule.logout();
      Logger.info('User logged out successfully');
    } catch (error) {
      Logger.error('Logout failed', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Logout failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Request push notification permissions
   *
   * iOS: Always prompts for permissions.
   * Android: Required for API 33+ (Android 13+), no-op for older versions.
   *
   * @returns true if permission granted, false otherwise
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * const granted = await PushPlatform.requestPermissions();
   * if (granted) {
   *   console.log('Push notifications enabled');
   * } else {
   *   console.log('Push notifications denied');
   * }
   * ```
   */
  static async requestPermissions(): Promise<boolean> {
    PushPlatform.ensureInitialized();

    Logger.debug('Requesting push permissions');

    try {
      const granted = await NativeModule.requestPermissions();
      Logger.info('Permission request completed', { granted });
      return granted;
    } catch (error) {
      Logger.error('Permission request failed', error);
      throw new SDKError(
        ErrorCode.PERMISSION_DENIED,
        `Permission request failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Get current permission status
   *
   * @returns Permission status: 'granted', 'denied', or 'not-determined'
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * const status = await PushPlatform.getPermissionStatus();
   * if (status === 'not-determined') {
   *   await PushPlatform.requestPermissions();
   * }
   * ```
   */
  static async getPermissionStatus(): Promise<PermissionStatus> {
    PushPlatform.ensureInitialized();

    try {
      const status = await NativeModule.getPermissionStatus();
      Logger.debug('Permission status retrieved', { status });
      return status as PermissionStatus;
    } catch (error) {
      Logger.error('Failed to get permission status', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to get permission status: ${String(error)}`,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Add listener for registration updated event
   *
   * Fired when push token registration completes successfully.
   * Note: Token value is NOT exposed to JavaScript (security).
   *
   * @param callback - Callback function (no parameters)
   * @returns Subscription handle to remove listener
   *
   * @example
   * ```typescript
   * const subscription = PushPlatform.onRegistrationUpdated(() => {
   *   console.log('Push registration updated');
   * });
   *
   * // Later: remove listener
   * subscription.remove();
   * ```
   */
  static onRegistrationUpdated(callback: () => void): Subscription {
    PushPlatform.ensureInitialized();
    Logger.debug('Registering onRegistrationUpdated listener');
    return EventEmitter.onRegistrationUpdated(callback);
  }

  /**
   * Add listener for notification received event
   *
   * Fired when notification is received while app is running
   * (foreground or background).
   *
   * @param callback - Callback function with notification context
   * @returns Subscription handle to remove listener
   *
   * @example
   * ```typescript
   * const subscription = PushPlatform.onNotificationReceived((context) => {
   *   console.log('Notification received:', context.notification);
   *   if (context.isForegrounded) {
   *     // Handle foreground notification (show custom UI)
   *   }
   * });
   * ```
   */
  static onNotificationReceived(
    callback: (context: NotificationContext) => void
  ): Subscription {
    PushPlatform.ensureInitialized();
    Logger.debug('Registering onNotificationReceived listener');
    return EventEmitter.onNotificationReceived(callback);
  }

  /**
   * Add listener for notification opened event
   *
   * Fired when user taps on notification (app was terminated or backgrounded).
   *
   * @param callback - Callback function with notification context
   * @returns Subscription handle to remove listener
   *
   * @example
   * ```typescript
   * const subscription = PushPlatform.onNotificationOpened((context) => {
   *   console.log('Notification opened:', context.notification);
   *   // Navigate to specific screen based on notification data
   *   const deepLink = context.notification.data.deeplink;
   *   if (deepLink) {
   *     navigation.navigate(deepLink);
   *   }
   * });
   * ```
   */
  static onNotificationOpened(
    callback: (context: NotificationContext) => void
  ): Subscription {
    PushPlatform.ensureInitialized();
    Logger.debug('Registering onNotificationOpened listener');
    return EventEmitter.onNotificationOpened(callback);
  }

  /**
   * Remove all event listeners
   *
   * Clears all registered event listeners.
   * Useful for cleanup when component unmounts.
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   const sub1 = PushPlatform.onNotificationReceived(handler);
   *   const sub2 = PushPlatform.onNotificationOpened(handler);
   *
   *   return () => {
   *     sub1.remove();
   *     sub2.remove();
   *     // Or remove all at once:
   *     // PushPlatform.removeAllListeners();
   *   };
   * }, []);
   * ```
   */
  static removeAllListeners(): void {
    Logger.debug('Removing all event listeners');
    EventEmitter.removeAllListeners();
  }

  /**
   * Ensure SDK is initialized
   * @private
   */
  private static ensureInitialized(): void {
    if (!PushPlatform.initialized) {
      throw new SDKError(
        ErrorCode.NOT_INITIALIZED,
        'SDK not initialized. Call PushPlatform.initialize() first.'
      );
    }
  }
}
