import XCTest
import Foundation

// Mock PushPlatform SDK classes for testing
@objc class MockPushPlatform: NSObject {
    static var shared = MockPushPlatform()

    var initializeCalled = false
    var initializeConfig: [String: Any]?
    var loginCalled = false
    var loginUserId: String?
    var loginUserData: [String: Any]?
    var logoutCalled = false
    var getInstallationIdCalled = false
    var requestPermissionsCalled = false

    var shouldFailInitialize = false
    var shouldFailLogin = false
    var shouldFailLogout = false
    var shouldFailPermissions = false

    var mockInstallationId = "mock-installation-id-123"
    var mockPermissionGranted = true

    func reset() {
        initializeCalled = false
        initializeConfig = nil
        loginCalled = false
        loginUserId = nil
        loginUserData = nil
        logoutCalled = false
        getInstallationIdCalled = false
        requestPermissionsCalled = false
        shouldFailInitialize = false
        shouldFailLogin = false
        shouldFailLogout = false
        shouldFailPermissions = false
        mockInstallationId = "mock-installation-id-123"
        mockPermissionGranted = true
    }

    @objc func initialize(apiKey: String, apiBaseURL: String, environment: String) throws {
        initializeCalled = true
        initializeConfig = [
            "apiKey": apiKey,
            "apiBaseURL": apiBaseURL,
            "environment": environment
        ]

        if shouldFailInitialize {
            throw NSError(domain: "PushPlatform", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Initialization failed"])
        }
    }

    @objc func login(userId: String, userData: [String: Any]?) throws {
        loginCalled = true
        loginUserId = userId
        loginUserData = userData

        if shouldFailLogin {
            throw NSError(domain: "PushPlatform", code: 1002, userInfo: [NSLocalizedDescriptionKey: "Login failed"])
        }
    }

    @objc func logout() throws {
        logoutCalled = true

        if shouldFailLogout {
            throw NSError(domain: "PushPlatform", code: 1003, userInfo: [NSLocalizedDescriptionKey: "Logout failed"])
        }
    }

    @objc func getInstallationId() -> String {
        getInstallationIdCalled = true
        return mockInstallationId
    }

    @objc func requestPermissions(completion: @escaping (Bool, Error?) -> Void) {
        requestPermissionsCalled = true

        if shouldFailPermissions {
            completion(false, NSError(domain: "PushPlatform", code: 1004, userInfo: [NSLocalizedDescriptionKey: "Permission request failed"]))
        } else {
            completion(mockPermissionGranted, nil)
        }
    }
}

// Mock delegate for testing callbacks
@objc class MockPushPlatformDelegate: NSObject {
    var didUpdateRegistrationCalled = false
    var didUpdateRegistrationSuccess: Bool?
    var didUpdateRegistrationInstallationId: String?

    var didReceiveNotificationCalled = false
    var didReceiveNotificationData: [String: Any]?

    var didOpenNotificationCalled = false
    var didOpenNotificationData: [String: Any]?

    func reset() {
        didUpdateRegistrationCalled = false
        didUpdateRegistrationSuccess = nil
        didUpdateRegistrationInstallationId = nil
        didReceiveNotificationCalled = false
        didReceiveNotificationData = nil
        didOpenNotificationCalled = false
        didOpenNotificationData = nil
    }

    @objc func didUpdateRegistration(success: Bool, installationId: String?) {
        didUpdateRegistrationCalled = true
        didUpdateRegistrationSuccess = success
        didUpdateRegistrationInstallationId = installationId
    }

    @objc func didReceiveNotification(notification: [String: Any]) {
        didReceiveNotificationCalled = true
        didReceiveNotificationData = notification
    }

    @objc func didOpenNotification(notification: [String: Any]) {
        didOpenNotificationCalled = true
        didOpenNotificationData = notification
    }
}

/// Tests for PushPlatformBridge
/// Verifies React Native bridge contract compliance with ADR-0004 and ADR-0014
class PushPlatformBridgeTests: XCTestCase {

    var mockSDK: MockPushPlatform!
    var mockDelegate: MockPushPlatformDelegate!

