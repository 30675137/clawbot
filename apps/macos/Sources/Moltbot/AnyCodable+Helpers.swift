import clawbotKit
import clawbotProtocol
import Foundation

// Prefer the clawbotKit wrapper to keep gateway request payloads consistent.
typealias AnyCodable = clawbotKit.AnyCodable
typealias InstanceIdentity = clawbotKit.InstanceIdentity

extension AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: AnyCodable]? { self.value as? [String: AnyCodable] }
    var arrayValue: [AnyCodable]? { self.value as? [AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}

extension clawbotProtocol.AnyCodable {
    var stringValue: String? { self.value as? String }
    var boolValue: Bool? { self.value as? Bool }
    var intValue: Int? { self.value as? Int }
    var doubleValue: Double? { self.value as? Double }
    var dictionaryValue: [String: clawbotProtocol.AnyCodable]? { self.value as? [String: clawbotProtocol.AnyCodable] }
    var arrayValue: [clawbotProtocol.AnyCodable]? { self.value as? [clawbotProtocol.AnyCodable] }

    var foundationValue: Any {
        switch self.value {
        case let dict as [String: clawbotProtocol.AnyCodable]:
            dict.mapValues { $0.foundationValue }
        case let array as [clawbotProtocol.AnyCodable]:
            array.map(\.foundationValue)
        default:
            self.value
        }
    }
}
