import Foundation

public enum clawbotCameraCommand: String, Codable, Sendable {
    case list = "camera.list"
    case snap = "camera.snap"
    case clip = "camera.clip"
}

public enum clawbotCameraFacing: String, Codable, Sendable {
    case back
    case front
}

public enum clawbotCameraImageFormat: String, Codable, Sendable {
    case jpg
    case jpeg
}

public enum clawbotCameraVideoFormat: String, Codable, Sendable {
    case mp4
}

public struct clawbotCameraSnapParams: Codable, Sendable, Equatable {
    public var facing: clawbotCameraFacing?
    public var maxWidth: Int?
    public var quality: Double?
    public var format: clawbotCameraImageFormat?
    public var deviceId: String?
    public var delayMs: Int?

    public init(
        facing: clawbotCameraFacing? = nil,
        maxWidth: Int? = nil,
        quality: Double? = nil,
        format: clawbotCameraImageFormat? = nil,
        deviceId: String? = nil,
        delayMs: Int? = nil)
    {
        self.facing = facing
        self.maxWidth = maxWidth
        self.quality = quality
        self.format = format
        self.deviceId = deviceId
        self.delayMs = delayMs
    }
}

public struct clawbotCameraClipParams: Codable, Sendable, Equatable {
    public var facing: clawbotCameraFacing?
    public var durationMs: Int?
    public var includeAudio: Bool?
    public var format: clawbotCameraVideoFormat?
    public var deviceId: String?

    public init(
        facing: clawbotCameraFacing? = nil,
        durationMs: Int? = nil,
        includeAudio: Bool? = nil,
        format: clawbotCameraVideoFormat? = nil,
        deviceId: String? = nil)
    {
        self.facing = facing
        self.durationMs = durationMs
        self.includeAudio = includeAudio
        self.format = format
        self.deviceId = deviceId
    }
}
