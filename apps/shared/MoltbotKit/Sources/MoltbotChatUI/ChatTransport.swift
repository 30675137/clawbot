import Foundation

public enum clawbotChatTransportEvent: Sendable {
    case health(ok: Bool)
    case tick
    case chat(clawbotChatEventPayload)
    case agent(clawbotAgentEventPayload)
    case seqGap
}

public protocol clawbotChatTransport: Sendable {
    func requestHistory(sessionKey: String) async throws -> clawbotChatHistoryPayload
    func sendMessage(
        sessionKey: String,
        message: String,
        thinking: String,
        idempotencyKey: String,
        attachments: [clawbotChatAttachmentPayload]) async throws -> clawbotChatSendResponse

    func abortRun(sessionKey: String, runId: String) async throws
    func listSessions(limit: Int?) async throws -> clawbotChatSessionsListResponse

    func requestHealth(timeoutMs: Int) async throws -> Bool
    func events() -> AsyncStream<clawbotChatTransportEvent>

    func setActiveSessionKey(_ sessionKey: String) async throws
}

extension clawbotChatTransport {
    public func setActiveSessionKey(_: String) async throws {}

    public func abortRun(sessionKey _: String, runId _: String) async throws {
        throw NSError(
            domain: "clawbotChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "chat.abort not supported by this transport"])
    }

    public func listSessions(limit _: Int?) async throws -> clawbotChatSessionsListResponse {
        throw NSError(
            domain: "clawbotChatTransport",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "sessions.list not supported by this transport"])
    }
}
