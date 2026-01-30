import type { ParsedLarkMessage } from "./webhook.js";
import type {
  LarkTextContent,
  LarkPostContent,
  LarkImageContent,
  LarkFileContent,
  LarkPostContentElement,
} from "./types.js";

// ============================================================================
// Internal Message Format (Clawbot standard)
// ============================================================================

export interface InternalMessage {
  id: string;
  channel: "lark";
  chatId: string;
  chatType: "dm" | "group";
  senderId: string;
  senderName?: string;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "file";
  replyToId?: string;
  threadId?: string;
  mentions: Array<{ id: string; name: string }>;
  timestamp: number;
  raw: ParsedLarkMessage;
}

// ============================================================================
// Lark → Internal Conversion
// ============================================================================

export function larkToInternal(message: ParsedLarkMessage): InternalMessage {
  const text = extractTextContent(message);
  const mediaInfo = extractMediaInfo(message);

  return {
    id: message.messageId,
    channel: "lark",
    chatId: message.chatId,
    chatType: message.chatType === "p2p" ? "dm" : "group",
    senderId: message.senderId,
    text,
    mediaUrl: mediaInfo?.url,
    mediaType: mediaInfo?.type,
    replyToId: message.parentId,
    threadId: message.rootId,
    mentions: message.mentions.map((m) => ({ id: m.id, name: m.name })),
    timestamp: message.createTime,
    raw: message,
  };
}

function extractTextContent(message: ParsedLarkMessage): string {
  const { messageType, content, mentions } = message;

  switch (messageType) {
    case "text": {
      let text = (content as LarkTextContent).text ?? "";
      // Replace mention placeholders with actual names
      for (const mention of mentions) {
        text = text.replace(mention.key, `@${mention.name}`);
      }
      return text;
    }

    case "post": {
      return extractPostText(content as LarkPostContent, mentions);
    }

    case "image":
    case "file":
      // Media messages may not have text
      return "";

    default:
      return "";
  }
}

function extractPostText(
  post: LarkPostContent,
  mentions: Array<{ key: string; id: string; name: string }>
): string {
  // Try zh_cn first, then en_us
  const postContent = post.zh_cn ?? post.en_us;
  if (!postContent) return "";

  const lines: string[] = [];

  if (postContent.title) {
    lines.push(postContent.title);
    lines.push("");
  }

  for (const paragraph of postContent.content) {
    const parts: string[] = [];
    for (const element of paragraph) {
      parts.push(extractPostElementText(element, mentions));
    }
    lines.push(parts.join(""));
  }

  return lines.join("\n").trim();
}

function extractPostElementText(
  element: LarkPostContentElement,
  mentions: Array<{ key: string; id: string; name: string }>
): string {
  switch (element.tag) {
    case "text":
      return element.text ?? "";

    case "a":
      return element.text ? `[${element.text}](${element.href ?? ""})` : "";

    case "at": {
      const mention = mentions.find((m) => m.id === element.user_id);
      return mention ? `@${mention.name}` : "@user";
    }

    case "img":
      return "[图片]";

    default:
      return "";
  }
}

function extractMediaInfo(
  message: ParsedLarkMessage
): { url: string; type: "image" | "file" } | null {
  const { messageType, content, messageId } = message;

  switch (messageType) {
    case "image": {
      const imageKey = (content as LarkImageContent).image_key;
      if (imageKey) {
        // Return a reference that can be used to download later
        return {
          url: `lark://message/${messageId}/image/${imageKey}`,
          type: "image",
        };
      }
      return null;
    }

    case "file": {
      const fileKey = (content as LarkFileContent).file_key;
      if (fileKey) {
        return {
          url: `lark://message/${messageId}/file/${fileKey}`,
          type: "file",
        };
      }
      return null;
    }

    default:
      return null;
  }
}

// ============================================================================
// Internal → Lark Conversion
// ============================================================================

export interface OutboundMessage {
  text: string;
  mediaUrl?: string;
  replyToId?: string;
  mentionUserIds?: string[];
}

export interface LarkOutboundMessage {
  msgType: string;
  content: string; // JSON string
}

export function internalToLark(message: OutboundMessage): LarkOutboundMessage {
  // If there's media, handle it separately (requires upload first)
  // For now, just handle text messages

  const text = message.text;

  // Check if we should use rich text (post) format
  if (shouldUsePostFormat(text) || message.mentionUserIds?.length) {
    return formatAsPost(text, message.mentionUserIds);
  }

  // Simple text message
  return {
    msgType: "text",
    content: JSON.stringify({ text }),
  };
}

