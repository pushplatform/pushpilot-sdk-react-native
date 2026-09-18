// Mock React Native NativeModules and NativeEventEmitter
export const NativeModules = {
  PushPlatformBridge: {
    initialize: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getInstallationId: jest.fn(),
    requestPermissions: jest.fn(),
  },
};

export class NativeEventEmitter {
  addListener = jest.fn(() => ({
    remove: jest.fn(),
  }));
  removeAllListeners = jest.fn();
  removeSubscription = jest.fn();
}

export const Platform = {
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
};

export default {
  NativeModules,
  NativeEventEmitter,
  Platform,
};
