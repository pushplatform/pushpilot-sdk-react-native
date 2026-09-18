package com.pushplatform.sdk.core

object UserManager {
    fun login(userID: String, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        try {
            onSuccess()
        } catch (e: Exception) {
            onError(e)
        }
    }

    fun logout(onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        try {
            onSuccess()
        } catch (e: Exception) {
            onError(e)
        }
    }
}
