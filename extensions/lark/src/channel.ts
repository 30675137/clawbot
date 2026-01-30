import type { ChannelPlugin } from "clawdbot/plugin-sdk";
import type { LarkConfig } from "./types.js";
import { validateCredentials, hasValidToken, getAccessToken } from "./auth.js";
import { getLarkRuntime } from "./runtime.js";
import { handleWebhookRequest, type ParsedLarkMessage } from "./webhook.js";
import { larkToInternal, internalToLark, splitLongMessage } from "./message.js";
import { sendMessage, replyMessage, uploadImage, downloadResource, isSuccess, getErrorMessage } from "./api.js";
import { formatImageContent } from "./message.js";

// ============================================================================
// Account Resolution Types
// ============================================================================

export interface LarkAccount {
  accountId: string;
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
  enabled?: boolean;
}

// ============================================================================
// Config Helpers
// ============================================================================

function getConfigPath(accountId: string): string {
  return `channels.lark.accounts.${accountId}`;
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return secret.slice(0, 4) + "****" + secret.slice(-4);
}

// ============================================================================
// Channel Plugin Implementation
// ============================================================================

export const larkPlugin: ChannelPlugin<LarkAccount> = {
  id: "lark",

  meta: {
    id: "lark",
    label: "飞书",
    selectionLabel: "飞书 (Lark)",
    docsPath: "/channels/lark",
    blurb: "Connect to Lark/Feishu for enterprise messaging",
    order: 50,
    aliases: ["feishu", "lark"],
    systemImage: "message.badge.filled.fill",
  },

  capabilities: {
    chatTypes: ["dm", "group"],
    media: true,
    reply: true,
    threads: false,
  },

  // ============================================================================
  // Config Adapter
  // ============================================================================

  config: {
    listAccountIds(cfg) {
      const accounts = cfg.channels?.lark?.accounts as Record<string, unknown> | undefined;
      if (!accounts || typeof accounts !== "object") return ["default"];
      const ids = Object.keys(accounts);
      return ids.length > 0 ? ids : ["default"];
    },

    defaultAccountId(cfg) {
      const accounts = this.listAccountIds(cfg);
      return accounts[0] ?? "default";
    },

    resolveAccount(cfg, accountId) {
      const id = accountId ?? this.defaultAccountId?.(cfg) ?? "default";
      const raw = cfg.channels?.lark?.accounts?.[id] as Record<string, unknown> | undefined;

      if (!raw) {
        return {
          accountId: id,
          appId: "",
          appSecret: "",
          enabled: false,
        };
      }

      return {
        accountId: id,
        appId: (raw.appId as string) ?? "",
        appSecret: (raw.appSecret as string) ?? "",
        encryptKey: raw.encryptKey as string | undefined,
        verificationToken: raw.verificationToken as string | undefined,
        enabled: raw.enabled !== false,
      };
    },

    isEnabled(account) {
      return account.enabled !== false && !!account.appId && !!account.appSecret;
    },

    isConfigured(account) {
      return !!account.appId && !!account.appSecret;
    },

    unconfiguredReason(account) {
      if (!account.appId) return "Missing App ID";
      if (!account.appSecret) return "Missing App Secret";
      return "Not configured";
    },

    setAccountEnabled({ cfg, accountId, enabled }) {
      const path = `${getConfigPath(accountId)}.enabled`;
      return cfg.set(path, enabled);
    },

    deleteAccount({ cfg, accountId }) {
      const path = getConfigPath(accountId);
      return cfg.delete(path);
    },

    describeAccount(account, cfg) {
      const config: LarkConfig | null =
        account.appId && account.appSecret
          ? { appId: account.appId, appSecret: account.appSecret }
          : null;

      return {
        accountId: account.accountId,
        name: account.appId ? `App: ${maskSecret(account.appId)}` : undefined,
        enabled: account.enabled,
        configured: !!account.appId && !!account.appSecret,
        connected: config ? hasValidToken(config) : false,
      };
    },
  },

  // ============================================================================
  // Setup Adapter
  // ============================================================================

  setup: {
    resolveAccountId({ accountId }) {
      return accountId ?? "default";
    },

    applyAccountConfig({ cfg, accountId, input }) {
      const path = getConfigPath(accountId);
      const current = cfg.get(path) as Record<string, unknown> | undefined;

      const updated = {
        ...current,
        enabled: true,
      };

      // Map setup input to config
      if (input.token) {
        // token could be appId:appSecret format
        const parts = input.token.split(":");
        if (parts.length === 2) {
          updated.appId = parts[0];
          updated.appSecret = parts[1];
        }
      }

      return cfg.set(path, updated);
    },
  },

  // ============================================================================
  // Status Adapter
  // ============================================================================

  status: {
    async probeAccount({ account }) {
      if (!account.appId || !account.appSecret) {
        return { ok: false, error: "Not configured" };
      }

      const config: LarkConfig = {
        appId: account.appId,
        appSecret: account.appSecret,
      };

      const result = await validateCredentials(config);
      return result.valid ? { ok: true } : { ok: false, error: result.error };
    },

    buildAccountSnapshot({ account, probe }) {
      const probeResult = probe as { ok: boolean; error?: string } | undefined;

      return {
        accountId: account.accountId,
        name: account.appId ? `App: ${maskSecret(account.appId)}` : undefined,
        enabled: account.enabled,
        configured: !!account.appId && !!account.appSecret,
        connected: probeResult?.ok ?? false,
        lastError: probeResult?.error ?? null,
      };
    },

    resolveAccountState({ configured, enabled }) {
      if (!configured) return "not configured";
      if (!enabled) return "disabled";
      return "configured";
    },
  },

  // ============================================================================
  // Onboarding Adapter
  // ============================================================================

  onboarding: {
    channel: "lark",

    async getStatus({ cfg, accountOverrides }) {
      const accountId = accountOverrides.lark ?? "default";
      const account = larkPlugin.config.resolveAccount(cfg, accountId);
      const configured = !!account.appId && !!account.appSecret;

      const statusLines: string[] = [];
      if (configured) {
        statusLines.push(`App ID: ${maskSecret(account.appId)}`);
        statusLines.push(`Status: ${account.enabled ? "Enabled" : "Disabled"}`);
      } else {
        statusLines.push("Not configured");
      }

      return {
        channel: "lark",
        configured,
        statusLines,
        selectionHint: configured ? undefined : "Requires Lark app credentials",
        quickstartScore: configured ? 80 : 20,
      };
    },

    async configure({ cfg, prompter, accountOverrides }) {
      const accountId = accountOverrides.lark ?? "default";
      const path = getConfigPath(accountId);
      const current = cfg.get(path) as Record<string, unknown> | undefined;

      // Prompt for App ID
      const appId = await prompter.text({
        message: "Enter your Lark App ID:",
        placeholder: "cli_xxxxxxxxxx",
        initialValue: (current?.appId as string) ?? "",
        validate: (value) => {
          if (!value.trim()) return "App ID is required";
          return undefined;
        },
      });

      if (prompter.isCancel(appId)) {
        return { cfg };
      }

      // Prompt for App Secret
      const appSecret = await prompter.password({
        message: "Enter your Lark App Secret:",
        validate: (value) => {
          if (!value.trim()) return "App Secret is required";
          return undefined;
        },
      });

      if (prompter.isCancel(appSecret)) {
        return { cfg };
      }

      // Validate credentials
      const spinner = prompter.spinner();
      spinner.start("Validating credentials...");

      const config: LarkConfig = { appId: appId.trim(), appSecret: appSecret.trim() };
      const validation = await validateCredentials(config);

      if (!validation.valid) {
        spinner.stop(`Validation failed: ${validation.error}`);
        const retry = await prompter.confirm({
          message: "Would you like to try again?",
          initialValue: true,
        });
        if (retry && !prompter.isCancel(retry)) {
          return this.configure({ cfg, prompter, accountOverrides, runtime: getLarkRuntime(), shouldPromptAccountIds: false, forceAllowFrom: false });
        }
        return { cfg };
      }

      spinner.stop("Credentials validated successfully!");

      // Optional: Encrypt Key
      const wantEncrypt = await prompter.confirm({
        message: "Do you want to configure event encryption? (optional)",
        initialValue: false,
      });

      let encryptKey: string | undefined;
      if (wantEncrypt && !prompter.isCancel(wantEncrypt)) {
        const key = await prompter.text({
          message: "Enter your Encrypt Key (32 characters):",
          placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
          validate: (value) => {
            if (value && value.length !== 32) return "Encrypt Key must be 32 characters";
            return undefined;
          },
        });
        if (!prompter.isCancel(key) && key) {
          encryptKey = key;
        }
      }

      // Optional: Verification Token
      const wantVerification = await prompter.confirm({
        message: "Do you want to configure verification token? (optional)",
        initialValue: false,
      });

      let verificationToken: string | undefined;
      if (wantVerification && !prompter.isCancel(wantVerification)) {
        const token = await prompter.text({
          message: "Enter your Verification Token:",
        });
        if (!prompter.isCancel(token) && token) {
          verificationToken = token;
        }
      }

      // Save configuration
      const newConfig: Record<string, unknown> = {
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        enabled: true,
      };

      if (encryptKey) newConfig.encryptKey = encryptKey;
      if (verificationToken) newConfig.verificationToken = verificationToken;

      const updatedCfg = cfg.set(path, newConfig);

      prompter.note(
        `Lark channel configured successfully!\n\n` +
          `Next steps:\n` +
          `1. Configure webhook URL in Lark Open Platform\n` +
          `2. Set URL to: https://your-domain.com/webhook/lark\n` +
          `3. Subscribe to im.message.receive_v1 event\n` +
          `4. Run 'clawbot gateway run' to start receiving messages`,
        "Setup Complete"
      );

      return { cfg: updatedCfg, accountId };
    },
  },

  // ============================================================================
  // Security Adapter
  // ============================================================================

  security: {
    resolveDmPolicy({ cfg, accountId }) {
      const policyPath = `channels.lark.accounts.${accountId ?? "default"}.dmPolicy`;
      const allowFromPath = `channels.lark.accounts.${accountId ?? "default"}.allowFrom`;

      return {
        policy: (cfg.get(policyPath) as string) ?? "allowlist",
        policyPath,
        allowFromPath,
        approveHint: "Add user's open_id to the allowlist",
      };
    },
  },

  // ============================================================================
  // Groups Adapter
  // ============================================================================

  groups: {
    resolveRequireMention({ cfg, accountId, groupId }) {
      // Check if require mention is configured for this account
      const requireMentionPath = `channels.lark.accounts.${accountId ?? "default"}.requireMention`;
      const requireMention = cfg.get(requireMentionPath);

      // Default to true for groups (only respond when @mentioned)
      if (requireMention === undefined) {
        return true;
      }

      return requireMention as boolean;
    },

    resolveGroupIntroHint({ cfg, accountId }) {
      return "在群组中 @机器人 来与 AI 助手对话";
    },
  },

  // ============================================================================
  // Mentions Adapter
  // ============================================================================

  mentions: {
    stripPatterns({ ctx }) {
      // Pattern to match Lark @mentions like @_user_1
      return ["@_user_\\d+"];
    },

    stripMentions({ text, ctx }) {
      // Remove @mention placeholders from text
      return text.replace(/@_user_\d+\s*/g, "").trim();
    },
  },

  // ============================================================================
  // Gateway Adapter (Message Receiving)
  // ============================================================================

  gatewayMethods: ["webhook"],

  gateway: {
    async startAccount(ctx) {
      const { account, runtime, log, setStatus, getStatus } = ctx;

      if (!account.appId || !account.appSecret) {
        log?.error("[lark] Cannot start: missing credentials");
        return;
      }

      const config: LarkConfig = {
        appId: account.appId,
        appSecret: account.appSecret,
        encryptKey: account.encryptKey,
        verificationToken: account.verificationToken,
      };

      // Register webhook handler
      const webhookPath = `/webhook/lark/${account.accountId}`;

      log?.info(`[lark] Registering webhook at ${webhookPath}`);

      // Store the webhook handler for this account
      const handler = async (req: { body: string; headers: Record<string, string | undefined> }) => {
        return handleWebhookRequest(req.body, req.headers, {
          config,
          async onMessage(message: ParsedLarkMessage) {
            log?.info(`[lark] Received message from ${message.senderId}: ${message.messageType}`);

            // Convert to internal format
            const internalMsg = larkToInternal(message);

            // Update status
            setStatus({
              ...getStatus(),
              lastMessageAt: Date.now(),
              lastInboundAt: Date.now(),
            });

            // Route to runtime for processing
            // The runtime will handle the message and call outbound.send for replies
            await runtime.handleInboundMessage?.({
              channel: "lark",
              accountId: account.accountId,
              chatId: internalMsg.chatId,
              chatType: internalMsg.chatType,
              senderId: internalMsg.senderId,
              text: internalMsg.text,
              messageId: internalMsg.id,
              replyToId: internalMsg.replyToId,
              raw: message,
            });
          },
          async onUnsupportedMessage(message: ParsedLarkMessage, replyText: string) {
            log?.warn(`[lark] Unsupported message type: ${message.messageType}`);

            // Send reply about unsupported type
            try {
              const token = await getAccessToken(config);
              await replyMessage({
                token,
                messageId: message.messageId,
                msgType: "text",
                content: JSON.stringify({ text: replyText }),
              });
            } catch (error) {
              log?.error(`[lark] Failed to send unsupported type reply: ${error}`);
            }
          },
        });
      };

      // Register with runtime's HTTP server
      runtime.registerWebhook?.("lark", account.accountId, webhookPath, handler);

      setStatus({
        ...getStatus(),
        running: true,
        connected: true,
        lastStartAt: Date.now(),
        webhookPath,
      });

      log?.info(`[lark] Account ${account.accountId} started`);
    },

    async stopAccount(ctx) {
      const { account, runtime, log, setStatus, getStatus } = ctx;

      // Unregister webhook
      runtime.unregisterWebhook?.("lark", account.accountId);

      setStatus({
        ...getStatus(),
        running: false,
        connected: false,
        lastStopAt: Date.now(),
      });

      log?.info(`[lark] Account ${account.accountId} stopped`);
    },
  },

  // ============================================================================
  // Outbound Adapter (Message Sending)
  // ============================================================================

  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 4000,

    async sendText({ cfg, to, text, replyToId, accountId }) {
      const account = larkPlugin.config.resolveAccount(cfg, accountId);

      if (!account.appId || !account.appSecret) {
        return { ok: false, error: new Error("Lark not configured") };
      }

      const config: LarkConfig = {
        appId: account.appId,
        appSecret: account.appSecret,
      };

      try {
        const token = await getAccessToken(config);

        // Split long messages
        const chunks = splitLongMessage(text);

        for (const chunk of chunks) {
          const larkMsg = internalToLark({ text: chunk });

          let response;
          if (replyToId) {
            // Reply to specific message
            response = await replyMessage({
              token,
              messageId: replyToId,
              msgType: larkMsg.msgType,
              content: larkMsg.content,
            });
          } else {
            // Send new message
            response = await sendMessage({
              token,
              receiveId: to,
              receiveIdType: to.startsWith("oc_") ? "chat_id" : "open_id",
              msgType: larkMsg.msgType,
              content: larkMsg.content,
            });
          }

          if (!isSuccess(response)) {
            return { ok: false, error: new Error(getErrorMessage(response)) };
          }

          // Only use replyToId for the first chunk
          replyToId = undefined;
        }

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },

    async sendMedia({ cfg, to, text, mediaUrl, replyToId, accountId }) {
      const account = larkPlugin.config.resolveAccount(cfg, accountId);

      if (!account.appId || !account.appSecret) {
        return { ok: false, error: new Error("Lark not configured") };
      }

      const config: LarkConfig = {
        appId: account.appId,
        appSecret: account.appSecret,
      };

      try {
        const token = await getAccessToken(config);

        // If there's a media URL, upload and send the image
        if (mediaUrl) {
          // Fetch the image from URL
          const imageResponse = await fetch(mediaUrl);
          if (!imageResponse.ok) {
            return { ok: false, error: new Error(`Failed to fetch image: ${imageResponse.status}`) };
          }

          const imageBlob = await imageResponse.blob();

          // Upload to Lark
          const uploadResponse = await uploadImage(token, imageBlob);
          if (!isSuccess(uploadResponse) || !uploadResponse.data?.image_key) {
            return { ok: false, error: new Error(getErrorMessage(uploadResponse)) };
          }

          const imageKey = uploadResponse.data.image_key;

          // Send image message
          let response;
          if (replyToId) {
            response = await replyMessage({
              token,
              messageId: replyToId,
              msgType: "image",
              content: formatImageContent(imageKey),
            });
          } else {
            response = await sendMessage({
              token,
              receiveId: to,
              receiveIdType: to.startsWith("oc_") ? "chat_id" : "open_id",
              msgType: "image",
              content: formatImageContent(imageKey),
            });
          }

          if (!isSuccess(response)) {
            return { ok: false, error: new Error(getErrorMessage(response)) };
          }
        }

        // If there's also text, send it as a separate message
        if (text) {
          const larkMsg = internalToLark({ text });

          const response = await sendMessage({
            token,
            receiveId: to,
            receiveIdType: to.startsWith("oc_") ? "chat_id" : "open_id",
            msgType: larkMsg.msgType,
            content: larkMsg.content,
          });

          if (!isSuccess(response)) {
            return { ok: false, error: new Error(getErrorMessage(response)) };
          }
        }

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  },
};
