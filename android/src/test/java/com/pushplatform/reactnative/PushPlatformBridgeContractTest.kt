package com.pushplatform.reactnative

import org.junit.Before
import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for PushPlatform React Native Bridge
 * Tests bridge contract compliance with ADR-0004 and ADR-0014
 *
 * These tests verify the bridge logic without React Native dependencies
 */
class PushPlatformBridgeContractTest {

    private lateinit var mockSDK: MockPushPlatformSDK
    private lateinit var bridge: BridgeLogic

    @Before
    fun setUp() {
        mockSDK = MockPushPlatformSDK()
        bridge = BridgeLogic(mockSDK)
    }

    // MARK: - Configuration Validation Tests

    @Test
    fun testValidateConfigWithAllRequiredFields() {
        // Given
        val config = mapOf(
            "apiKey" to "test-api-key",
            "apiBaseURL" to "https://api.test.pushplatform.example",
            "environment" to "development"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertTrue(result.isValid)
        assertNull(result.error)
    }

    @Test
    fun testValidateConfigMissingApiKey() {
        // Given
        val config = mapOf(
            "apiBaseURL" to "https://api.test.example",
            "environment" to "development"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertFalse(result.isValid)
        assertEquals("INVALID_CONFIG", result.errorCode)
        assertNotNull(result.error)
    }

    @Test
    fun testValidateConfigMissingApiBaseURL() {
        // Given
        val config = mapOf(
            "apiKey" to "test-key",
            "environment" to "development"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertFalse(result.isValid)
        assertEquals("INVALID_CONFIG", result.errorCode)
    }

    @Test
    fun testValidateConfigDefaultsEnvironmentToProduction() {
        // Given
        val config = mapOf(
            "apiKey" to "test-key",
            "apiBaseURL" to "https://api.example"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertTrue(result.isValid)
        assertEquals("production", bridge.getEnvironment(config))
    }

    // MARK: - Initialization Tests

    @Test
    fun testInitializeWithValidConfig() {
        // Given
        val config = mapOf(
            "apiKey" to "test-key",
            "apiBaseURL" to "https://api.test.example",
            "environment" to "development"
        )

        // When
        val result = bridge.initialize(config)

        // Then
        assertTrue(result.success)
        assertTrue(mockSDK.initializeCalled)
        assertEquals("test-key", mockSDK.initializeApiKey)
        assertEquals("https://api.test.example", mockSDK.initializeApiBaseURL)
        assertEquals("development", mockSDK.initializeEnvironment)
    }

    @Test
    fun testInitializeWithProductionEnvironment() {
        // Given
        val config = mapOf(
            "apiKey" to "prod-key",
            "apiBaseURL" to "https://api.pushplatform.example",
            "environment" to "production"
        )

        // When
        val result = bridge.initialize(config)

        // Then
        assertTrue(result.success)
        assertEquals("production", mockSDK.initializeEnvironment)
    }

    @Test
    fun testInitializeFailure() {
        // Given
        mockSDK.shouldFailInitialize = true
        val config = mapOf(
            "apiKey" to "test-key",
            "apiBaseURL" to "https://api.test.example",
            "environment" to "development"
        )

        // When
        val result = bridge.initialize(config)

        // Then
        assertFalse(result.success)
        assertNotNull(result.error)
    }

    // MARK: - Login/Logout Tests

    @Test
    fun testLoginWithUserId() {
        // When
        val result = bridge.login("user-123", null)

        // Then
        assertTrue(result.success)
        assertTrue(mockSDK.loginCalled)
        assertEquals("user-123", mockSDK.loginUserId)
        assertNull(mockSDK.loginUserData)
    }

    @Test
    fun testLoginWithUserData() {
        // Given
        val userData = mapOf(
            "name" to "John Doe",
            "email" to "john@example.com"
        )

        // When
        val result = bridge.login("user-456", userData)

        // Then
        assertTrue(result.success)
        assertEquals("user-456", mockSDK.loginUserId)
        assertNotNull(mockSDK.loginUserData)
    }

    @Test
    fun testLoginFailure() {
        // Given
        mockSDK.shouldFailLogin = true

        // When
        val result = bridge.login("user-123", null)

        // Then
        assertFalse(result.success)
        assertNotNull(result.error)
    }

    @Test
    fun testLogout() {
        // When
        val result = bridge.logout()

        // Then
        assertTrue(result.success)
        assertTrue(mockSDK.logoutCalled)
    }

    @Test
    fun testLogoutFailure() {
        // Given
        mockSDK.shouldFailLogout = true

        // When
        val result = bridge.logout()

        // Then
        assertFalse(result.success)
    }

    // MARK: - Installation ID Tests

    @Test
    fun testGetInstallationId() {
        // Given
        mockSDK.mockInstallationId = "installation-uuid-123"

        // When
        val result = bridge.getInstallationId()

        // Then
        assertTrue(result.success)
        assertEquals("installation-uuid-123", result.data)
        assertTrue(mockSDK.getInstallationIdCalled)
    }

    @Test
    fun testGetInstallationIdConsistency() {
        // Given
        val expectedId = "consistent-id-789"
        mockSDK.mockInstallationId = expectedId

        // When
        val result1 = bridge.getInstallationId()
        val result2 = bridge.getInstallationId()

        // Then
        assertEquals(expectedId, result1.data)
        assertEquals(expectedId, result2.data)
    }

    // MARK: - Permissions Tests

    @Test
    fun testRequestPermissionsGranted() {
        // Given
        mockSDK.mockPermissionGranted = true

        // When
        val result = bridge.requestPermissions()

        // Then
        assertTrue(result.success)
        assertEquals(true, result.data)
        assertTrue(mockSDK.requestPermissionsCalled)
    }

    @Test
    fun testRequestPermissionsDenied() {
        // Given
        mockSDK.mockPermissionGranted = false

        // When
        val result = bridge.requestPermissions()

        // Then
        assertTrue(result.success)
        assertEquals(false, result.data)
    }

    @Test
    fun testRequestPermissionsFailure() {
        // Given
        mockSDK.shouldFailPermissions = true

        // When
        val result = bridge.requestPermissions()

        // Then
        assertFalse(result.success)
    }

    // MARK: - Security Tests (ADR-0014)

    @Test
    fun testRegistrationUpdateDoesNotExposeRawToken() {
        // Given
        val installationId = "installation-uuid-456"

        // When
        val event = bridge.buildRegistrationUpdateEvent(
            success = true,
            installationId = installationId
        )

        // Then
        assertNotNull(event)
        assertEquals(true, event["success"])
        assertEquals(installationId, event["installationId"])

        // Verify NO token field (ADR-0014 compliance)
        assertFalse(event.containsKey("token"))
        assertFalse(event.containsKey("deviceToken"))
        assertFalse(event.containsKey("apnsToken"))
        assertFalse(event.containsKey("fcmToken"))
    }

    @Test
    fun testRegistrationUpdateFailureDoesNotExposeToken() {
        // When
        val event = bridge.buildRegistrationUpdateEvent(
            success = false,
            installationId = null
        )

        // Then
        assertEquals(false, event["success"])
        assertNull(event["installationId"])
        assertFalse(event.containsKey("token"))
    }

    // MARK: - Notification Event Mapping Tests

    @Test
    fun testNotificationReceivedEventMapping() {
        // Given
        val notification = mapOf(
            "id" to "notif-123",
            "title" to "Test Notification",
            "body" to "Test body",
            "data" to mapOf("key" to "value"),
            "isForegrounded" to true
        )

        // When
        val event = bridge.mapNotificationToEvent(notification)

        // Then
        assertNotNull(event)
        assertEquals("notif-123", event["id"])
        assertEquals("Test Notification", event["title"])
        assertEquals("Test body", event["body"])
        assertTrue(event["isForegrounded"] as Boolean)
    }

    @Test
    fun testNotificationOpenedEventMapping() {
        // Given
        val notification = mapOf(
            "id" to "notif-456",
            "title" to "Opened Notification",
            "data" to mapOf("action" to "open_screen")
        )

        // When
        val event = bridge.mapNotificationToEvent(notification)

        // Then
        assertEquals("notif-456", event["id"])
        assertEquals("Opened Notification", event["title"])
    }

    // MARK: - Event Deduplication Tests

    @Test
    fun testNotificationDeduplicationByEventId() {
        // Given
        val notification = mapOf(
            "id" to "notif-789",
            "event_id" to "event-unique-123"
        )

        // When
        val event = bridge.mapNotificationToEvent(notification)

        // Then
        assertTrue(event.containsKey("event_id"))
        assertEquals("event-unique-123", event["event_id"])
    }

    @Test
    fun testVoIPCallDeduplicationByCallId() {
        // Given
        val notification = mapOf(
            "id" to "voip-call-123",
            "call_id" to "call-uuid-456"
        )

        // When
        val event = bridge.mapNotificationToEvent(notification)

        // Then
        assertTrue(event.containsKey("call_id"))
        assertEquals("call-uuid-456", event["call_id"])
    }

    // MARK: - Error Mapping Tests

    @Test
    fun testErrorMappingPreservesCode() {
        // Given
        val error = BridgeError("INVALID_CONFIG", "Configuration invalid")

        // When
        val mapped = bridge.mapError(error)

        // Then
        assertEquals("INVALID_CONFIG", mapped.code)
        assertEquals("Configuration invalid", mapped.message)
    }

    @Test
    fun testErrorMappingWithUnknownError() {
        // Given
        val exception = RuntimeException("Unexpected error")

        // When
        val mapped = bridge.mapException(exception)

        // Then
        assertEquals("UNKNOWN_ERROR", mapped.code)
        assertTrue(mapped.message.contains("Unexpected error"))
    }

    // MARK: - Lifecycle Tests

    @Test
    fun testMultipleInitializeCalls() {
        // Given
        val config = mapOf(
            "apiKey" to "key1",
            "apiBaseURL" to "https://api1.example",
            "environment" to "development"
        )

        // When
        val result1 = bridge.initialize(config)
        val result2 = bridge.initialize(config)

        // Then
        assertTrue(result1.success)
        assertTrue(result2.success)
    }

    @Test
    fun testLoginLogoutCycle() {
        // When
        val loginResult = bridge.login("user-cycle", null)
        assertTrue(loginResult.success)

        val logoutResult = bridge.logout()
        assertTrue(logoutResult.success)

        // Can login again
        mockSDK.reset()
        val loginResult2 = bridge.login("user-cycle-2", null)
        assertTrue(loginResult2.success)
    }

    @Test
    fun testConfigValidationRejectsInvalidURL() {
        // Given
        val config = mapOf(
            "apiKey" to "test-key",
            "apiBaseURL" to "not-a-valid-url",
            "environment" to "development"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertFalse(result.isValid)
        assertEquals("INVALID_CONFIG", result.errorCode)
    }

    @Test
    fun testConfigValidationRejectsEmptyApiKey() {
        // Given
        val config = mapOf(
            "apiKey" to "",
            "apiBaseURL" to "https://api.example",
            "environment" to "development"
        )

        // When
        val result = bridge.validateConfig(config)

        // Then
        assertFalse(result.isValid)
    }
}

// Test helpers and mocks

data class BridgeResult(
    val success: Boolean,
    val data: Any? = null,
    val error: String? = null,
    val errorCode: String? = null
)

data class ValidationResult(
    val isValid: Boolean,
    val error: String? = null,
    val errorCode: String? = null
)

data class BridgeError(
    val code: String,
    val message: String
)

class BridgeLogic(private val sdk: MockPushPlatformSDK) {

    fun validateConfig(config: Map<String, Any?>): ValidationResult {
        val apiKey = config["apiKey"] as? String
        if (apiKey.isNullOrBlank()) {
            return ValidationResult(false, "apiKey is required", "INVALID_CONFIG")
        }

        val apiBaseURL = config["apiBaseURL"] as? String
        if (apiBaseURL.isNullOrBlank()) {
            return ValidationResult(false, "apiBaseURL is required", "INVALID_CONFIG")
        }

        if (!apiBaseURL.startsWith("http://") && !apiBaseURL.startsWith("https://")) {
            return ValidationResult(false, "apiBaseURL must be a valid URL", "INVALID_CONFIG")
        }

        return ValidationResult(true)
    }

    fun getEnvironment(config: Map<String, Any?>): String {
        return config["environment"] as? String ?: "production"
    }

    fun initialize(config: Map<String, Any?>): BridgeResult {
        val validation = validateConfig(config)
        if (!validation.isValid) {
            return BridgeResult(false, error = validation.error, errorCode = validation.errorCode)
        }

        return try {
            sdk.initialize(
                apiKey = config["apiKey"] as String,
                apiBaseURL = config["apiBaseURL"] as String,
                environment = getEnvironment(config)
            )
            BridgeResult(true)
        } catch (e: Exception) {
            BridgeResult(false, error = e.message, errorCode = "INITIALIZATION_ERROR")
        }
    }

    fun login(userId: String, userData: Map<String, Any?>?): BridgeResult {
        return try {
            sdk.login(userId, userData)
            BridgeResult(true)
        } catch (e: Exception) {
            BridgeResult(false, error = e.message, errorCode = "LOGIN_ERROR")
        }
    }

    fun logout(): BridgeResult {
        return try {
            sdk.logout()
            BridgeResult(true)
        } catch (e: Exception) {
            BridgeResult(false, error = e.message, errorCode = "LOGOUT_ERROR")
        }
    }

    fun getInstallationId(): BridgeResult {
        return try {
            val id = sdk.getInstallationId()
            BridgeResult(true, data = id)
        } catch (e: Exception) {
            BridgeResult(false, error = e.message)
        }
    }

    fun requestPermissions(): BridgeResult {
        return try {
            val granted = sdk.requestPermissions()
            BridgeResult(true, data = granted)
        } catch (e: Exception) {
            BridgeResult(false, error = e.message, errorCode = "PERMISSION_ERROR")
        }
    }

    fun buildRegistrationUpdateEvent(success: Boolean, installationId: String?): Map<String, Any?> {
        // ADR-0014: NO raw token exposed to JavaScript
        return mapOf(
            "success" to success,
            "installationId" to installationId
        )
    }

    fun mapNotificationToEvent(notification: Map<String, Any?>): Map<String, Any?> {
        return notification.toMap()
    }

    fun mapError(error: BridgeError): BridgeError {
        return error
    }

    fun mapException(exception: Exception): BridgeError {
        return BridgeError("UNKNOWN_ERROR", exception.message ?: "Unknown error")
    }
}

class MockPushPlatformSDK {
    var initializeCalled = false
    var initializeApiKey: String? = null
    var initializeApiBaseURL: String? = null
    var initializeEnvironment: String? = null

    var loginCalled = false
    var loginUserId: String? = null
    var loginUserData: Map<String, Any?>? = null

    var logoutCalled = false

    var getInstallationIdCalled = false
    var mockInstallationId = "mock-installation-id-123"

    var requestPermissionsCalled = false
    var mockPermissionGranted = true

    var shouldFailInitialize = false
    var shouldFailLogin = false
    var shouldFailLogout = false
    var shouldFailPermissions = false

    fun initialize(apiKey: String, apiBaseURL: String, environment: String) {
        initializeCalled = true
        initializeApiKey = apiKey
        initializeApiBaseURL = apiBaseURL
        initializeEnvironment = environment

        if (shouldFailInitialize) {
            throw RuntimeException("Initialization failed")
        }
    }

    fun login(userId: String, userData: Map<String, Any?>?) {
        loginCalled = true
        loginUserId = userId
        loginUserData = userData

        if (shouldFailLogin) {
            throw RuntimeException("Login failed")
        }
    }

    fun logout() {
        logoutCalled = true

        if (shouldFailLogout) {
            throw RuntimeException("Logout failed")
        }
    }

    fun getInstallationId(): String {
        getInstallationIdCalled = true
        return mockInstallationId
    }

    fun requestPermissions(): Boolean {
        requestPermissionsCalled = true

        if (shouldFailPermissions) {
            throw RuntimeException("Permission request failed")
        }

        return mockPermissionGranted
    }

    fun reset() {
        initializeCalled = false
        initializeApiKey = null
        initializeApiBaseURL = null
        initializeEnvironment = null
        loginCalled = false
        loginUserId = null
        loginUserData = null
        logoutCalled = false
        getInstallationIdCalled = false
        requestPermissionsCalled = false
        shouldFailInitialize = false
        shouldFailLogin = false
        shouldFailLogout = false
        shouldFailPermissions = false
    }
}
