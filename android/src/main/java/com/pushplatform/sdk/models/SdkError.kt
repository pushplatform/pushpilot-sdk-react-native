package com.pushplatform.sdk.models

sealed class SdkError : Exception() {
    object NotConfigured : SdkError() {
        override val message: String = "SDK not configured. Call PushPlatform.configure() first."
    }

    data class NetworkError(val underlying: Throwable) : SdkError() {
        override val message: String = "Network error: ${underlying.message}"
    }

    data class ApiError(val statusCode: Int, override val message: String) : SdkError()

    object InvalidToken : SdkError() {
        override val message: String = "Invalid or malformed token"
    }

    object MaxRetriesExceeded : SdkError() {
        override val message: String = "Maximum retry attempts exceeded"
    }

    object StorageError : SdkError() {
        override val message: String = "Failed to access secure storage"
    }
}