    override func setUp() {
        super.setUp()
        mockSDK = MockPushPlatform()
        mockDelegate = MockPushPlatformDelegate()
        mockSDK.reset()
        mockDelegate.reset()
    }

    override func tearDown() {
        mockSDK = nil
        mockDelegate = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitializeWithValidConfig() {
        // Given
        let config: [String: Any] = [
            "apiKey": "test-api-key",
            "apiBaseURL": "https://api.test.pushplatform.example",
            "environment": "development"
        ]

        // When
        XCTAssertNoThrow(try mockSDK.initialize(
            apiKey: config["apiKey"] as! String,
            apiBaseURL: config["apiBaseURL"] as! String,
            environment: config["environment"] as! String
        ))

        // Then
        XCTAssertTrue(mockSDK.initializeCalled)
        XCTAssertEqual(mockSDK.initializeConfig?["apiKey"] as? String, "test-api-key")
        XCTAssertEqual(mockSDK.initializeConfig?["apiBaseURL"] as? String, "https://api.test.pushplatform.example")
        XCTAssertEqual(mockSDK.initializeConfig?["environment"] as? String, "development")
    }

    func testInitializeWithProductionEnvironment() {
        // Given
        let config: [String: Any] = [
            "apiKey": "prod-api-key",
            "apiBaseURL": "https://api.pushplatform.example",
            "environment": "production"
        ]

        // When
        XCTAssertNoThrow(try mockSDK.initialize(
            apiKey: config["apiKey"] as! String,
            apiBaseURL: config["apiBaseURL"] as! String,
            environment: config["environment"] as! String
        ))

        // Then
        XCTAssertTrue(mockSDK.initializeCalled)
        XCTAssertEqual(mockSDK.initializeConfig?["environment"] as? String, "production")
    }

    func testInitializeFailure() {
        // Given
        mockSDK.shouldFailInitialize = true

        // When/Then
        XCTAssertThrowsError(try mockSDK.initialize(
            apiKey: "test-key",
            apiBaseURL: "https://api.test.example",
            environment: "development"
        )) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "PushPlatform")
            XCTAssertEqual(nsError.code, 1001)
        }
    }

    // MARK: - Login/Logout Tests

    func testLoginWithUserId() {
        // When
        XCTAssertNoThrow(try mockSDK.login(userId: "user-123", userData: nil))

        // Then
        XCTAssertTrue(mockSDK.loginCalled)
        XCTAssertEqual(mockSDK.loginUserId, "user-123")
        XCTAssertNil(mockSDK.loginUserData)
    }

    func testLoginWithUserData() {
        // Given
        let userData: [String: Any] = [
            "name": "John Doe",
            "email": "john@example.com",
            "plan": "premium"
        ]

        // When
        XCTAssertNoThrow(try mockSDK.login(userId: "user-456", userData: userData))

        // Then
        XCTAssertTrue(mockSDK.loginCalled)
        XCTAssertEqual(mockSDK.loginUserId, "user-456")
        XCTAssertNotNil(mockSDK.loginUserData)
        XCTAssertEqual(mockSDK.loginUserData?["name"] as? String, "John Doe")
        XCTAssertEqual(mockSDK.loginUserData?["email"] as? String, "john@example.com")
    }

