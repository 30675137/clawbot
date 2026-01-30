import { describe, expect, it } from "vitest";

import {
  larkToInternal,
  internalToLark,
  splitLongMessage,
  formatTextContent,
  formatImageContent,
  isBotMentioned,
  isGroupMessage,
  isDirectMessage,
  getSenderForMention,
} from "./message.js";
import type { ParsedLarkMessage } from "./webhook.js";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockMessage(overrides: Partial<ParsedLarkMessage> = {}): ParsedLarkMessage {
  return {
    messageId: "om_test_123",
    chatId: "oc_test_456",
    chatType: "p2p",
    senderId: "ou_test_789",
    senderType: "user",
    messageType: "text",
    content: { text: "Hello, world!" },
    mentions: [],
    createTime: 1704067200000,
    tenantKey: "tenant_123",
    appId: "cli_test_app",
    ...overrides,
  };
}

// ============================================================================
// larkToInternal Tests
// ============================================================================

describe("larkToInternal", () => {
  it("converts text message to internal format", () => {
    const message = createMockMessage({
      messageType: "text",
      content: { text: "Hello, world!" },
    });

    const result = larkToInternal(message);

    expect(result.id).toBe("om_test_123");
    expect(result.channel).toBe("lark");
    expect(result.chatId).toBe("oc_test_456");
    expect(result.chatType).toBe("dm");
    expect(result.senderId).toBe("ou_test_789");
    expect(result.text).toBe("Hello, world!");
    expect(result.timestamp).toBe(1704067200000);
  });

  it("converts group chat type correctly", () => {
    const message = createMockMessage({ chatType: "group" });

    const result = larkToInternal(message);

    expect(result.chatType).toBe("group");
  });

  it("replaces mention placeholders with names", () => {
    const message = createMockMessage({
      messageType: "text",
      content: { text: "Hello @_user_1, how are you?" },
      mentions: [{ key: "@_user_1", id: "ou_mention_123", name: "Alice" }],
    });

    const result = larkToInternal(message);

    expect(result.text).toBe("Hello @Alice, how are you?");
  });

  it("extracts image media info", () => {
    const message = createMockMessage({
      messageType: "image",
      content: { image_key: "img_v2_test_key" },
    });

    const result = larkToInternal(message);

    expect(result.mediaType).toBe("image");
    expect(result.mediaUrl).toBe("lark://message/om_test_123/image/img_v2_test_key");
    expect(result.text).toBe("");
  });

  it("extracts file media info", () => {
    const message = createMockMessage({
      messageType: "file",
      content: { file_key: "file_v2_test_key", file_name: "document.pdf" },
    });

    const result = larkToInternal(message);

    expect(result.mediaType).toBe("file");
    expect(result.mediaUrl).toBe("lark://message/om_test_123/file/file_v2_test_key");
  });

  it("preserves reply and thread IDs", () => {
    const message = createMockMessage({
      parentId: "om_parent_123",
      rootId: "om_root_456",
    });

    const result = larkToInternal(message);

    expect(result.replyToId).toBe("om_parent_123");
    expect(result.threadId).toBe("om_root_456");
  });

  it("converts post message with title", () => {
    const message = createMockMessage({
      messageType: "post",
      content: {
        zh_cn: {
          title: "公告标题",
          content: [[{ tag: "text", text: "这是正文内容" }]],
        },
      },
    });

    const result = larkToInternal(message);

    expect(result.text).toContain("公告标题");
    expect(result.text).toContain("这是正文内容");
  });

  it("converts post message with links", () => {
    const message = createMockMessage({
      messageType: "post",
      content: {
        zh_cn: {
          content: [
            [
              { tag: "text", text: "点击 " },
              { tag: "a", text: "这里", href: "https://example.com" },
              { tag: "text", text: " 查看详情" },
            ],
          ],
        },
      },
    });

    const result = larkToInternal(message);

    expect(result.text).toBe("点击 [这里](https://example.com) 查看详情");
  });

  it("converts post message with @mentions", () => {
    const message = createMockMessage({
      messageType: "post",
      content: {
        zh_cn: {
          content: [[{ tag: "at", user_id: "ou_user_123" }]],
        },
      },
      mentions: [{ key: "@_user_1", id: "ou_user_123", name: "Bob" }],
    });

    const result = larkToInternal(message);

    expect(result.text).toBe("@Bob");
  });
});

// ============================================================================
// internalToLark Tests
// ============================================================================

