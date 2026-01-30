import { describe, expect, it } from "vitest";

import {
  isChallengeEvent,
  isMessageReceiveEvent,
  handleChallenge,
  verifySignature,
  parseMessageEvent,
  checkMessageTypeSupport,
} from "./webhook.js";
import type { LarkMessageReceiveEvent, LarkWebhookEvent } from "./types.js";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockMessageReceiveEvent(
  overrides: Partial<LarkMessageReceiveEvent> = {}
): LarkMessageReceiveEvent {
  return {
    schema: "2.0",
    header: {
      event_id: "evt_test_123",
      event_type: "im.message.receive_v1",
      create_time: "1704067200000",
      token: "test_token",
      app_id: "cli_test_app",
      tenant_key: "tenant_123",
    },
    event: {
      sender: {
        sender_id: {
          open_id: "ou_sender_123",
          user_id: "user_123",
          union_id: "union_123",
        },
        sender_type: "user",
        tenant_key: "tenant_123",
      },
      message: {
        message_id: "om_msg_123",
        create_time: "1704067200000",
        chat_id: "oc_chat_456",
        chat_type: "p2p",
        message_type: "text",
        content: '{"text":"Hello, world!"}',
      },
    },
    ...overrides,
  };
}

// ============================================================================
// isChallengeEvent Tests
// ============================================================================

describe("isChallengeEvent", () => {
  it("returns true for valid challenge event", () => {
    const event = {
      type: "url_verification",
      challenge: "test_challenge_string",
      token: "test_token",
    };
    expect(isChallengeEvent(event)).toBe(true);
  });

  it("returns false for message event", () => {
    const event = createMockMessageReceiveEvent();
    expect(isChallengeEvent(event)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isChallengeEvent(null)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isChallengeEvent("string")).toBe(false);
    expect(isChallengeEvent(123)).toBe(false);
  });

  it("returns false for object without type field", () => {
    expect(isChallengeEvent({ challenge: "test" })).toBe(false);
  });

  it("returns false for wrong type value", () => {
    expect(isChallengeEvent({ type: "other_type", challenge: "test" })).toBe(false);
  });
});

// ============================================================================
// isMessageReceiveEvent Tests
// ============================================================================

describe("isMessageReceiveEvent", () => {
  it("returns true for message receive event", () => {
    const event = createMockMessageReceiveEvent();
    expect(isMessageReceiveEvent(event)).toBe(true);
  });

  it("returns false for other event types", () => {
    const event: LarkWebhookEvent = {
      schema: "2.0",
      header: {
        event_id: "evt_test",
        event_type: "im.chat.member.user.added_v1",
        create_time: "1704067200000",
        token: "test_token",
        app_id: "cli_test_app",
        tenant_key: "tenant_123",
      },
      event: {},
    };
    expect(isMessageReceiveEvent(event)).toBe(false);
  });

  it("returns false for event without header", () => {
    const event = { schema: "2.0", event: {} } as unknown as LarkWebhookEvent;
    expect(isMessageReceiveEvent(event)).toBe(false);
  });
});

// ============================================================================
// handleChallenge Tests
// ============================================================================

describe("handleChallenge", () => {
  it("returns challenge string in response", () => {
    const event = {
      type: "url_verification" as const,
      challenge: "test_challenge_abc123",
      token: "test_token",
    };

    const result = handleChallenge(event);

    expect(result).toEqual({ challenge: "test_challenge_abc123" });
  });
});

// ============================================================================
// verifySignature Tests
// ============================================================================

describe("verifySignature", () => {
  it("returns true for valid signature", () => {
    // Pre-computed test case
    const body = '{"test":"data"}';
    const timestamp = "1704067200";
    const nonce = "test_nonce";
    const encryptKey = "12345678901234567890123456789012";

    // Compute expected signature: sha256(timestamp + nonce + encryptKey + body)
    const crypto = require("node:crypto");
    const content = timestamp + nonce + encryptKey + body;
    const expectedSignature = crypto.createHash("sha256").update(content).digest("hex");

    const result = verifySignature(body, timestamp, nonce, expectedSignature, encryptKey);

    expect(result).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = '{"test":"data"}';
    const timestamp = "1704067200";
    const nonce = "test_nonce";
    const encryptKey = "12345678901234567890123456789012";
    const wrongSignature = "invalid_signature_hash";

    const result = verifySignature(body, timestamp, nonce, wrongSignature, encryptKey);

    expect(result).toBe(false);
  });

  it("returns false when body is tampered", () => {
    const originalBody = '{"test":"data"}';
    const tamperedBody = '{"test":"tampered"}';
    const timestamp = "1704067200";
    const nonce = "test_nonce";
    const encryptKey = "12345678901234567890123456789012";

    const crypto = require("node:crypto");
    const content = timestamp + nonce + encryptKey + originalBody;
    const signature = crypto.createHash("sha256").update(content).digest("hex");

    const result = verifySignature(tamperedBody, timestamp, nonce, signature, encryptKey);

    expect(result).toBe(false);
  });
});

