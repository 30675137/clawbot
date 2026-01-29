import Foundation
import Testing
@testable import clawbot

@Suite(.serialized)
struct clawbotConfigFileTests {
    @Test
    func configPathRespectsEnvOverride() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("clawbot-config-\(UUID().uuidString)")
            .appendingPathComponent("clawbot.json")
            .path

        await TestIsolation.withEnvValues(["CLAWDBOT_CONFIG_PATH": override]) {
            #expect(clawbotConfigFile.url().path == override)
        }
    }

    @MainActor
    @Test
    func remoteGatewayPortParsesAndMatchesHost() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("clawbot-config-\(UUID().uuidString)")
            .appendingPathComponent("clawbot.json")
            .path

        await TestIsolation.withEnvValues(["CLAWDBOT_CONFIG_PATH": override]) {
            clawbotConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "ws://gateway.ts.net:19999",
                    ],
                ],
            ])
            #expect(clawbotConfigFile.remoteGatewayPort() == 19999)
            #expect(clawbotConfigFile.remoteGatewayPort(matchingHost: "gateway.ts.net") == 19999)
            #expect(clawbotConfigFile.remoteGatewayPort(matchingHost: "gateway") == 19999)
            #expect(clawbotConfigFile.remoteGatewayPort(matchingHost: "other.ts.net") == nil)
        }
    }

    @MainActor
    @Test
    func setRemoteGatewayUrlPreservesScheme() async {
        let override = FileManager().temporaryDirectory
            .appendingPathComponent("clawbot-config-\(UUID().uuidString)")
            .appendingPathComponent("clawbot.json")
            .path

        await TestIsolation.withEnvValues(["CLAWDBOT_CONFIG_PATH": override]) {
            clawbotConfigFile.saveDict([
                "gateway": [
                    "remote": [
                        "url": "wss://old-host:111",
                    ],
                ],
            ])
            clawbotConfigFile.setRemoteGatewayUrl(host: "new-host", port: 2222)
            let root = clawbotConfigFile.loadDict()
            let url = ((root["gateway"] as? [String: Any])?["remote"] as? [String: Any])?["url"] as? String
            #expect(url == "wss://new-host:2222")
        }
    }

    @Test
    func stateDirOverrideSetsConfigPath() async {
        let dir = FileManager().temporaryDirectory
            .appendingPathComponent("clawbot-state-\(UUID().uuidString)", isDirectory: true)
            .path

        await TestIsolation.withEnvValues([
            "CLAWDBOT_CONFIG_PATH": nil,
            "CLAWDBOT_STATE_DIR": dir,
        ]) {
            #expect(clawbotConfigFile.stateDirURL().path == dir)
            #expect(clawbotConfigFile.url().path == "\(dir)/clawbot.json")
        }
    }
}
