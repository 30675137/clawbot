import {
  createReplyPrefixContext,
  createTypingCallbacks,
  logTypingFailure,
  type clawbotConfig,
  type RuntimeEnv,
} from "clawdbot/plugin-sdk";
import { getLarkRuntime } from "./runtime.js";
import { replyMessage, sendMessage, isSuccess, getErrorMessage } from "./api.js";
import { getAccessToken } from "./auth.js";
import type { LarkConfig } from "./types.js";

export interface LarkReplyDispatcherParams {
  cfg: clawbotConfig;
  larkConfig: LarkConfig;
  agentId: string;
  runtime: RuntimeEnv;
  log: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
    debug: (msg: string, meta?: Record<string, unknown>) => void;
  };
  chatId: string;
  messageId?: string;
  textLimit?: number;
}

export function createLarkReplyDispatcher(params: LarkReplyDispatcherParams) {
  const core = getLarkRuntime();
  const { cfg, larkConfig, agentId, runtime, log, chatId, messageId, textLimit = 4000 } = params;

  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      // Lark doesn't have a typing indicator API
    },
    onStartError: (err) => {
      logTypingFailure({
        log: (message) => log.debug(message),
        channel: "lark",
        action: "start",
        error: err,
      });
    },
  });

  const prefixContext = createReplyPrefixContext({
    cfg,
    agentId,
  });

  const chunkMode = core.channel.text.resolveChunkMode(cfg, "lark");

  const { dispatcher, replyOptions, markDispatchIdle } =
    core.channel.reply.createReplyDispatcherWithTyping({
      responsePrefix: prefixContext.responsePrefix,
      responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
      humanDelay: core.channel.reply.resolveHumanDelayConfig(cfg, agentId),
      deliver: async (payload) => {
        const text = payload.text || "";
        if (!text.trim()) return;

        // Get access token
        const token = await getAccessToken(larkConfig);

        // Split long messages
        const chunks = splitText(text, textLimit);

        for (const chunk of chunks) {
          let result;
          if (messageId) {
            // Reply to the original message
            result = await replyMessage({
              token,
              messageId,
              msgType: "text",
              content: JSON.stringify({ text: chunk }),
            });
          } else {
            // Send as new message
            result = await sendMessage({
              token,
              receiveId: chatId,
              receiveIdType: chatId.startsWith("oc_") ? "chat_id" : "open_id",
              msgType: "text",
              content: JSON.stringify({ text: chunk }),
            });
          }

          if (!isSuccess(result)) {
            throw new Error(getErrorMessage(result));
          }
        }
      },
      onError: (err, info) => {
        const errMsg = err instanceof Error ? err.message : String(err);
        runtime.error?.(`lark ${info.kind} reply failed: ${errMsg}`);
        log.error("reply failed", {
          kind: info.kind,
          error: errMsg,
        });
      },
      onReplyStart: typingCallbacks.onReplyStart,
    });

  return {
    dispatcher,
    replyOptions: { ...replyOptions, onModelSelected: prefixContext.onModelSelected },
    markDispatchIdle,
  };
}

function splitText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline or space
    let splitIndex = remaining.lastIndexOf("\n", limit);
    if (splitIndex === -1 || splitIndex < limit * 0.5) {
      splitIndex = remaining.lastIndexOf(" ", limit);
    }
    if (splitIndex === -1 || splitIndex < limit * 0.5) {
      splitIndex = limit;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}
