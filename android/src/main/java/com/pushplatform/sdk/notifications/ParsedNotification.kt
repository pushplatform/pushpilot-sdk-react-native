package com.pushplatform.sdk.notifications

data class ParsedNotification(
    val title: String?,
    val body: String?,
    val imageUrl: String?,
    val channelId: String?,
    val tag: String?,
    val eventId: String?,
    val callId: String?,
    val customData: Map<String, String>
)
