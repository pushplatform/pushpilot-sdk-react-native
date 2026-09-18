// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "PushPlatformBridgeTests",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "PushPlatformBridgeTests",
            targets: ["PushPlatformBridgeTests"])
    ],
    dependencies: [],
    targets: [
        .testTarget(
            name: "PushPlatformBridgeTests",
            dependencies: [],
            path: "PushPlatformBridgeTests")
    ]
)
