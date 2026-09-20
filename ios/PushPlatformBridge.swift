import Foundation
import React
import PushPlatformSDK

@objc(PushPlatformBridge)
class PushPlatformBridge: RCTEventEmitter {

    private var hasListeners = false

    // MARK: - Initialization

    override init() {
        super.init()
        PushPlatform.shared.delegate = self
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    // MARK: - Event Emitter

    override func supportedEvents() -> [String]! {
        return [
            "onRegistrationUpdated",
            "onNotificationReceived",
            "onNotificationOpened"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Bridge Methods

    @objc
    func initialize(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] initialize() called from JavaScript")
        DispatchQueue.main.async {
            guard let apiKey = config["apiKey"] as? String,
                  let environmentString = config["environment"] as? String else {
                NSLog("[PushPlatformBridge] Missing required config fields")
                reject("INVALID_CONFIG", "Missing required configuration fields", nil)
                return
            }

            guard let environment = self.parseEnvironment(environmentString) else {
                NSLog("[PushPlatformBridge] Invalid environment: %@", environmentString)
                reject("INVALID_ENVIRONMENT", "Invalid environment value", nil)
                return
            }

            let debugMode = config["debugMode"] as? Bool ?? false
            let apiBaseURL = config["apiBaseURL"] as? String ?? "https://api.pushplatform.example"

            NSLog("[PushPlatformBridge] Configuring SDK: env=%@, debug=%@", environmentString, debugMode ? "true" : "false")

            PushPlatform.shared.configure(
                apiKey: apiKey,
                apiBaseURL: apiBaseURL,
                environment: environment,
                debugMode: debugMode
            )

            if let installationId = PushPlatform.shared.getInstallationID() {
                NSLog("[PushPlatformBridge] Initialize succeeded, installationId=%@", installationId.uuidString)
                resolve([
                    "installationId": installationId.uuidString,
                    "platform": "ios"
                ])
            } else {
                NSLog("[PushPlatformBridge] Failed to retrieve installation ID")
                reject("INITIALIZATION_FAILED", "Failed to retrieve installation ID", nil)
            }
        }
    }

    @objc
    func login(_ userId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] login() called with userId=%@", userId)
        DispatchQueue.main.async {
            PushPlatform.shared.login(userID: userId) { result in
                switch result {
                case .success:
                    NSLog("[PushPlatformBridge] Login succeeded")
                    resolve(nil)
                case .failure(let error):
                    NSLog("[PushPlatformBridge] Login failed: %@", error.localizedDescription)
                    reject(self.errorCode(from: error), error.localizedDescription, error)
                }
            }
        }
    }

    @objc(logout:rejecter:)
    func logout(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] logout() called")
        DispatchQueue.main.async {
            PushPlatform.shared.logout { result in
                switch result {
                case .success:
                    NSLog("[PushPlatformBridge] Logout succeeded")
                    resolve(nil)
                case .failure(let error):
                    NSLog("[PushPlatformBridge] Logout failed: %@", error.localizedDescription)
                    reject(self.errorCode(from: error), error.localizedDescription, error)
                }
            }
        }
    }

    @objc(getInstallationId:rejecter:)
    func getInstallationId(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] getInstallationId() called from JavaScript")
        DispatchQueue.main.async {
            if let installationId = PushPlatform.shared.getInstallationID() {
                NSLog("[PushPlatformBridge] Returning UUID: %@", installationId.uuidString)
                resolve(installationId.uuidString)
            } else {
                NSLog("[PushPlatformBridge] SDK not initialized, rejecting")
                reject("NOT_INITIALIZED", "SDK not initialized", nil)
            }
        }
    }

    // MARK: - Helpers

    private func parseEnvironment(_ string: String) -> Environment? {
        switch string.lowercased() {
        case "development":
            return .development
        case "production":
            return .production
        default:
            return nil
        }
    }

    private func errorCode(from error: SDKError) -> String {
        switch error {
        case .notConfigured:
            return "NOT_CONFIGURED"
        case .invalidAPIKey:
            return "INVALID_API_KEY"
        case .networkError:
            return "NETWORK_ERROR"
        case .apiError:
            return "API_ERROR"
        case .invalidToken:
            return "INVALID_TOKEN"
        case .maxRetriesExceeded:
            return "MAX_RETRIES_EXCEEDED"
        case .keychainAccessDenied:
            return "KEYCHAIN_ACCESS_DENIED"
        }
    }

    private func serializeNotification(_ notification: ParsedNotification) -> [String: Any] {
        var result: [String: Any] = [:]

        if let title = notification.title {
            result["title"] = title
        }
        if let body = notification.body {
            result["body"] = body
        }
        if let badge = notification.badge {
            result["badge"] = badge
        }
        if let sound = notification.sound {
            result["sound"] = sound
        }
        if let eventID = notification.eventID {
            result["id"] = eventID
        }
        if let callID = notification.callID {
            result["callId"] = callID
        }

        result["data"] = notification.customData

        return result
    }
}

// MARK: - PushPlatformDelegate

extension PushPlatformBridge: PushPlatformDelegate {

    func didInitialize(installationID: UUID) {
        // Already handled in initialize() method
    }

    func didRegisterTokens() {
        // Not exposed to JS per ADR-0014
    }

    func didFailRegisterTokens(error: SDKError) {
        if hasListeners {
            sendEvent(withName: "onRegistrationUpdated", body: [
                "success": false,
                "error": [
                    "code": errorCode(from: error),
                    "message": error.localizedDescription
                ]
            ])
        }
    }

    func didReceiveNotification(_ notification: ParsedNotification, context: NotificationContext) {
        if hasListeners {
            sendEvent(withName: "onNotificationReceived", body: [
                "notification": serializeNotification(notification),
                "foreground": context.isForeground
            ])
        }
    }

    func didOpenNotification(_ notification: ParsedNotification, action: String?, context: NotificationContext) {
        if hasListeners {
            var body: [String: Any] = [
                "notification": serializeNotification(notification),
                "foreground": context.isForeground
            ]

            if let actionId = action {
                body["actionId"] = actionId
            }

            sendEvent(withName: "onNotificationOpened", body: body)
        }
    }

    func didReceiveIncomingCall(callID: String, callerName: String, metadata: [String: Any]) {
        if hasListeners {
            sendEvent(withName: "onNotificationReceived", body: [
                "notification": [
                    "id": callID,
                    "title": callerName,
                    "callId": callID,
                    "data": metadata
                ],
                "foreground": false
            ])
        }
    }

    func didUpdateAPNsToken() {
        if hasListeners {
            sendEvent(withName: "onRegistrationUpdated", body: [
                "success": true,
                "type": "apns"
            ])
        }
    }

    func didUpdateVoIPToken() {
        if hasListeners {
            sendEvent(withName: "onRegistrationUpdated", body: [
                "success": true,
                "type": "voip"
            ])
        }
    }
}
