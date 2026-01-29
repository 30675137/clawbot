import Foundation

public enum clawbotLocationMode: String, Codable, Sendable, CaseIterable {
    case off
    case whileUsing
    case always
}
