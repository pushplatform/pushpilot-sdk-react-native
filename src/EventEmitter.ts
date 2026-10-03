/**
 * @pushplatform/react-native
 *
 * Event emitter wrapper for native events
 */

import type { EmitterSubscription } from 'react-native';
import { NativeEvents } from './NativeModule';
import type { NotificationContext, RegistrationUpdate, Subscription } from './types';

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
  static onRegistrationUpdated(callback: (update: RegistrationUpdate) => void): Subscription {
    const subscription: EmitterSubscription = NativeEvents.addListener(
      EventNames.REGISTRATION_UPDATED,
      (payload) => callback(payload as RegistrationUpdate)
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
      (payload) => callback(normalizeNotificationContext(payload))
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
      (payload) => callback(normalizeNotificationContext(payload))
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

function normalizeNotificationContext(payload: unknown): NotificationContext {
  const value = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const isForegrounded = typeof value.isForegrounded === 'boolean'
    ? value.isForegrounded
    : value.foreground === true;
  return {
    notification: (value.notification || { data: {} }) as NotificationContext['notification'],
    isForegrounded,
    userInteraction: typeof value.userInteraction === 'boolean' ? value.userInteraction : false,
    ...(typeof value.actionId === 'string' ? { actionId: value.actionId } : {}),
  };
}
