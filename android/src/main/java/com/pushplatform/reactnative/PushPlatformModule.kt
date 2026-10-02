package com.pushplatform.reactnative

import android.Manifest
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.pushplatform.sdk.Environment
import com.pushplatform.sdk.PushPlatform
import com.pushplatform.sdk.PushPlatformDelegate
import com.pushplatform.sdk.core.UserManager
import com.pushplatform.sdk.models.SdkError
import com.pushplatform.sdk.notifications.ParsedNotification

class PushPlatformModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PushPlatformDelegate {

    private val pushPlatform = PushPlatform.getInstance()
    private var permissionPromise: Promise? = null
    private val permissionRequestCode = 1001
    private val permissionListener = PermissionListener { requestCode, _, grantResults ->
        if (requestCode != permissionRequestCode) {
            false
        } else {
            pushPlatform.onRequestPermissionsResult(requestCode, grantResults)
            permissionPromise?.resolve(
                grantResults.firstOrNull() == android.content.pm.PackageManager.PERMISSION_GRANTED
            )
            permissionPromise = null
            true
        }
    }

    init {
        pushPlatform.delegate = this
    }

    override fun getName(): String {
        return "PushPlatformBridge"
    }

    @ReactMethod
    fun initialize(config: ReadableMap, promise: Promise) {
        try {
            val apiKey = config.getString("apiKey")
                ?: return promise.reject("INVALID_CONFIG", "Missing apiKey")

            val environmentString = config.getString("environment")
                ?: return promise.reject("INVALID_CONFIG", "Missing environment")

            val environment = when (environmentString.lowercase()) {
                "development" -> Environment.DEVELOPMENT
                "production" -> Environment.PRODUCTION
                else -> return promise.reject("INVALID_ENVIRONMENT", "Invalid environment value")
            }

            val debugMode = config.getBoolean("debugMode")
            val applicationId = config.getString("applicationId")
            val apiBaseURL = config.getString("apiBaseURL")

            pushPlatform.configure(
                context = reactApplicationContext,
                apiKey = apiKey,
                environment = environment,
                debugMode = debugMode,
                apiBaseUrl = apiBaseURL,
                applicationId = applicationId,
                completion = { result ->
                    result.fold(
                        onSuccess = { installationId ->
                            val response = Arguments.createMap().apply {
                                putString("installationId", installationId)
                                putString("platform", "android")
                            }
                            promise.resolve(response)
                        },
                        onFailure = { error ->
                            val code = (error as? SdkError)?.let(::errorCode) ?: "INITIALIZATION_FAILED"
                            promise.reject(code, error.message, error)
                        }
                    )
                }
            )
        } catch (e: Exception) {
            promise.reject("INITIALIZATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun login(userId: String, userData: ReadableMap?, promise: Promise) {
        pushPlatform.login(userId) { result ->
            when (result) {
                is UserManager.Result.Success -> promise.resolve(null)
                is UserManager.Result.Failure -> {
                    promise.reject(
                        errorCode(result.error),
                        result.error.message,
                        result.error
                    )
                }
            }
        }
    }

    @ReactMethod
    fun logout(promise: Promise) {
        pushPlatform.logout { result ->
            when (result) {
                is UserManager.Result.Success -> promise.resolve(null)
                is UserManager.Result.Failure -> {
                    promise.reject(
                        errorCode(result.error),
                        result.error.message,
                        result.error
                    )
                }
            }
        }
    }

    @ReactMethod
    fun getInstallationId(promise: Promise) {
        val installationId = pushPlatform.getInstallationId()
        if (installationId != null) {
            promise.resolve(installationId)
        } else {
            promise.reject("NOT_INITIALIZED", "SDK not initialized")
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || pushPlatform.hasNotificationPermission()) {
            promise.resolve(true)
            return
        }

        val activity = currentActivity as? PermissionAwareActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "A foreground activity is required to request notification permission")
            return
        }
        if (permissionPromise != null) {
            promise.reject("PERMISSION_IN_PROGRESS", "A notification permission request is already in progress")
            return
        }

        permissionPromise = promise
        activity.requestPermissions(
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            permissionRequestCode,
            permissionListener
        )
    }

    @ReactMethod
    fun getPermissionStatus(promise: Promise) {
        val status = if (pushPlatform.hasNotificationPermission()) "granted" else "denied"
        promise.resolve(status)
    }

    private fun errorCode(error: SdkError): String {
        return when (error) {
            is SdkError.NotConfigured -> "NOT_CONFIGURED"
            is SdkError.NetworkError -> "NETWORK_ERROR"
            is SdkError.ApiError -> "API_ERROR"
            is SdkError.InvalidToken -> "INVALID_TOKEN"
            is SdkError.MaxRetriesExceeded -> "MAX_RETRIES_EXCEEDED"
            is SdkError.StorageError -> "STORAGE_ERROR"
        }
    }

    private fun serializeNotification(notification: ParsedNotification): WritableMap {
        return Arguments.createMap().apply {
            notification.title?.let { putString("title", it) }
            notification.body?.let { putString("body", it) }
            notification.eventId?.let { putString("id", it) }
            notification.callId?.let { putString("callId", it) }

            val dataMap = Arguments.createMap()
            notification.customData.forEach { (key, value) ->
                dataMap.putString(key, value)
            }
            putMap("data", dataMap)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // MARK: - PushPlatformDelegate

    override fun didInitialize(installationId: String) {
        // Already handled in initialize() method
    }

    override fun didUpdateFcmToken() {
        val body = Arguments.createMap().apply {
            putBoolean("success", true)
            putString("type", "fcm")
        }
        sendEvent("onRegistrationUpdated", body)
    }

    override fun didFailToRegisterFcmToken(error: SdkError) {
        val errorMap = Arguments.createMap().apply {
            putString("code", errorCode(error))
            putString("message", error.message ?: "Unknown error")
        }
        val body = Arguments.createMap().apply {
            putBoolean("success", false)
            putMap("error", errorMap)
        }
        sendEvent("onRegistrationUpdated", body)
    }

    override fun didReceiveNotification(notification: ParsedNotification, isInForeground: Boolean) {
        val body = Arguments.createMap().apply {
            putMap("notification", serializeNotification(notification))
            putBoolean("foreground", isInForeground)
        }
        sendEvent("onNotificationReceived", body)
    }

    override fun onNotificationPermissionResult(granted: Boolean) {
        // Not exposed to JS per ADR-0014 - permission checks handled by native SDK
    }
}