// ============================================================================
// parseMessageEvent Tests
// ============================================================================

describe("parseMessageEvent", () => {
  it("parses text message correctly", () => {
    const event = createMockMessageReceiveEvent();

    const result = parseMessageEvent(event);

    expect(result.messageId).toBe("om_msg_123");
    expect(result.chatId).toBe("oc_chat_456");
    expect(result.chatType).toBe("p2p");
    expect(result.senderId).toBe("ou_sender_123");
    expect(result.senderType).toBe("user");
    expect(result.messageType).toBe("text");
    expect(result.content).toEqual({ text: "Hello, world!" });
    expect(result.createTime).toBe(1704067200000);
    expect(result.tenantKey).toBe("tenant_123");
    expect(result.appId).toBe("cli_test_app");
  });

  it("parses group message correctly", () => {
    const event = createMockMessageReceiveEvent();
    event.event.message.chat_type = "group";

    const result = parseMessageEvent(event);

    expect(result.chatType).toBe("group");
  });

  it("parses mentions correctly", () => {
    const event = createMockMessageReceiveEvent();
    event.event.message.mentions = [
      {
        key: "@_user_1",
        id: { open_id: "ou_mentioned_123", user_id: "user_m1" },
        name: "Alice",
      },
      {
        key: "@_user_2",
        id: { open_id: "ou_mentioned_456", user_id: "user_m2" },
        name: "Bob",
      },
    ];

    const result = parseMessageEvent(event);

    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0]).toEqual({
      key: "@_user_1",
      id: "ou_mentioned_123",
      name: "Alice",
    });
    expect(result.mentions[1]).toEqual({
      key: "@_user_2",
      id: "ou_mentioned_456",
      name: "Bob",
    });
  });

  it("parses reply message with parent and root IDs", () => {
    const event = createMockMessageReceiveEvent();
    event.event.message.root_id = "om_root_123";
    event.event.message.parent_id = "om_parent_456";

    const result = parseMessageEvent(event);

    expect(result.rootId).toBe("om_root_123");
    expect(result.parentId).toBe("om_parent_456");
  });

  it("handles invalid JSON content gracefully", () => {
    const event = createMockMessageReceiveEvent();
    event.event.message.content = "invalid json {{{";

    const result = parseMessageEvent(event);

    expect(result.content).toEqual({});
  });

  it("handles missing mentions", () => {
    const event = createMockMessageReceiveEvent();
    delete event.event.message.mentions;

    const result = parseMessageEvent(event);

    expect(result.mentions).toEqual([]);
  });
});

// ============================================================================
// checkMessageTypeSupport Tests
// ============================================================================

describe("checkMessageTypeSupport", () => {
  it("returns supported for text messages", () => {
    const result = checkMessageTypeSupport("text");
    expect(result.supported).toBe(true);
  });

  it("returns supported for post messages", () => {
    const result = checkMessageTypeSupport("post");
    expect(result.supported).toBe(true);
  });

  it("returns supported for image messages", () => {
    const result = checkMessageTypeSupport("image");
    expect(result.supported).toBe(true);
  });

  it("returns supported for file messages", () => {
    const result = checkMessageTypeSupport("file");
    expect(result.supported).toBe(true);
  });

  it("returns unsupported for audio messages", () => {
    const result = checkMessageTypeSupport("audio");

    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.messageType).toBe("audio");
      expect(result.replyText).toContain("暂不支持此消息类型");
      expect(result.replyText).toContain("audio");
    }
  });

  it("returns unsupported for video messages", () => {
    const result = checkMessageTypeSupport("video");

    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.messageType).toBe("video");
    }
  });

  it("returns unsupported for sticker messages", () => {
    const result = checkMessageTypeSupport("sticker");

    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.messageType).toBe("sticker");
    }
  });

  it("returns unsupported for share_chat messages", () => {
    const result = checkMessageTypeSupport("share_chat");

    expect(result.supported).toBe(false);
  });

  it("includes supported types in reply text", () => {
    const result = checkMessageTypeSupport("unknown_type");

    expect(result.supported).toBe(false);
    if (!result.supported) {
      expect(result.replyText).toContain("text");
      expect(result.replyText).toContain("post");
      expect(result.replyText).toContain("image");
      expect(result.replyText).toContain("file");
    }
  });
});
