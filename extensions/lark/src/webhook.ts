import * as crypto from "node:crypto";
import type {
  LarkChallengeEvent,
  LarkConfig,
  LarkMessageReceiveEvent,
  LarkWebhookEvent,
} from "./types.js";
import { isSupportedMessageType, SUPPORTED_MESSAGE_TYPES } from "./types.js";

// ============================================================================
// Event Type Guards
// ============================================================================

export function isChallengeEvent(body: unknown): body is LarkChallengeEvent {
  return (
    typeof body === "object" &&
    body !== null &&
    "type" in body &&
    (body as Record<string, unknown>).type === "url_verification"
  );
}

export function isMessageReceiveEvent(event: LarkWebhookEvent): event is LarkMessageReceiveEvent {
  return event.header?.event_type === "im.message.receive_v1";
}

// ============================================================================
// Challenge Handler
// ============================================================================

export function handleChallenge(body: LarkChallengeEvent): { challenge: string } {
  return { challenge: body.challenge };
}

// ============================================================================
// Signature Verification
// ============================================================================

export function verifySignature(
  body: string,
  timestamp: string,
  nonce: string,
  signature: string,
  encryptKey: string
): boolean {
  const content = timestamp + nonce + encryptKey + body;
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return hash === signature;
}

// ============================================================================
// Event Decryption (AES-256-CBC)
// ============================================================================

export function decryptEvent(encrypted: string, encryptKey: string): LarkWebhookEvent {
  // Lark uses AES-256-CBC with the encrypt key as both key and IV derivation
  const key = crypto.createHash("sha256").update(encryptKey).digest();

  // The encrypted content is base64 encoded
  const encryptedBuffer = Buffer.from(encrypted, "base64");

  // First 16 bytes are the IV
  const iv = encryptedBuffer.subarray(0, 16);
  const ciphertext = encryptedBuffer.subarray(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(ciphertext, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as LarkWebhookEvent;
}

// ============================================================================
// Message Event Processing
// ============================================================================

export interface ParsedLarkMessage {
  messageId: string;
  chatId: string;
  chatType: "p2p" | "group";
  senderId: string;
  senderType: string;
  messageType: string;
  content: Record<string, unknown>;
  mentions: Array<{
    key: string;
    id: string;
    name: string;
  }>;
  createTime: number;
  rootId?: string;
  parentId?: string;
  tenantKey: string;
  appId: string;
}

export function parseMessageEvent(event: LarkMessageReceiveEvent): ParsedLarkMessage {
  const { sender, message } = event.event;

  // Parse content JSON string
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(message.content) as Record<string, unknown>;
  } catch {
    console.warn("[lark] Failed to parse message content:", message.content);
  }

  // Parse mentions
  const mentions = (message.mentions ?? []).map((m) => ({
    key: m.key,
    id: m.id.open_id,
    name: m.name,
  }));

  return {
    messageId: message.message_id,
    chatId: message.chat_id,
    chatType: message.chat_type,
    senderId: sender.sender_id.open_id,
    senderType: sender.sender_type,
    messageType: message.message_type,
    content,
    mentions,
    createTime: parseInt(message.create_time, 10),
    rootId: message.root_id,
    parentId: message.parent_id,
    tenantKey: sender.tenant_key,
    appId: event.header.app_id,
  };
}

// ============================================================================
// Unsupported Message Type Handler
// ============================================================================

export interface UnsupportedMessageResult {
  supported: false;
  messageType: string;
  replyText: string;
}

export interface SupportedMessageResult {
  supported: true;
}

export type MessageSupportResult = SupportedMessageResult | UnsupportedMessageResult;

export function checkMessageTypeSupport(messageType: string): MessageSupportResult {
  if (isSupportedMessageType(messageType)) {
    return { supported: true };
  }

  const supportedList = SUPPORTED_MESSAGE_TYPES.join(", ");
  return {
    supported: false,
    messageType,
    replyText: `暂不支持此消息类型 (${messageType})。目前支持的类型: ${supportedList}`,
  };
}

// ============================================================================
// Webhook Request Handler
// ============================================================================

export interface WebhookHandlerConfig {
  config: LarkConfig;
  onMessage: (message: ParsedLarkMessage) => Promise<void>;
  onUnsupportedMessage?: (message: ParsedLarkMessage, replyText: string) => Promise<void>;
}

export interface WebhookHandlerResult {
  status: number;
  body?: unknown;
}

export async function handleWebhookRequest(
  rawBody: string,
  headers: Record<string, string | undefined>,
  handlerConfig: WebhookHandlerConfig
): Promise<WebhookHandlerResult> {
  const { config, onMessage, onUnsupportedMessage } = handlerConfig;

  // Parse body
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("[lark] Failed to parse webhook body");
    return { status: 400, body: { error: "Invalid JSON" } };
  }

  // Handle URL verification challenge
  if (isChallengeEvent(body)) {
    // Optionally verify token
    if (config.verificationToken && body.token !== config.verificationToken) {
      console.warn("[lark] Challenge token mismatch");
      return { status: 401, body: { error: "Invalid token" } };
    }
    return { status: 200, body: handleChallenge(body) };
  }

  // Handle encrypted events
  let event: LarkWebhookEvent;
  if (typeof body === "object" && body !== null && "encrypt" in body) {
    if (!config.encryptKey) {
      console.error("[lark] Received encrypted event but no encrypt key configured");
      return { status: 400, body: { error: "Encryption not configured" } };
    }
    try {
      event = decryptEvent((body as { encrypt: string }).encrypt, config.encryptKey);
    } catch (error) {
      console.error("[lark] Failed to decrypt event:", error);
      return { status: 400, body: { error: "Decryption failed" } };
    }
  } else {
    event = body as LarkWebhookEvent;
  }

  // Verify signature if configured
  if (config.encryptKey) {
    const timestamp = headers["x-lark-request-timestamp"];
    const nonce = headers["x-lark-request-nonce"];
    const signature = headers["x-lark-signature"];

    if (timestamp && nonce && signature) {
      if (!verifySignature(rawBody, timestamp, nonce, signature, config.encryptKey)) {
        console.warn("[lark] Signature verification failed");
        return { status: 401, body: { error: "Invalid signature" } };
      }
    }
  }

  // Verify token if configured (for non-encrypted events)
  if (config.verificationToken && event.header?.token !== config.verificationToken) {
    console.warn("[lark] Event token mismatch");
    return { status: 401, body: { error: "Invalid token" } };
  }

  // Handle message receive event
  if (isMessageReceiveEvent(event)) {
    const message = parseMessageEvent(event);

    // Check if message type is supported
    const supportResult = checkMessageTypeSupport(message.messageType);
    if (!supportResult.supported) {
      console.warn(`[lark] Unsupported message type: ${message.messageType}`);
      if (onUnsupportedMessage) {
        await onUnsupportedMessage(message, supportResult.replyText);
      }
      return { status: 200 };
    }

    // Process supported message
    try {
      await onMessage(message);
    } catch (error) {
      console.error("[lark] Error processing message:", error);
      // Still return 200 to prevent Lark from retrying
    }

    return { status: 200 };
  }

  // Unknown event type - acknowledge but don't process
  console.debug(`[lark] Ignoring event type: ${event.header?.event_type}`);
  return { status: 200 };
}