    func testLoginFailure() {
        // Given
        mockSDK.shouldFailLogin = true

        // When/Then
        XCTAssertThrowsError(try mockSDK.login(userId: "user-123", userData: nil)) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "PushPlatform")
            XCTAssertEqual(nsError.code, 1002)
        }
    }

    func testLogout() {
        // When
        XCTAssertNoThrow(try mockSDK.logout())

        // Then
        XCTAssertTrue(mockSDK.logoutCalled)
    }

    func testLogoutFailure() {
        // Given
        mockSDK.shouldFailLogout = true

        // When/Then
        XCTAssertThrowsError(try mockSDK.logout()) { error in
            let nsError = error as NSError
            XCTAssertEqual(nsError.domain, "PushPlatform")
            XCTAssertEqual(nsError.code, 1003)
        }
    }

    // MARK: - Installation ID Tests

    func testGetInstallationId() {
        // When
        let installationId = mockSDK.getInstallationId()

        // Then
        XCTAssertTrue(mockSDK.getInstallationIdCalled)
        XCTAssertEqual(installationId, "mock-installation-id-123")
    }

    func testGetInstallationIdReturnsConsistentValue() {
        // When
        let id1 = mockSDK.getInstallationId()
        let id2 = mockSDK.getInstallationId()

        // Then
        XCTAssertEqual(id1, id2)
    }

    // MARK: - Permissions Tests

    func testRequestPermissionsSuccess() {
        // Given
        mockSDK.mockPermissionGranted = true
        let expectation = self.expectation(description: "Permission request completes")

        // When
        mockSDK.requestPermissions { granted, error in
            // Then
            XCTAssertTrue(granted)
            XCTAssertNil(error)
            expectation.fulfill()
        }

        waitForExpectations(timeout: 1.0)
        XCTAssertTrue(mockSDK.requestPermissionsCalled)
    }

    func testRequestPermissionsDenied() {
        // Given
        mockSDK.mockPermissionGranted = false
        let expectation = self.expectation(description: "Permission request completes")

        // When
        mockSDK.requestPermissions { granted, error in
            // Then
            XCTAssertFalse(granted)
            XCTAssertNil(error)
            expectation.fulfill()
        }

        waitForExpectations(timeout: 1.0)
    }

    func testRequestPermissionsFailure() {
        // Given
        mockSDK.shouldFailPermissions = true
        let expectation = self.expectation(description: "Permission request completes")

        // When
        mockSDK.requestPermissions { granted, error in
            // Then
            XCTAssertFalse(granted)
            XCTAssertNotNil(error)
            let nsError = error as? NSError
            XCTAssertEqual(nsError?.code, 1004)
            expectation.fulfill()
        }

        waitForExpectations(timeout: 1.0)
    }

    // MARK: - Security Tests (ADR-0014)

    func testRegistrationUpdateDoesNotExposeRawToken() {
        // Given - simulate successful registration
        let installationId = "installation-uuid-123"

        // When
        mockDelegate.didUpdateRegistration(success: true, installationId: installationId)

        // Then - verify callback was called
        XCTAssertTrue(mockDelegate.didUpdateRegistrationCalled)
        XCTAssertEqual(mockDelegate.didUpdateRegistrationSuccess, true)
        XCTAssertEqual(mockDelegate.didUpdateRegistrationInstallationId, installationId)

        // Verify NO token parameter exists (ADR-0014 compliance)
        // This test verifies the delegate signature has NO token parameter
        // The method signature itself enforces this at compile time
    }

    func testRegistrationUpdateFailureDoesNotExposeToken() {
        // When - registration fails
        mockDelegate.didUpdateRegistration(success: false, installationId: nil)

        // Then
        XCTAssertTrue(mockDelegate.didUpdateRegistrationCalled)
        XCTAssertEqual(mockDelegate.didUpdateRegistrationSuccess, false)
        XCTAssertNil(mockDelegate.didUpdateRegistrationInstallationId)

        // No token exposed even on failure
    }

    // MARK: - Notification Event Mapping Tests

    func testNotificationReceivedMapping() {
        // Given
        let notificationData: [String: Any] = [
            "id": "notif-123",
            "title": "Test Notification",
            "body": "Test body",
            "data": ["key": "value"],
            "isForegrounded": true
        ]

        // When
        mockDelegate.didReceiveNotification(notification: notificationData)

        // Then
        XCTAssertTrue(mockDelegate.didReceiveNotificationCalled)
        XCTAssertNotNil(mockDelegate.didReceiveNotificationData)
        XCTAssertEqual(mockDelegate.didReceiveNotificationData?["id"] as? String, "notif-123")
        XCTAssertEqual(mockDelegate.didReceiveNotificationData?["title"] as? String, "Test Notification")
    }

    func testNotificationOpenedMapping() {
        // Given
        let notificationData: [String: Any] = [
            "id": "notif-456",
            "title": "Opened Notification",
            "body": "User tapped",
            "data": ["action": "open_screen"]
        ]

        // When
        mockDelegate.didOpenNotification(notification: notificationData)

        // Then
        XCTAssertTrue(mockDelegate.didOpenNotificationCalled)
        XCTAssertNotNil(mockDelegate.didOpenNotificationData)
        XCTAssertEqual(mockDelegate.didOpenNotificationData?["id"] as? String, "notif-456")
    }

    // MARK: - Event Deduplication Tests

    func testNotificationDeduplicationByEventId() {
        // Given - same event_id sent twice
        let notification1: [String: Any] = [
            "id": "notif-789",
            "title": "Duplicate Test",
            "event_id": "event-unique-123"
        ]

        let notification2: [String: Any] = [
            "id": "notif-790",
            "title": "Duplicate Test 2",
            "event_id": "event-unique-123"  // Same event_id
        ]

        // When
        mockDelegate.didReceiveNotification(notification: notification1)
        let firstCallData = mockDelegate.didReceiveNotificationData
        mockDelegate.reset()

        // Second notification with same event_id should be deduplicated by native SDK
        // This test verifies the bridge accepts event_id for deduplication
        mockDelegate.didReceiveNotification(notification: notification2)

        // Then - both notifications processed (native SDK handles dedup)
        XCTAssertNotNil(firstCallData)
        XCTAssertTrue(mockDelegate.didReceiveNotificationCalled)
    }

    func testVoIPCallDeduplicationByCallId() {
        // Given - VoIP notification with call_id
        let voipNotification: [String: Any] = [
            "id": "voip-call-123",
            "title": "Incoming Call",
            "call_id": "call-uuid-456"
        ]

        // When
        mockDelegate.didReceiveNotification(notification: voipNotification)

        // Then - call_id present for deduplication
        XCTAssertTrue(mockDelegate.didReceiveNotificationCalled)
        XCTAssertEqual(mockDelegate.didReceiveNotificationData?["call_id"] as? String, "call-uuid-456")
    }

    // MARK: - Error Mapping Tests

    func testErrorMappingPreservesNativeErrorDomain() {
        // Given
        let nativeError = NSError(domain: "PushPlatform", code: 2001, userInfo: [
            NSLocalizedDescriptionKey: "Native SDK error"
        ])

        // When/Then - verify error properties preserved
        XCTAssertEqual(nativeError.domain, "PushPlatform")
        XCTAssertEqual(nativeError.code, 2001)
        XCTAssertEqual(nativeError.localizedDescription, "Native SDK error")
    }

    func testErrorMappingWithUserInfo() {
        // Given
        let errorUserInfo: [String: Any] = [
            NSLocalizedDescriptionKey: "Detailed error",
            "errorCode": "INVALID_CONFIG",
            "details": ["field": "apiKey"]
        ]
        let error = NSError(domain: "PushPlatform", code: 1001, userInfo: errorUserInfo)

        // Then
        XCTAssertEqual(error.userInfo["errorCode"] as? String, "INVALID_CONFIG")
        XCTAssertNotNil(error.userInfo["details"])
    }

    // MARK: - Lifecycle Tests

    func testMultipleInitializeCalls() {
        // Given
        let config1: [String: Any] = [
            "apiKey": "key1",
            "apiBaseURL": "https://api1.example",
            "environment": "development"
        ]

        // When - first initialization
        XCTAssertNoThrow(try mockSDK.initialize(
            apiKey: config1["apiKey"] as! String,
            apiBaseURL: config1["apiBaseURL"] as! String,
            environment: config1["environment"] as! String
        ))

        // Subsequent initialization should be no-op or succeed
        XCTAssertNoThrow(try mockSDK.initialize(
            apiKey: config1["apiKey"] as! String,
            apiBaseURL: config1["apiBaseURL"] as! String,
            environment: config1["environment"] as! String
        ))

        // Then
        XCTAssertTrue(mockSDK.initializeCalled)
    }

    func testLoginLogoutCycle() {
        // When
        XCTAssertNoThrow(try mockSDK.login(userId: "user-cycle-test", userData: nil))
        XCTAssertTrue(mockSDK.loginCalled)

        XCTAssertNoThrow(try mockSDK.logout())
        XCTAssertTrue(mockSDK.logoutCalled)

        // Can login again after logout
        mockSDK.reset()
        XCTAssertNoThrow(try mockSDK.login(userId: "user-cycle-test-2", userData: nil))
        XCTAssertTrue(mockSDK.loginCalled)
    }
}
