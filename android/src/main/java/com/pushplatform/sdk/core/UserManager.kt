package com.pushplatform.sdk.core

import com.pushplatform.sdk.models.SdkError

class UserManager(
    private val apiClient: Any,
    private val installationManager: Any
) {

    fun login(userId: String, callback: (Result<Unit>) -> Unit) {
        // Mock implementation - just succeed
        callback(Result.Success(Unit))
    }

    fun logout(callback: (Result<Unit>) -> Unit) {
        // Mock implementation - just succeed
        callback(Result.Success(Unit))
    }

    sealed class Result<out T> {
        data class Success<T>(val value: T) : Result<T>()
        data class Failure(val error: SdkError) : Result<Nothing>()
    }
}
