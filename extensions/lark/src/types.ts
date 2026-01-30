import { z } from "zod";

// ============================================================================
// Configuration Types
// ============================================================================

export const LarkConfigSchema = z.object({
  appId: z.string().min(1, "App ID is required"),
  appSecret: z.string().min(1, "App Secret is required"),
  encryptKey: z.string().length(32).optional(),
  verificationToken: z.string().optional(),
});

export type LarkConfig = z.infer<typeof LarkConfigSchema>;

// ============================================================================
// Access Token Types
// ============================================================================

export interface LarkAccessToken {
  token: string;
  expiresAt: number; // timestamp in milliseconds
}

// ============================================================================
// Message Types
// ============================================================================

export const LarkMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
});

export type LarkMention = z.infer<typeof LarkMentionSchema>;

export const LarkMessageSchema = z.object({
  messageId: z.string(),
  chatId: z.string(),
  chatType: z.enum(["p2p", "group"]),
  senderId: z.string(),
  senderName: z.string(),
  msgType: z.string(),
  content: z.record(z.unknown()),
  mentions: z.array(LarkMentionSchema).optional(),
  createTime: z.number(),
});

export type LarkMessage = z.infer<typeof LarkMessageSchema>;

// ============================================================================
// Chat Types
// ============================================================================

export interface LarkChat {
  chatId: string;
  chatType: "p2p" | "group";
  name: string;
  ownerId?: string; // only for group
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export interface LarkWebhookEventHeader {
  event_id: string;
  event_type: string;
  create_time: string;
  token: string;
  app_id: string;
  tenant_key: string;
}

export interface LarkWebhookEvent {
  schema: string;
  header: LarkWebhookEventHeader;
  event: Record<string, unknown>;
}

export interface LarkChallengeEvent {
  challenge: string;
  token: string;
  type: "url_verification";
}

export interface LarkMessageReceiveEvent {
  schema: string;
  header: LarkWebhookEventHeader;
  event: {
    sender: {
      sender_id: {
        open_id: string;
        user_id?: string;
        union_id?: string;
      };
      sender_type: string;
      tenant_key: string;
    };
    message: {
      message_id: string;
      root_id?: string;
      parent_id?: string;
      create_time: string;
      chat_id: string;
      chat_type: "p2p" | "group";
      message_type: string;
      content: string; // JSON string
      mentions?: Array<{
        key: string;
        id: {
          open_id: string;
          user_id?: string;
          union_id?: string;
        };
        name: string;
      }>;
    };
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface LarkApiResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

export interface LarkTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number; // seconds
}

export interface LarkSendMessageResponse {
  message_id: string;
  root_id?: string;
  parent_id?: string;
  msg_type: string;
  create_time: string;
  update_time: string;
  deleted: boolean;
  chat_id: string;
  sender: {
    id: string;
    id_type: string;
    sender_type: string;
  };
  body: {
    content: string;
  };
}

export interface LarkUploadImageResponse {
  image_key: string;
}

// ============================================================================
// Message Content Types
// ============================================================================

export interface LarkTextContent {
  text: string;
}

export interface LarkImageContent {
  image_key: string;
}

export interface LarkFileContent {
  file_key: string;
  file_name: string;
}

export interface LarkPostContentElement {
  tag: "text" | "a" | "at" | "img";
  text?: string;
  href?: string;
  user_id?: string;
  image_key?: string;
}

export interface LarkPostContent {
  zh_cn?: {
    title?: string;
    content: LarkPostContentElement[][];
  };
  en_us?: {
    title?: string;
    content: LarkPostContentElement[][];
  };
}

// ============================================================================
// Error Codes
// ============================================================================

export const LarkErrorCodes = {
  SUCCESS: 0,
  APP_ID_NOT_EXIST: 10003,
  APP_SECRET_ERROR: 10014,
  INVALID_PARAMS: 99991400,
  AUTH_FAILED: 99991401,
  PERMISSION_DENIED: 99991402,
  RATE_LIMITED: 99991429,
} as const;

// ============================================================================
// Supported Message Types
// ============================================================================

export const SUPPORTED_MESSAGE_TYPES = ["text", "post", "image", "file"] as const;
export type SupportedMessageType = (typeof SUPPORTED_MESSAGE_TYPES)[number];

export function isSupportedMessageType(type: string): type is SupportedMessageType {
  return SUPPORTED_MESSAGE_TYPES.includes(type as SupportedMessageType);
}