function shouldUsePostFormat(text: string): boolean {
  // Use post format for:
  // - Code blocks
  // - Multiple paragraphs
  // - Links
  return (
    text.includes("```") ||
    text.includes("\n\n") ||
    /\[.+\]\(.+\)/.test(text)
  );
}

function formatAsPost(text: string, mentionUserIds?: string[]): LarkOutboundMessage {
  const content: LarkPostContentElement[][] = [];

  // Add mentions at the beginning if any
  if (mentionUserIds?.length) {
    const mentionElements: LarkPostContentElement[] = mentionUserIds.map((userId) => ({
      tag: "at" as const,
      user_id: userId,
    }));
    mentionElements.push({ tag: "text", text: " " });
    content.push(mentionElements);
  }

  // Parse text into post elements
  const paragraphs = text.split("\n\n");
  for (const paragraph of paragraphs) {
    const elements = parseTextToPostElements(paragraph);
    if (elements.length > 0) {
      content.push(elements);
    }
  }

  const postContent: LarkPostContent = {
    zh_cn: {
      content,
    },
  };

  return {
    msgType: "post",
    content: JSON.stringify(postContent),
  };
}

function parseTextToPostElements(text: string): LarkPostContentElement[] {
  const elements: LarkPostContentElement[] = [];

  // Handle code blocks
  if (text.startsWith("```") && text.endsWith("```")) {
    const code = text.slice(3, -3).replace(/^\w+\n/, ""); // Remove language hint
    elements.push({ tag: "text", text: code });
    return elements;
  }

  // Handle inline links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      elements.push({ tag: "text", text: text.slice(lastIndex, match.index) });
    }

    // Add the link
    elements.push({
      tag: "a",
      text: match[1],
      href: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push({ tag: "text", text: text.slice(lastIndex) });
  }

  // If no elements were added, just add the whole text
  if (elements.length === 0) {
    elements.push({ tag: "text", text });
  }

  return elements;
}

// ============================================================================
// Long Message Splitting
// ============================================================================

const MAX_MESSAGE_LENGTH = 4000;

export function splitLongMessage(text: string, maxLength: number = MAX_MESSAGE_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a good split point
    let splitIndex = findSplitPoint(remaining, maxLength);

    // If no good split point found, force split at maxLength
    if (splitIndex <= 0) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks;
}

function findSplitPoint(text: string, maxLength: number): number {
  // Try to split at paragraph boundary
  const paragraphEnd = text.lastIndexOf("\n\n", maxLength);
  if (paragraphEnd > maxLength * 0.5) {
    return paragraphEnd + 2;
  }

  // Try to split at sentence boundary
  const sentenceEnders = ["。", "！", "？", ".", "!", "?"];
  for (let i = maxLength; i > maxLength * 0.5; i--) {
    if (sentenceEnders.includes(text[i])) {
      return i + 1;
    }
  }

  // Try to split at line boundary
  const lineEnd = text.lastIndexOf("\n", maxLength);
  if (lineEnd > maxLength * 0.5) {
    return lineEnd + 1;
  }

  // Try to split at word boundary (space)
  const spaceIndex = text.lastIndexOf(" ", maxLength);
  if (spaceIndex > maxLength * 0.5) {
    return spaceIndex + 1;
  }

  // No good split point found
  return -1;
}

// ============================================================================
// Text Content Formatting
// ============================================================================

export function formatTextContent(text: string): string {
  return JSON.stringify({ text });
}

export function formatImageContent(imageKey: string): string {
  return JSON.stringify({ image_key: imageKey });
}

// ============================================================================
// Group Message Helpers
// ============================================================================

/**
 * Check if the bot is mentioned in the message.
 * @param message The parsed Lark message
 * @param botOpenId The bot's open_id (optional, if not provided checks for any @mention)
 */
export function isBotMentioned(message: ParsedLarkMessage, botOpenId?: string): boolean {
  if (!message.mentions || message.mentions.length === 0) {
    return false;
  }

  if (botOpenId) {
    return message.mentions.some((m) => m.id === botOpenId);
  }

  // If no botOpenId provided, check if there are any mentions
  return message.mentions.length > 0;
}

/**
 * Extract the sender's open_id for @mentioning in reply.
 */
export function getSenderForMention(message: ParsedLarkMessage): string {
  return message.senderId;
}

/**
 * Check if this is a group message.
 */
export function isGroupMessage(message: ParsedLarkMessage): boolean {
  return message.chatType === "group";
}

/**
 * Check if this is a direct message (private chat).
 */
export function isDirectMessage(message: ParsedLarkMessage): boolean {
  return message.chatType === "p2p";
}
