// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "PushPlatformBridge",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "PushPlatformBridge",
            targets: ["PushPlatformBridge"]
        )
    ],
    targets: [
        .target(
            name: "PushPlatformBridge",
            path: ".",
            sources: [
                "PushPlatformBridge.swift",
                "PushPlatformSDKMock.swift",
                "Tests/ReactNativeMocks.swift"
            ],
            swiftSettings: [
                .define("TESTING")
            ]
        ),
        .testTarget(
            name: "PushPlatformBridgeTests",
            dependencies: ["PushPlatformBridge"],
            path: "Tests",
            exclude: [
                "ReactNativeMocks.swift",
                "PushPlatformBridgeFlowTest.swift",
                "PushPlatformBridgeInitTests.swift"
            ],
            sources: ["PushPlatformBridgeThreadingTest.swift"]
        )
    ]
)