describe("internalToLark", () => {
  it("converts simple text to text message", () => {
    const result = internalToLark({ text: "Hello, world!" });

    expect(result.msgType).toBe("text");
    expect(JSON.parse(result.content)).toEqual({ text: "Hello, world!" });
  });

  it("converts text with code blocks to post format", () => {
    const text = "Here is some code:\n```\nconst x = 1;\n```";
    const result = internalToLark({ text });

    expect(result.msgType).toBe("post");
  });

  it("converts text with multiple paragraphs to post format", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    const result = internalToLark({ text });

    expect(result.msgType).toBe("post");
  });

  it("converts text with links to post format", () => {
    const text = "Check out [this link](https://example.com)";
    const result = internalToLark({ text });

    expect(result.msgType).toBe("post");
    const content = JSON.parse(result.content);
    expect(content.zh_cn.content).toBeDefined();
  });

  it("adds mentions at the beginning of post", () => {
    const result = internalToLark({
      text: "Hello everyone!",
      mentionUserIds: ["ou_user_123", "ou_user_456"],
    });

    expect(result.msgType).toBe("post");
    const content = JSON.parse(result.content);
    const firstParagraph = content.zh_cn.content[0];
    expect(firstParagraph[0]).toEqual({ tag: "at", user_id: "ou_user_123" });
    expect(firstParagraph[1]).toEqual({ tag: "at", user_id: "ou_user_456" });
  });
});

// ============================================================================
// splitLongMessage Tests
// ============================================================================

describe("splitLongMessage", () => {
  it("returns single chunk for short messages", () => {
    const text = "Short message";
    const result = splitLongMessage(text);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Short message");
  });

  it("splits at paragraph boundary", () => {
    const text = "A".repeat(3000) + "\n\n" + "B".repeat(1500);
    const result = splitLongMessage(text, 4000);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).not.toContain("B");
  });

  it("splits at sentence boundary when no paragraph break", () => {
    const text = "A".repeat(3500) + "。" + "B".repeat(1000);
    const result = splitLongMessage(text, 4000);

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("splits at line boundary when no sentence break", () => {
    const text = "A".repeat(3500) + "\n" + "B".repeat(1000);
    const result = splitLongMessage(text, 4000);

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("force splits when no good break point", () => {
    const text = "A".repeat(5000);
    const result = splitLongMessage(text, 4000);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].length).toBeLessThanOrEqual(4000);
  });

  it("handles Chinese sentence enders", () => {
    const text = "这是一段很长的中文文本" + "啊".repeat(3500) + "！" + "继续".repeat(500);
    const result = splitLongMessage(text, 4000);

    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("respects custom max length", () => {
    const text = "A".repeat(200);
    const result = splitLongMessage(text, 100);

    expect(result.length).toBe(2);
    expect(result[0].length).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Format Helpers Tests
// ============================================================================

describe("formatTextContent", () => {
  it("formats text as JSON string", () => {
    const result = formatTextContent("Hello");
    expect(result).toBe('{"text":"Hello"}');
  });

  it("escapes special characters", () => {
    const result = formatTextContent('Hello "world"');
    expect(JSON.parse(result)).toEqual({ text: 'Hello "world"' });
  });
});

describe("formatImageContent", () => {
  it("formats image key as JSON string", () => {
    const result = formatImageContent("img_v2_key_123");
    expect(result).toBe('{"image_key":"img_v2_key_123"}');
  });
});

// ============================================================================
// Group Message Helpers Tests
// ============================================================================

describe("isBotMentioned", () => {
  it("returns false when no mentions", () => {
    const message = createMockMessage({ mentions: [] });
    expect(isBotMentioned(message)).toBe(false);
  });

  it("returns true when bot is mentioned by open_id", () => {
    const message = createMockMessage({
      mentions: [{ key: "@_user_1", id: "ou_bot_123", name: "Bot" }],
    });
    expect(isBotMentioned(message, "ou_bot_123")).toBe(true);
  });

  it("returns false when different user is mentioned", () => {
    const message = createMockMessage({
      mentions: [{ key: "@_user_1", id: "ou_other_user", name: "Other" }],
    });
    expect(isBotMentioned(message, "ou_bot_123")).toBe(false);
  });

  it("returns true when any mention exists and no botOpenId provided", () => {
    const message = createMockMessage({
      mentions: [{ key: "@_user_1", id: "ou_someone", name: "Someone" }],
    });
    expect(isBotMentioned(message)).toBe(true);
  });
});

describe("isGroupMessage", () => {
  it("returns true for group chat", () => {
    const message = createMockMessage({ chatType: "group" });
    expect(isGroupMessage(message)).toBe(true);
  });

  it("returns false for p2p chat", () => {
    const message = createMockMessage({ chatType: "p2p" });
    expect(isGroupMessage(message)).toBe(false);
  });
});

describe("isDirectMessage", () => {
  it("returns true for p2p chat", () => {
    const message = createMockMessage({ chatType: "p2p" });
    expect(isDirectMessage(message)).toBe(true);
  });

  it("returns false for group chat", () => {
    const message = createMockMessage({ chatType: "group" });
    expect(isDirectMessage(message)).toBe(false);
  });
});

describe("getSenderForMention", () => {
  it("returns sender open_id", () => {
    const message = createMockMessage({ senderId: "ou_sender_123" });
    expect(getSenderForMention(message)).toBe("ou_sender_123");
  });
});
