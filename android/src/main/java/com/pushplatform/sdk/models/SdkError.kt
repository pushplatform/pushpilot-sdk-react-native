package com.pushplatform.sdk.models

data class SdkError(
    val code: String,
    override val message: String
) : Exception(message) {
    companion object {
        const val NETWORK_ERROR = "NETWORK_ERROR"
        const val INVALID_CONFIG = "INVALID_CONFIG"
        const val UNAUTHORIZED = "UNAUTHORIZED"
        const val NOT_INITIALIZED = "NOT_INITIALIZED"
        const val REGISTRATION_FAILED = "REGISTRATION_FAILED"
        const val INVALID_USER_ID = "INVALID_USER_ID"
        const val UNKNOWN_ERROR = "UNKNOWN_ERROR"
    }
}
