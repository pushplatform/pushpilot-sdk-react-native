import Foundation
import React
import PushPlatformSDK
import UIKit
import UserNotifications

@objc(PushPlatformBridge)
class PushPlatformBridge: RCTEventEmitter {

    private var hasListeners = false
    private var observedEvents = Set<String>()
    private var pendingEvents: [String: [[String: Any]]] = [:]
    private var willDisplayObserved = false
    private var pendingDisplays: [String: NotificationDisplayEvent] = [:]

    // MARK: - Initialization

    override init() {
        super.init()
        PushPlatform.shared.delegate = self
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func constantsToExport() -> [AnyHashable: Any]! { ["serverURL": PushPlatform.shared.serverURL] }

    // MARK: - Event Emitter

    override func supportedEvents() -> [String]! {
        return [
            "onRegistrationUpdated",
            "onNotificationReceived",
            "onNotificationOpened",
            "onNotificationWillDisplay"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    @objc
    func setEventObserved(_ eventName: String, observed: Bool) {
        DispatchQueue.main.async {
            if observed {
                self.observedEvents.insert(eventName)
                let events = self.pendingEvents.removeValue(forKey: eventName) ?? []
                events.forEach { self.sendEvent(withName: eventName, body: $0) }
            } else { self.observedEvents.remove(eventName) }
        }
    }

    private func emitEvent(withName name: String, body: [String: Any]) {
        let deliver = {
            if self.observedEvents.contains(name) { self.sendEvent(withName: name, body: body) }
            else {
                var events = self.pendingEvents[name] ?? []
                if events.count >= 100 { events.removeFirst() }
                events.append(body)
                self.pendingEvents[name] = events
            }
        }
        if Thread.isMainThread { deliver() } else { DispatchQueue.main.async(execute: deliver) }
    }

    // MARK: - Bridge Methods

    @objc
    func initialize(_ config: NSDictionary, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] initialize() called from JavaScript")
        DispatchQueue.main.async {
            guard let applicationIDString = config["applicationId"] as? String else {
                reject("INVALID_CONFIG", "applicationId must be an application UUID", nil)
                return
            }
            var options = PushPlatform.InitializeOptions(
                applicationId: applicationIDString,
                url: config["url"] as? String,
                debugMode: config["debugMode"] as? Bool ?? false
            )
            if let fallback = config["foregroundBannerFallback"] as? NSNumber {
                let seconds = fallback.doubleValue
                guard seconds.isFinite, seconds >= 0 else {
                    reject("INVALID_CONFIG", "foregroundBannerFallback must be a non-negative number of seconds", nil)
                    return
                }
                options.foregroundBannerFallback = seconds
            }
            if let environmentString = config["environment"] as? String {
                guard let environment = self.parseEnvironment(environmentString) else {
                    reject("INVALID_ENVIRONMENT", "Invalid environment value", nil)
                    return
                }
                options.environment = environment
            }
            PushPlatform.shared.initialize(options) { result in
                switch result {
                case .success(let installationID):
                    NSLog("[PushPlatformBridge] Initialize succeeded, installationId=%@", installationID.uuidString)
                    resolve(["installationId": installationID.uuidString, "platform": "ios"])
                case .failure(let error):
                    reject(self.errorCode(from: error), error.localizedDescription, error)
                }
            }
        }
    }

    @objc
    func login(_ userId: String, userData: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("[PushPlatformBridge] login() called with userId=%@", userId)
        DispatchQueue.main.async {
            PushPlatform.shared.login(userID: userId, metadata: userData as? [String: Any]) { result in
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

    @objc(requestPermissions:rejecter:)
    func requestPermissions(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                reject("PERMISSION_ERROR", error.localizedDescription, error)
                return
            }
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                PushPlatform.shared.refreshMetadata()
                resolve(granted)
            }
        }
    }

    @objc(getPermissionStatus:rejecter:)
    func getPermissionStatus(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional:
                status = "granted"
            case .denied:
                status = "denied"
            case .notDetermined:
                status = "not-determined"
            @unknown default:
                status = "not-determined"
            }
            resolve(status)
        }
    }

    @objc
    func setNotificationWillDisplayObserved(_ observed: Bool) {
        willDisplayObserved = observed
    }

    @objc
    func completeNotificationDisplay(_ displayId: String, prevented: Bool) {
        guard let event = pendingDisplays.removeValue(forKey: displayId) else { return }
        if prevented {
            event.preventDefault()
        }
        event.finish()
    }

    @objc(getDeviceToken:rejecter:)
    func getDeviceToken(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(PushPlatform.shared.getDeviceToken())
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
        if let notificationID = notification.notificationID {
            result["notificationId"] = notificationID
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
        do {
            emitEvent(withName: "onRegistrationUpdated", body: [
                "success": false,
                "error": [
                    "code": errorCode(from: error),
                    "message": error.localizedDescription
                ]
            ])
        }
    }

    func notificationWillDisplay(_ event: NotificationDisplayEvent) {
        guard willDisplayObserved else { return }
        let displayId = UUID().uuidString
        pendingDisplays[displayId] = event
        event.deferDecision()
        guard hasListeners else {
            pendingDisplays.removeValue(forKey: displayId)
            event.finish()
            return
        }
        sendEvent(withName: "onNotificationWillDisplay", body: [
            "id": displayId,
            "notification": serializeNotification(event.notification)
        ])
    }

    func didUpdateDeviceToken(_ token: String) {
        // getDeviceToken exposes OS tokens. didUpdateAPNsToken reports backend acceptance.
    }

    func didReceiveNotification(_ notification: ParsedNotification, context: NotificationContext) {
        do {
            emitEvent(withName: "onNotificationReceived", body: [
                "notification": serializeNotification(notification),
                "foreground": context.isForeground
            ])
        }
    }

    func didOpenNotification(_ notification: ParsedNotification, action: String?, context: NotificationContext) {
        do {
            var body: [String: Any] = [
                "notification": serializeNotification(notification),
                "foreground": context.isForeground,
                "userInteraction": true
            ]

            if let actionId = action {
                body["actionId"] = actionId
            }

            emitEvent(withName: "onNotificationOpened", body: body)
        }
    }

    func didReceiveIncomingCall(callID: String, callerName: String, metadata: [String: Any]) {
        do {
            emitEvent(withName: "onNotificationReceived", body: [
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
        do {
            var body: [String: Any] = [
                "success": true,
                "type": "apns"
            ]
            if let token = PushPlatform.shared.getDeviceToken() {
                body["token"] = token
            }
            if let installationId = PushPlatform.shared.getInstallationID() {
                body["installationId"] = installationId.uuidString
            }
            emitEvent(withName: "onRegistrationUpdated", body: body)
        }
    }

    func didUpdateVoIPToken() {
        do {
            emitEvent(withName: "onRegistrationUpdated", body: [
                "success": true,
                "type": "voip"
            ])
        }
    }
}
