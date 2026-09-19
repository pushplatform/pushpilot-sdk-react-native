import Foundation

// Mock types for testing without PushPlatformSDK dependency
// These are test stubs that allow production bridge to compile and run

public enum Environment {
    case development
    case production
}

public enum SDKError: Error, LocalizedError {
    case notConfigured
    case invalidAPIKey
    case networkError
    case apiError
    case invalidToken
    case maxRetriesExceeded
    case keychainAccessDenied

    public var errorDescription: String? {
        switch self {
        case .notConfigured: return "SDK not configured"
        case .invalidAPIKey: return "Invalid API key"
        case .networkError: return "Network error"
        case .apiError: return "API error"
        case .invalidToken: return "Invalid token"
        case .maxRetriesExceeded: return "Max retries exceeded"
        case .keychainAccessDenied: return "Keychain access denied"
        }
    }
}

public struct ParsedNotification {
    public var title: String?
    public var body: String?
    public var badge: Int?
    public var sound: String?
    public var eventID: String?
    public var callID: String?
    public var customData: [String: Any]

    public init(title: String? = nil, body: String? = nil, badge: Int? = nil, sound: String? = nil, eventID: String? = nil, callID: String? = nil, customData: [String: Any] = [:]) {
        self.title = title
        self.body = body
        self.badge = badge
        self.sound = sound
        self.eventID = eventID
        self.callID = callID
        self.customData = customData
    }
}

public struct NotificationContext {
    public var isForeground: Bool

    public init(isForeground: Bool) {
        self.isForeground = isForeground
    }
}

public protocol PushPlatformDelegate: AnyObject {
    func didInitialize(installationID: UUID)
    func didRegisterTokens()
    func didFailRegisterTokens(error: SDKError)
    func didReceiveNotification(_ notification: ParsedNotification, context: NotificationContext)
    func didOpenNotification(_ notification: ParsedNotification, action: String?, context: NotificationContext)
    func didReceiveIncomingCall(callID: String, callerName: String, metadata: [String: Any])
    func didUpdateAPNsToken()
    func didUpdateVoIPToken()
}

public class PushPlatform {
    public static let shared = PushPlatform()
    private static var configureCallCount = 0
    private static var getInstallationIDCallCount = 0

    public weak var delegate: PushPlatformDelegate?

    private var configured = false
    private var installationID: UUID?

    private init() {
        self.installationID = UUID()
        NSLog("[PushPlatformSDKMock] Singleton initialized with UUID: %@", installationID?.uuidString ?? "nil")
    }

    public func configure(apiKey: String, apiBaseURL: String, environment: Environment, debugMode: Bool) {
        PushPlatform.configureCallCount += 1
        NSLog("[PushPlatformSDKMock] configure() call #%d. Before: configured=%@",
              PushPlatform.configureCallCount,
              configured ? "true" : "false")
        self.configured = true
        NSLog("[PushPlatformSDKMock] configure() completed. After: configured=%@, installationID=%@",
              configured ? "true" : "false",
              installationID?.uuidString ?? "nil")
        if let id = installationID {
            delegate?.didInitialize(installationID: id)
        }
    }

    public func getInstallationID() -> UUID? {
        PushPlatform.getInstallationIDCallCount += 1
        let result = configured ? installationID : nil
        NSLog("[PushPlatformSDKMock] getInstallationID() call #%d. configured=%@, returning=%@",
              PushPlatform.getInstallationIDCallCount,
              configured ? "true" : "false",
              result?.uuidString ?? "nil")
        return result
    }

    public func login(userID: String, completion: @escaping (Result<Void, SDKError>) -> Void) {
        if !configured {
            completion(.failure(.notConfigured))
            return
        }
        completion(.success(()))
    }

    public func logout(completion: @escaping (Result<Void, SDKError>) -> Void) {
        if !configured {
            completion(.failure(.notConfigured))
            return
        }
        completion(.success(()))
    }
}
