/**
 * @pushplatform/react-native
 *
 * Event emitter wrapper for native events
 */

import { NativeEvents } from './NativeModule';
import type { NotificationContext, NotificationWillDisplayEvent, PushNotification, RegistrationUpdate, Subscription } from './types';
import { NativeModule } from './NativeModule';

/**
 * Event names
 */
export const EventNames = {
  REGISTRATION_UPDATED: 'onRegistrationUpdated',
  NOTIFICATION_RECEIVED: 'onNotificationReceived',
  NOTIFICATION_OPENED: 'onNotificationOpened',
  NOTIFICATION_WILL_DISPLAY: 'onNotificationWillDisplay',
} as const;

const listenerCounts = new Map<string, number>();

function listen(event: string, callback: (payload: unknown) => void): Subscription {
  const subscription = NativeEvents.addListener(event, callback);
  const count = (listenerCounts.get(event) || 0) + 1;
  listenerCounts.set(event, count);
  // Native replay starts only after the JavaScript listener is installed.
  if (count === 1) NativeModule.setEventObserved?.(event, true);
  let removed = false;
  return { remove() {
    if (removed) return;
    removed = true;
    subscription.remove();
    const remaining = Math.max(0, (listenerCounts.get(event) || 1) - 1);
    listenerCounts.set(event, remaining);
    if (remaining === 0) NativeModule.setEventObserved?.(event, false);
  }};
}

const willDisplayListeners = new Set<(event: NotificationWillDisplayEvent) => void>();
let willDisplayBridge: { remove(): void } | null = null;

export function deliverWillDisplay(
  listeners: Iterable<(event: NotificationWillDisplayEvent) => void>,
  notification: PushNotification,
): boolean {
  let prevented = false;
  let settled = false;
  const event: NotificationWillDisplayEvent = {
    notification,
    preventDefault() {
      if (!settled) prevented = true;
    },
  };
  for (const listener of listeners) {
    try { listener(event); } catch (error) { console.error("PushPilot foreground handler failed", error); }
  }
  settled = true;
  return prevented;
}

function ensureWillDisplayBridge(): void {
  if (willDisplayBridge) return;
  willDisplayBridge = NativeEvents.addListener(EventNames.NOTIFICATION_WILL_DISPLAY, (payload) => {
    const value = (payload && typeof payload === 'object' ? payload : {}) as { id?: string; notification?: PushNotification };
    let prevented = false;
    try { prevented = deliverWillDisplay(willDisplayListeners, value.notification || { id: '', data: {} }); }
    finally { if (value.id) NativeModule.completeNotificationDisplay(value.id, prevented); }
  });
}

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
    const subscription = listen(
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
    const subscription = listen(
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
    const subscription = listen(
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
  static onNotificationWillDisplay(
    callback: (event: NotificationWillDisplayEvent) => void,
  ): Subscription {
    ensureWillDisplayBridge();
    willDisplayListeners.add(callback);
    NativeModule.setNotificationWillDisplayObserved(true);
    return {
      remove: () => {
        willDisplayListeners.delete(callback);
        if (willDisplayListeners.size === 0) NativeModule.setNotificationWillDisplayObserved(false);
      },
    };
  }

  static removeAllListeners(): void {
    for (const name of listenerCounts.keys()) NativeModule.setEventObserved?.(name, false);
    listenerCounts.clear();
    willDisplayListeners.clear();
    NativeModule.setNotificationWillDisplayObserved(false);
    willDisplayBridge?.remove();
    willDisplayBridge = null;
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
