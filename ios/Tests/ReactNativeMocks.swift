import Foundation

/**
 * Minimal React Native mocks for standalone testing
 *
 * These are stub implementations that allow PushPlatformBridge to compile
 * and run in XCTest without React Native runtime.
 */

// MARK: - RCTEventEmitter Mock

@objc
open class RCTEventEmitter: NSObject {
    public override init() {
        super.init()
    }

    @objc
    open class func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    open func supportedEvents() -> [String]! {
        return []
    }

    @objc
    open func startObserving() {}

    @objc
    open func stopObserving() {}

    @objc
    open func sendEvent(withName name: String!, body: Any!) {}
}

// MARK: - Promise Callbacks

public typealias RCTPromiseResolveBlock = (Any?) -> Void
public typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void
