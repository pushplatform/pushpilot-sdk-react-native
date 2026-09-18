package com.pushplatform.sdk

import com.pushplatform.sdk.models.SdkError
import com.pushplatform.sdk.notifications.ParsedNotification
import java.util.UUID

enum class Environment {
    DEVELOPMENT,
    STAGING,
    PRODUCTION
}

interface PushPlatformDelegate {
    fun didInitialize(installationID: UUID)
    fun didUpdateRegistration()
    fun didUpdateFcmToken(token: String)
    fun didFailToRegisterFcmToken(error: SdkError)
    fun didReceiveNotification(notification: ParsedNotification)
    fun didFailWithError(error: Exception)
    fun onNotificationPermissionResult(granted: Boolean)
}

object PushPlatform {
    private var instance: PushPlatform? = null

    fun getInstance(): PushPlatform {
        if (instance == null) {
            instance = PushPlatform
        }
        return instance!!
    }

    var delegate: PushPlatformDelegate? = null
    private var configured = false
    private var installationID: UUID? = UUID.randomUUID()

    fun configure(
        apiKey: String,
        apiBaseURL: String,
        environment: Environment,
        debugMode: Boolean
    ) {
        configured = true
        installationID?.let { id ->
            delegate?.didInitialize(id)
        }
    }

    fun getInstallationID(): UUID? {
        return if (configured) installationID else null
    }
}
