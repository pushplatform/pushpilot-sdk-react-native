import XCTest
@testable import PushPlatform

/// Native unit test that reproduces the initialize → getInstallationId flow
/// without JavaScript, Metro, or TestApp UI.
///
/// This test directly calls production PushPlatformBridge methods to verify:
/// 1. Bridge initialize() calls SDK configure() and returns success
/// 2. Bridge getInstallationId() called immediately after returns UUID (not "SDK not initialized")
///
/// REPRODUCTION TEST for reported issue:
/// "initialize() succeeds, but getInstallationId() returns 'SDK not initialized'"
final class PushPlatformBridgeFlowTest: XCTestCase {

    var bridge: PushPlatformBridge!

    override func setUp() {
        super.setUp()
        // Create fresh bridge instance for each test
        bridge = PushPlatformBridge()
    }

    override func tearDown() {
        bridge = nil
        super.tearDown()
    }

    /// Test: initialize() → getInstallationId() flow
    /// This is the EXACT flow that TestApp executes via TypeScript.
    func testInitializeThenGetInstallationIdReturnsUUID() {
        // Arrange: configuration matching TestApp
        let config: NSDictionary = [
            "apiKey": "test-api-key",
            "environment": "development",
            "debugMode": true,
            // Note: apiBaseURL omitted (uses bridge default)
        ]

        var initializeResult: [String: Any]?
        var initializeError: (String, String)?
        let initializeExpectation = expectation(description: "initialize completes")

        // Act 1: Call bridge initialize()
        bridge.initialize(config,
                         resolver: { result in
                             initializeResult = result as? [String: Any]
                             initializeExpectation.fulfill()
                         },
                         rejecter: { code, message, _ in
                             initializeError = (code ?? "UNKNOWN", message ?? "Unknown error")
                             initializeExpectation.fulfill()
                         })

        wait(for: [initializeExpectation], timeout: 5.0)

        // Assert 1: initialize() succeeded
        XCTAssertNil(initializeError, "initialize() should not reject")
        XCTAssertNotNil(initializeResult, "initialize() should resolve with result")

        if let result = initializeResult {
            XCTAssertNotNil(result["installationId"], "initialize() result should contain installationId")
            XCTAssertEqual(result["platform"] as? String, "ios", "platform should be ios")
        }

        // Act 2: Call bridge getInstallationId() IMMEDIATELY after initialize()
        var getInstallationIdResult: String?
        var getInstallationIdError: (String, String)?
        let getIdExpectation = expectation(description: "getInstallationId completes")

        bridge.getInstallationId(
            resolve: { result in
                getInstallationIdResult = result as? String
                getIdExpectation.fulfill()
            },
            reject: { code, message, _ in
                getInstallationIdError = (code ?? "UNKNOWN", message ?? "Unknown error")
                getIdExpectation.fulfill()
            })

        wait(for: [getIdExpectation], timeout: 5.0)

        // Assert 2: getInstallationId() should return UUID, NOT "SDK not initialized"
        XCTAssertNil(getInstallationIdError, "getInstallationId() should not reject with 'SDK not initialized'")
        XCTAssertNotNil(getInstallationIdResult, "getInstallationId() should resolve with UUID")

        if let uuid = getInstallationIdResult {
            XCTAssertFalse(uuid.isEmpty, "UUID should not be empty")
            // Verify UUID format (8-4-4-4-12)
            let uuidPattern = "^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$"
            let regex = try! NSRegularExpression(pattern: uuidPattern, options: .caseInsensitive)
            let range = NSRange(uuid.startIndex..., in: uuid)
            let match = regex.firstMatch(in: uuid, options: [], range: range)
            XCTAssertNotNil(match, "Should be valid UUID v4 format, got: \(uuid)")
        }

        // PASS criteria:
        // ✅ initialize() resolved successfully
        // ✅ getInstallationId() resolved with valid UUID
        // ❌ getInstallationId() did NOT reject with "SDK not initialized"
    }

    /// Test: getInstallationId() BEFORE initialize() should fail
    func testGetInstallationIdBeforeInitializeReturnsError() {
        // Act: Call getInstallationId() without calling initialize() first
        var getInstallationIdResult: String?
        var getInstallationIdError: (String, String)?
        let expectation = self.expectation(description: "getInstallationId completes")

        bridge.getInstallationId(
            resolve: { result in
                getInstallationIdResult = result as? String
                expectation.fulfill()
            },
            reject: { code, message, _ in
                getInstallationIdError = (code ?? "UNKNOWN", message ?? "Unknown error")
                expectation.fulfill()
            })

        wait(for: [expectation], timeout: 5.0)

        // Assert: Should reject with "NOT_INITIALIZED"
        XCTAssertNotNil(getInstallationIdError, "getInstallationId() should reject when SDK not initialized")
        if let (code, message) = getInstallationIdError {
            XCTAssertEqual(code, "NOT_INITIALIZED", "Error code should be NOT_INITIALIZED")
            XCTAssertTrue(message.contains("not initialized"), "Error message should mention 'not initialized'")
        }
        XCTAssertNil(getInstallationIdResult, "getInstallationId() should not return UUID when not initialized")
    }
}
