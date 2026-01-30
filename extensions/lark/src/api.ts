import type {
  LarkApiResponse,
  LarkSendMessageResponse,
  LarkTokenResponse,
  LarkUploadImageResponse,
} from "./types.js";
import { LarkErrorCodes } from "./types.js";

const LARK_API_BASE = "https://open.feishu.cn/open-apis";

// ============================================================================
// Retry Configuration
// ============================================================================

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 32000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// HTTP Client
// ============================================================================

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  token?: string;
  body?: unknown;
  query?: Record<string, string>;
}

async function request<T>(options: RequestOptions): Promise<LarkApiResponse<T>> {
  const { method, path, token, body, query } = options;

  let url = `${LARK_API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;
  let retryDelay = INITIAL_RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = (await response.json()) as LarkApiResponse<T>;

      // Handle rate limiting with exponential backoff
      if (data.code === LarkErrorCodes.RATE_LIMITED || response.status === 429) {
        if (attempt < MAX_RETRIES) {
          console.warn(`[lark] Rate limited, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
          continue;
        }
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        console.warn(`[lark] Request failed, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError ?? new Error("Request failed after max retries");
}

// ============================================================================
// Authentication API
// ============================================================================

export async function getTenantAccessToken(appId: string, appSecret: string): Promise<LarkTokenResponse> {
  const response = await fetch(`${LARK_API_BASE}/auth/v3/tenant_access_token/internal/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  return (await response.json()) as LarkTokenResponse;
}

// ============================================================================
// Message API
// ============================================================================

export interface SendMessageParams {
  token: string;
  receiveId: string;
  receiveIdType: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  msgType: string;
  content: string; // JSON string
}

export async function sendMessage(params: SendMessageParams): Promise<LarkApiResponse<LarkSendMessageResponse>> {
  const { token, receiveId, receiveIdType, msgType, content } = params;

  return request<LarkSendMessageResponse>({
    method: "POST",
    path: "/im/v1/messages",
    token,
    query: { receive_id_type: receiveIdType },
    body: {
      receive_id: receiveId,
      msg_type: msgType,
      content,
    },
  });
}

export interface ReplyMessageParams {
  token: string;
  messageId: string;
  msgType: string;
  content: string; // JSON string
}

export async function replyMessage(params: ReplyMessageParams): Promise<LarkApiResponse<LarkSendMessageResponse>> {
  const { token, messageId, msgType, content } = params;

  return request<LarkSendMessageResponse>({
    method: "POST",
    path: `/im/v1/messages/${messageId}/reply`,
    token,
    body: {
      msg_type: msgType,
      content,
    },
  });
}

// ============================================================================
// Media API
// ============================================================================

export async function uploadImage(token: string, imageData: Buffer | Blob): Promise<LarkApiResponse<LarkUploadImageResponse>> {
  const formData = new FormData();
  formData.append("image_type", "message");

  if (imageData instanceof Buffer) {
    formData.append("image", new Blob([imageData]));
  } else {
    formData.append("image", imageData);
  }

  const response = await fetch(`${LARK_API_BASE}/im/v1/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return (await response.json()) as LarkApiResponse<LarkUploadImageResponse>;
}

export async function downloadResource(
  token: string,
  messageId: string,
  fileKey: string,
  type: "image" | "file"
): Promise<ArrayBuffer> {
  const url = `${LARK_API_BASE}/im/v1/messages/${messageId}/resources/${fileKey}?type=${type}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download resource: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

// ============================================================================
// Error Helpers
// ============================================================================

export function isSuccess(response: LarkApiResponse): boolean {
  return response.code === LarkErrorCodes.SUCCESS;
}

export function getErrorMessage(response: LarkApiResponse): string {
  switch (response.code) {
    case LarkErrorCodes.APP_ID_NOT_EXIST:
      return "App ID does not exist";
    case LarkErrorCodes.APP_SECRET_ERROR:
      return "App Secret is incorrect";
    case LarkErrorCodes.INVALID_PARAMS:
      return "Invalid request parameters";
    case LarkErrorCodes.AUTH_FAILED:
      return "Authentication failed";
    case LarkErrorCodes.PERMISSION_DENIED:
      return "Permission denied";
    case LarkErrorCodes.RATE_LIMITED:
      return "Rate limited";
    default:
      return response.msg || `Unknown error (code: ${response.code})`;
  }
}
