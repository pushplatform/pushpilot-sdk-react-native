/**
 * @pushplatform/react-native
 *
 * Event emitter wrapper for native events
 */

import type { EmitterSubscription } from 'react-native';
import { NativeEvents } from './NativeModule';
import type { NotificationContext, Subscription } from './types';

/**
 * Event names
 */
export const EventNames = {
  REGISTRATION_UPDATED: 'onRegistrationUpdated',
  NOTIFICATION_RECEIVED: 'onNotificationReceived',
  NOTIFICATION_OPENED: 'onNotificationOpened',
} as const;

/**
 * Event emitter wrapper with type-safe listeners
 */
export class EventEmitter {
  /**
   * Add listener for registration updated event
   *
   * Fired when push token registration completes successfully.
   * Note: Token value is NOT passed to JavaScript (security).
   */
  static onRegistrationUpdated(callback: () => void): Subscription {
    const subscription: EmitterSubscription = NativeEvents.addListener(
      EventNames.REGISTRATION_UPDATED,
      callback
    );

    return {
      remove: () => subscription.remove(),
    };
  }

  /**
   * Add listener for notification received event
   *
   * Fired when push notification is received (foreground or background).
   */
  static onNotificationReceived(
    callback: (context: NotificationContext) => void
  ): Subscription {
    const subscription: EmitterSubscription = NativeEvents.addListener(
      EventNames.NOTIFICATION_RECEIVED,
      callback
    );

    return {
      remove: () => subscription.remove(),
    };
  }

  /**
   * Add listener for notification opened event
   *
   * Fired when user taps on notification (app was terminated or backgrounded).
   */
  static onNotificationOpened(
    callback: (context: NotificationContext) => void
  ): Subscription {
    const subscription: EmitterSubscription = NativeEvents.addListener(
      EventNames.NOTIFICATION_OPENED,
      callback
    );

    return {
      remove: () => subscription.remove(),
    };
  }

  /**
   * Remove all listeners
   */
  static removeAllListeners(): void {
    NativeEvents.removeAllListeners(EventNames.REGISTRATION_UPDATED);
    NativeEvents.removeAllListeners(EventNames.NOTIFICATION_RECEIVED);
    NativeEvents.removeAllListeners(EventNames.NOTIFICATION_OPENED);
  }
}
