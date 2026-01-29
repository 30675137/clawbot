// swift-tools-version: 6.2
// Package manifest for the clawbot macOS companion (menu bar app + IPC library).

import PackageDescription

let package = Package(
    name: "clawbot",
    platforms: [
        .macOS(.v15),
    ],
    products: [
        .library(name: "clawbotIPC", targets: ["clawbotIPC"]),
        .library(name: "clawbotDiscovery", targets: ["clawbotDiscovery"]),
        .executable(name: "clawbot", targets: ["clawbot"]),
        .executable(name: "clawbot-mac", targets: ["clawbotMacCLI"]),
    ],
    dependencies: [
        .package(url: "https://github.com/orchetect/MenuBarExtraAccess", exact: "1.2.2"),
        .package(url: "https://github.com/swiftlang/swift-subprocess.git", from: "0.1.0"),
        .package(url: "https://github.com/apple/swift-log.git", from: "1.8.0"),
        .package(url: "https://github.com/sparkle-project/Sparkle", from: "2.8.1"),
        .package(url: "https://github.com/steipete/Peekaboo.git", branch: "main"),
        .package(path: "../shared/clawbotKit"),
        .package(path: "../../Swabble"),
    ],
    targets: [
        .target(
            name: "clawbotIPC",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .target(
            name: "clawbotDiscovery",
            dependencies: [
                .product(name: "clawbotKit", package: "clawbotKit"),
            ],
            path: "Sources/clawbotDiscovery",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "clawbot",
            dependencies: [
                "clawbotIPC",
                "clawbotDiscovery",
                .product(name: "clawbotKit", package: "clawbotKit"),
                .product(name: "clawbotChatUI", package: "clawbotKit"),
                .product(name: "clawbotProtocol", package: "clawbotKit"),
                .product(name: "SwabbleKit", package: "swabble"),
                .product(name: "MenuBarExtraAccess", package: "MenuBarExtraAccess"),
                .product(name: "Subprocess", package: "swift-subprocess"),
                .product(name: "Logging", package: "swift-log"),
                .product(name: "Sparkle", package: "Sparkle"),
                .product(name: "PeekabooBridge", package: "Peekaboo"),
                .product(name: "PeekabooAutomationKit", package: "Peekaboo"),
            ],
            exclude: [
                "Resources/Info.plist",
            ],
            resources: [
                .copy("Resources/clawbot.icns"),
                .copy("Resources/DeviceModels"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .executableTarget(
            name: "clawbotMacCLI",
            dependencies: [
                "clawbotDiscovery",
                .product(name: "clawbotKit", package: "clawbotKit"),
                .product(name: "clawbotProtocol", package: "clawbotKit"),
            ],
            path: "Sources/clawbotMacCLI",
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
            ]),
        .testTarget(
            name: "clawbotIPCTests",
            dependencies: [
                "clawbotIPC",
                "clawbot",
                "clawbotDiscovery",
                .product(name: "clawbotProtocol", package: "clawbotKit"),
                .product(name: "SwabbleKit", package: "swabble"),
            ],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableExperimentalFeature("SwiftTesting"),
            ]),
    ])
