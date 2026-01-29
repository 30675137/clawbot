import Foundation

public enum clawbotBonjour {
    // v0: internal-only, subject to rename.
    public static let gatewayServiceType = "_clawbot-gw._tcp"
    public static let gatewayServiceDomain = "local."
    public static let wideAreaGatewayServiceDomain = "clawbot.internal."

    public static let gatewayServiceDomains = [
        gatewayServiceDomain,
        wideAreaGatewayServiceDomain,
    ]

    public static func normalizeServiceDomain(_ raw: String?) -> String {
        let trimmed = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return self.gatewayServiceDomain
        }

        let lower = trimmed.lowercased()
        if lower == "local" || lower == "local." {
            return self.gatewayServiceDomain
        }

        return lower.hasSuffix(".") ? lower : (lower + ".")
    }
}
