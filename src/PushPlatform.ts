/**
 * @pushplatform/react-native
 *
 * Main PushPlatform SDK class
 */

import { NativeModule } from './NativeModule';
import { EventEmitter } from './EventEmitter';
import { Logger } from './utils/logger';
import { validateConfig, validateUserId } from './utils/validation';
import type {
  PushPlatformConfig,
  PermissionStatus,
  Subscription,
  NotificationContext,
  NotificationWillDisplayEvent,
  RegistrationUpdate,
  JSONObject,
} from './types';
import { ErrorCode, SDKError } from './types';

/**
 * Push Platform SDK
 *
 * Main entry point for React Native SDK.
 * Wraps native iOS (Swift) and Android (Kotlin) SDKs.
 *
 * **Requirements:**
 * - React Native >= 0.77
 * - New Architecture (TurboModules) enabled
 * - iOS 13.0+
 * - Android API 26+
 */
export class PushPlatform {
  // @ts-expect-error - instance tracking for singleton pattern verification in tests
  private static _instance: PushPlatform | null = null;
  private static initialized = false;
  private static initializing: Promise<void> | null = null;
  private static configurationScope: string | null = null;

  /**
   * Initialize the SDK
   *
   * Must be called before using any other SDK methods.
   * Concurrent calls share initialization. Changing application, server or environment requires a new process.
   * Delegates to native SDK for actual initialization.
   *
   * @param config - SDK configuration
   * @throws {SDKError} If configuration is invalid or initialization fails
   *
   * @example
   * ```typescript
   * await PushPlatform.initialize('00000000-0000-4000-8000-000000000000');
   * await PushPlatform.initialize({
   *   applicationId: '00000000-0000-4000-8000-000000000000',
   *   url: 'https://api.your-domain.example',
   * });
   * ```
   */
  static async initialize(input: string | PushPlatformConfig): Promise<void> {
    const config: PushPlatformConfig = typeof input === 'string' ? { applicationId: input } : input;

    validateConfig(config);

    const scope = JSON.stringify([config.applicationId.toLowerCase(),
      (config.url || NativeModule.serverURL || 'https://api.pushpilot.ru').replace(/\/+$/, ''),
      config.environment || null]);
    if (PushPlatform.initialized || PushPlatform.initializing) {
      if (scope !== PushPlatform.configurationScope) {
        throw new SDKError(ErrorCode.INVALID_CONFIG, 'SDK is already configured for another application, server or environment');
      }
      return PushPlatform.initializing ?? undefined;
    }
    PushPlatform.configurationScope = scope;

    // Enable debug logging if requested
    if (config.debugMode) {
      Logger.enable();
    }

    Logger.debug('Initializing SDK', { environment: config.environment });

    const initialize = async (): Promise<void> => {
    try {
      // Normalize config with defaults
      const normalizedConfig = {
        applicationId: config.applicationId,
        ...(config.url ? { url: config.url } : {}),
        ...(config.environment ? { environment: config.environment } : {}),
        debugMode: config.debugMode ?? false,
        ...(typeof config.foregroundBannerFallback === 'number'
          ? { foregroundBannerFallback: config.foregroundBannerFallback }
          : {}),
      };

      // Delegate to native SDK
      await NativeModule.initialize(normalizedConfig);

      PushPlatform.initialized = true;
      PushPlatform._instance = new PushPlatform();
      Logger.info('SDK initialized successfully');
    } catch (error) {
      Logger.error('SDK initialization failed', error);
      throw new SDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Initialization failed: ${String(error)}`,
        { originalError: String(error) }
      );
    }
    };
    PushPlatform.initializing = initialize();
    try { await PushPlatform.initializing; }
    finally { PushPlatform.initializing = null; }
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
      // Re-throw SDKError as-is to preserve error code and message
      if (error instanceof SDKError) {
        throw error;
      }
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
    validateUserId(userId);

    Logger.debug('Logging in user', { userId });

    try {
      await NativeModule.login(userId, userData);
      Logger.info('User logged in successfully', { userId });
    } catch (error) {
      Logger.error('Login failed', error);
      // Re-throw SDKError as-is to preserve error code and message
      if (error instanceof SDKError) {
        throw error;
      }
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
      // Re-throw SDKError as-is to preserve error code and message
      if (error instanceof SDKError) {
        throw error;
      }
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
      // Re-throw SDKError as-is to preserve error code and message
      if (error instanceof SDKError) {
        throw error;
      }
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
  static onRegistrationUpdated(callback: (update: RegistrationUpdate) => void): Subscription {
    Logger.debug('Registering onRegistrationUpdated listener');
    return EventEmitter.onRegistrationUpdated(callback);
  }

  /**
   * Add listener for notification received event
   *
   * Fired when notification is received while app is running
   * (foreground or background).
   *
   * May be subscribed before initialization; early native events are replayed.
   *
   * @param callback - Callback function with notification context
   * @returns Subscription handle to remove listener
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * await PushPlatform.initialize({ applicationId, url });
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
    Logger.debug('Registering onNotificationReceived listener');
    return EventEmitter.onNotificationReceived(callback);
  }

  /**
   * Add listener for notification opened event
   *
   * Fired when user taps on notification (app was terminated or backgrounded).
   *
   * May be subscribed before initialization; early native events are replayed.
   *
   * @param callback - Callback function with notification context
   * @returns Subscription handle to remove listener
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * await PushPlatform.initialize({ applicationId, url });
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
    Logger.debug('Registering onNotificationOpened listener');
    return EventEmitter.onNotificationOpened(callback);
  }

  /**
   * Add listener for notification will-display (foreground) event.
   *
   * May be subscribed before initialization; early native events are replayed.
   *
   * @throws {SDKError} If SDK not initialized
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   let sub1: { remove: () => void } | undefined;
   *   let sub2: { remove: () => void } | undefined;
   *   let cancelled = false;
   *   (async () => {
   *     await PushPlatform.initialize({ applicationId, url });
   *     if (cancelled) return;
   *     sub1 = PushPlatform.onNotificationReceived(handler);
   *     sub2 = PushPlatform.onNotificationOpened(handler);
   *   })();
   *   return () => {
   *     cancelled = true;
   *     sub1?.remove();
   *     sub2?.remove();
   *   };
   * }, []);
   * ```
   */
  static onNotificationWillDisplay(
    callback: (event: NotificationWillDisplayEvent) => void,
  ): Subscription {
    return EventEmitter.onNotificationWillDisplay(callback);
  }

  static async getDeviceToken(): Promise<string | null> {
    PushPlatform.ensureInitialized();
    const token = await NativeModule.getDeviceToken();
    return token ?? null;
  }

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
