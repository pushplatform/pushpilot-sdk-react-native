import XCTest
@testable import PushPlatformBridge

/**
 * iOS Bridge Threading Test
 *
 * Verifies that race condition between initialize() and getInstallationId()
 * is fixed by ensuring both methods execute on main queue.
 *
 * Root Cause:
 * - initialize() used DispatchQueue.main.async
 * - getInstallationId() executed on calling thread (no dispatch)
 * - If getInstallationId() called from non-main thread before async block completed,
 *   it would read SDK state before configure() executed
 * - Result: "SDK not initialized" error despite initialize() appearing successful
 *
 * Fix:
 * - All bridge methods now use DispatchQueue.main.async for SDK access
 * - Guarantees serial execution order through main queue
 * - Eliminates cross-thread memory visibility issues
 */
class PushPlatformBridgeThreadingTest: XCTestCase {

    var bridge: PushPlatformBridge!

    override func setUp() {
        super.setUp()
        bridge = PushPlatformBridge()
    }

    override func tearDown() {
        bridge = nil
        super.tearDown()
    }

    /**
     * Test: initialize() followed immediately by getInstallationId() returns UUID
     *
     * Expected behavior:
     * 1. initialize() queues configure() to main queue
     * 2. getInstallationId() queues read to main queue
     * 3. Main queue executes in FIFO order: configure → read
     * 4. getInstallationId() sees configured=true and returns UUID
     *
     * Before fix: getInstallationId() could execute before configure() completed
     * After fix: both execute on main queue in correct order
     */
    func testInitializeThenGetInstallationIdReturnsUUID() {
        let expectation = XCTestExpectation(description: "Both methods complete")
        expectation.expectedFulfillmentCount = 2

        var initializeResult: String?
        var getInstallationIdResult: String?
        var getInstallationIdError: String?

        // Test config
        let config: NSDictionary = [
            "apiKey": "test-api-key-threading",
            "environment": "development",
            "debugMode": true
        ]

        // Act 1: Call initialize()
        bridge.initialize(
            config,
            resolver: { result in
                if let dict = result as? [String: Any],
                   let installationId = dict["installationId"] as? String {
                    initializeResult = installationId
                }
                expectation.fulfill()
            },
            rejecter: { code, message, error in
                XCTFail("initialize() rejected: \(code ?? "unknown") - \(message ?? "no message")")
                expectation.fulfill()
            }
        )

        // Act 2: Call getInstallationId() immediately after (simulates React Native)
        bridge.getInstallationId(
            resolve: { result in
                if let installationId = result as? String {
                    getInstallationIdResult = installationId
                }
                expectation.fulfill()
            },
            reject: { code, message, error in
                getInstallationIdError = "\(code ?? "unknown"): \(message ?? "no message")"
                expectation.fulfill()
            }
        )

        // Assert: Wait for both to complete
        wait(for: [expectation], timeout: 5.0)

        // Verify initialize() succeeded
        XCTAssertNotNil(initializeResult, "initialize() should return installationId")

        // Verify getInstallationId() succeeded (not "SDK not initialized")
        XCTAssertNotNil(getInstallationIdResult, "getInstallationId() should return UUID, got error: \(getInstallationIdError ?? "none")")
        XCTAssertNil(getInstallationIdError, "getInstallationId() should not reject")

        // Verify both return same UUID
        XCTAssertEqual(initializeResult, getInstallationIdResult, "Both methods should return same installationId")
    }

    /**
     * Test: getInstallationId() before initialize() correctly rejects
     *
     * Negative test: verify error handling still works correctly
     */
    func testGetInstallationIdBeforeInitializeRejects() {
        let expectation = XCTestExpectation(description: "getInstallationId rejects")

        var didReject = false
        var rejectionCode: String?

        bridge.getInstallationId(
            resolve: { result in
                XCTFail("getInstallationId() should reject when called before initialize()")
                expectation.fulfill()
            },
            reject: { code, message, error in
                didReject = true
                rejectionCode = code
                expectation.fulfill()
            }
        )

        wait(for: [expectation], timeout: 2.0)

        XCTAssertTrue(didReject, "Should reject when SDK not initialized")
        XCTAssertEqual(rejectionCode, "NOT_INITIALIZED", "Should return NOT_INITIALIZED error code")
    }
}
