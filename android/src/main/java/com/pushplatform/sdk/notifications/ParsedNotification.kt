package com.pushplatform.sdk.notifications

data class ParsedNotification(
    val title: String?,
    val body: String?,
    val data: Map<String, Any>
)
