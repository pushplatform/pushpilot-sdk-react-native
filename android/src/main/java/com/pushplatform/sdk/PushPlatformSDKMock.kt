package com.pushplatform.sdk

import android.content.Context
import com.pushplatform.sdk.models.SdkError
import com.pushplatform.sdk.notifications.ParsedNotification
import java.util.UUID

enum class Environment {
    DEVELOPMENT,
    PRODUCTION
}

data class PushConfiguration(
    val apiKey: String,
    val environment: Environment = Environment.PRODUCTION,
    val debugMode: Boolean = false
)

interface PushPlatformDelegate {
    fun didInitialize(installationId: String)
    fun didUpdateFcmToken() {}
    fun didFailToRegisterFcmToken(error: SdkError) {}
    fun didReceiveNotification(notification: ParsedNotification, isInForeground: Boolean) {}
    fun onNotificationPermissionResult(granted: Boolean) {}
}

class PushPlatform private constructor() {

    private var configuration: PushConfiguration? = null
    private var installationId: String? = UUID.randomUUID().toString()

    var delegate: PushPlatformDelegate? = null

    fun configure(
        context: Context,
        apiKey: String,
        environment: Environment = Environment.PRODUCTION,
        debugMode: Boolean = false
    ) {
        configuration = PushConfiguration(
            apiKey = apiKey,
            environment = environment,
            debugMode = debugMode
        )

        // Simulate initialization
        installationId?.let { id ->
            delegate?.didInitialize(id)
        }
    }

    fun getInstallationId(): String? {
        return installationId
    }

    fun isConfigured(): Boolean {
        return configuration != null
    }

    fun login(userId: String, callback: (com.pushplatform.sdk.core.UserManager.Result<Unit>) -> Unit) {
        // Mock implementation - just succeed
        callback(com.pushplatform.sdk.core.UserManager.Result.Success(Unit))
    }

    fun logout(callback: (com.pushplatform.sdk.core.UserManager.Result<Unit>) -> Unit) {
        // Mock implementation - just succeed
        callback(com.pushplatform.sdk.core.UserManager.Result.Success(Unit))
    }

    companion object {
        @Volatile
        private var instance: PushPlatform? = null

        fun getInstance(): PushPlatform {
            return instance ?: synchronized(this) {
                instance ?: PushPlatform().also { instance = it }
            }
        }
    }
}
