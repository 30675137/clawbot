import { describe, expect, it } from "vitest";

import { larkPlugin } from "./channel.js";

// ============================================================================
// Mock Config Helper
// ============================================================================

function createMockConfig(data: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>();

  // Initialize with provided data
  for (const [key, value] of Object.entries(data)) {
    store.set(key, value);
  }

  return {
    get(path: string): unknown {
      return store.get(path);
    },
    set(path: string, value: unknown) {
      store.set(path, value);
      return this;
    },
    delete(path: string) {
      store.delete(path);
      return this;
    },
  };
}

// ============================================================================
// Plugin Meta Tests
// ============================================================================

describe("larkPlugin.meta", () => {
  it("has correct id", () => {
    expect(larkPlugin.id).toBe("lark");
    expect(larkPlugin.meta.id).toBe("lark");
  });

  it("has Chinese label", () => {
    expect(larkPlugin.meta.label).toBe("飞书");
  });

  it("has selection label with both names", () => {
    expect(larkPlugin.meta.selectionLabel).toBe("飞书 (Lark)");
  });

  it("has docs path", () => {
    expect(larkPlugin.meta.docsPath).toBe("/channels/lark");
  });

  it("has aliases for both names", () => {
    expect(larkPlugin.meta.aliases).toContain("feishu");
    expect(larkPlugin.meta.aliases).toContain("lark");
  });
});

// ============================================================================
// Plugin Capabilities Tests
// ============================================================================

describe("larkPlugin.capabilities", () => {
  it("supports dm and group chat types", () => {
    expect(larkPlugin.capabilities.chatTypes).toContain("dm");
    expect(larkPlugin.capabilities.chatTypes).toContain("group");
  });

  it("supports media", () => {
    expect(larkPlugin.capabilities.media).toBe(true);
  });

  it("supports reply", () => {
    expect(larkPlugin.capabilities.reply).toBe(true);
  });

  it("does not support threads", () => {
    expect(larkPlugin.capabilities.threads).toBe(false);
  });
});

// ============================================================================
// Config Adapter Tests
// ============================================================================

describe("larkPlugin.config", () => {
  describe("listAccountIds", () => {
    it("returns empty array when no accounts configured", () => {
      const cfg = createMockConfig();
      const result = larkPlugin.config.listAccountIds(cfg);
      expect(result).toEqual([]);
    });

    it("returns account IDs when accounts exist", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts": {
          default: { appId: "cli_123", appSecret: "secret" },
          secondary: { appId: "cli_456", appSecret: "secret2" },
        },
      });

      const result = larkPlugin.config.listAccountIds(cfg);

      expect(result).toContain("default");
      expect(result).toContain("secondary");
    });
  });

  describe("defaultAccountId", () => {
    it("returns 'default' when no accounts exist", () => {
      const cfg = createMockConfig();
      const result = larkPlugin.config.defaultAccountId(cfg);
      expect(result).toBe("default");
    });

    it("returns first account ID when accounts exist", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts": {
          primary: { appId: "cli_123" },
          secondary: { appId: "cli_456" },
        },
      });

      const result = larkPlugin.config.defaultAccountId(cfg);

      expect(result).toBe("primary");
    });
  });

  describe("resolveAccount", () => {
    it("returns empty account when not configured", () => {
      const cfg = createMockConfig();
      const result = larkPlugin.config.resolveAccount(cfg, "default");

      expect(result.accountId).toBe("default");
      expect(result.appId).toBe("");
      expect(result.appSecret).toBe("");
      expect(result.enabled).toBe(false);
    });

    it("returns configured account", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts.myaccount": {
          appId: "cli_test_123",
          appSecret: "secret_abc",
          encryptKey: "12345678901234567890123456789012",
          verificationToken: "verify_token",
          enabled: true,
        },
      });

      const result = larkPlugin.config.resolveAccount(cfg, "myaccount");

      expect(result.accountId).toBe("myaccount");
      expect(result.appId).toBe("cli_test_123");
      expect(result.appSecret).toBe("secret_abc");
      expect(result.encryptKey).toBe("12345678901234567890123456789012");
      expect(result.verificationToken).toBe("verify_token");
      expect(result.enabled).toBe(true);
    });

    it("defaults enabled to true when not specified", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts.test": {
          appId: "cli_123",
          appSecret: "secret",
        },
      });

      const result = larkPlugin.config.resolveAccount(cfg, "test");

      expect(result.enabled).toBe(true);
    });
  });

  describe("isEnabled", () => {
    it("returns true when enabled and configured", () => {
      const account = {
        accountId: "test",
        appId: "cli_123",
        appSecret: "secret",
        enabled: true,
      };

      expect(larkPlugin.config.isEnabled(account)).toBe(true);
    });

    it("returns false when disabled", () => {
      const account = {
        accountId: "test",
        appId: "cli_123",
        appSecret: "secret",
        enabled: false,
      };

      expect(larkPlugin.config.isEnabled(account)).toBe(false);
    });

    it("returns false when missing appId", () => {
      const account = {
        accountId: "test",
        appId: "",
        appSecret: "secret",
        enabled: true,
      };

      expect(larkPlugin.config.isEnabled(account)).toBe(false);
    });

    it("returns false when missing appSecret", () => {
      const account = {
        accountId: "test",
        appId: "cli_123",
        appSecret: "",
        enabled: true,
      };

      expect(larkPlugin.config.isEnabled(account)).toBe(false);
    });
  });

  describe("isConfigured", () => {
    it("returns true when both appId and appSecret present", () => {
      const account = {
        accountId: "test",
        appId: "cli_123",
        appSecret: "secret",
      };

      expect(larkPlugin.config.isConfigured(account)).toBe(true);
    });

    it("returns false when appId missing", () => {
      const account = {
        accountId: "test",
        appId: "",
        appSecret: "secret",
      };

      expect(larkPlugin.config.isConfigured(account)).toBe(false);
    });

    it("returns false when appSecret missing", () => {
      const account = {
        accountId: "test",
        appId: "cli_123",
        appSecret: "",
      };

      expect(larkPlugin.config.isConfigured(account)).toBe(false);
    });
  });

  describe("unconfiguredReason", () => {
    it("returns missing App ID message", () => {
      const account = { accountId: "test", appId: "", appSecret: "secret" };
      expect(larkPlugin.config.unconfiguredReason(account)).toBe("Missing App ID");
    });

    it("returns missing App Secret message", () => {
      const account = { accountId: "test", appId: "cli_123", appSecret: "" };
      expect(larkPlugin.config.unconfiguredReason(account)).toBe("Missing App Secret");
    });

    it("returns generic message when both present", () => {
      const account = { accountId: "test", appId: "cli_123", appSecret: "secret" };
      expect(larkPlugin.config.unconfiguredReason(account)).toBe("Not configured");
    });
  });

  describe("setAccountEnabled", () => {
    it("sets enabled to true", () => {
      const cfg = createMockConfig();

      larkPlugin.config.setAccountEnabled({ cfg, accountId: "test", enabled: true });

      expect(cfg.get("channels.lark.accounts.test.enabled")).toBe(true);
    });

    it("sets enabled to false", () => {
      const cfg = createMockConfig();

      larkPlugin.config.setAccountEnabled({ cfg, accountId: "test", enabled: false });

      expect(cfg.get("channels.lark.accounts.test.enabled")).toBe(false);
    });
  });

  describe("deleteAccount", () => {
    it("deletes account config", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts.test": { appId: "cli_123", appSecret: "secret" },
      });

      larkPlugin.config.deleteAccount({ cfg, accountId: "test" });

      expect(cfg.get("channels.lark.accounts.test")).toBeUndefined();
    });
  });

  describe("describeAccount", () => {
    it("describes configured account", () => {
      const account = {
        accountId: "test",
        appId: "cli_abcd1234efgh",
        appSecret: "secret_xyz",
        enabled: true,
      };
      const cfg = createMockConfig();

      const result = larkPlugin.config.describeAccount(account, cfg);

      expect(result.accountId).toBe("test");
      expect(result.name).toBe("App: cli_****efgh");
      expect(result.enabled).toBe(true);
      expect(result.configured).toBe(true);
    });

    it("describes unconfigured account", () => {
      const account = {
        accountId: "test",
        appId: "",
        appSecret: "",
        enabled: false,
      };
      const cfg = createMockConfig();

      const result = larkPlugin.config.describeAccount(account, cfg);

      expect(result.accountId).toBe("test");
      expect(result.name).toBeUndefined();
      expect(result.configured).toBe(false);
    });
  });
});

// ============================================================================
// Security Adapter Tests
// ============================================================================

describe("larkPlugin.security", () => {
  describe("resolveDmPolicy", () => {
    it("returns default allowlist policy", () => {
      const cfg = createMockConfig();

      const result = larkPlugin.security.resolveDmPolicy({ cfg, accountId: "default" });

      expect(result.policy).toBe("allowlist");
      expect(result.policyPath).toBe("channels.lark.accounts.default.dmPolicy");
      expect(result.allowFromPath).toBe("channels.lark.accounts.default.allowFrom");
    });

    it("returns configured policy", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts.test.dmPolicy": "open",
      });

      const result = larkPlugin.security.resolveDmPolicy({ cfg, accountId: "test" });

      expect(result.policy).toBe("open");
    });

    it("includes approve hint", () => {
      const cfg = createMockConfig();

      const result = larkPlugin.security.resolveDmPolicy({ cfg, accountId: "default" });

      expect(result.approveHint).toContain("open_id");
    });
  });
});

// ============================================================================
// Groups Adapter Tests
// ============================================================================

describe("larkPlugin.groups", () => {
  describe("resolveRequireMention", () => {
    it("defaults to true (require mention in groups)", () => {
      const cfg = createMockConfig();

      const result = larkPlugin.groups.resolveRequireMention({
        cfg,
        accountId: "default",
        groupId: "oc_group_123",
      });

      expect(result).toBe(true);
    });

    it("returns configured value", () => {
      const cfg = createMockConfig({
        "channels.lark.accounts.test.requireMention": false,
      });

      const result = larkPlugin.groups.resolveRequireMention({
        cfg,
        accountId: "test",
        groupId: "oc_group_123",
      });

      expect(result).toBe(false);
    });
  });

  describe("resolveGroupIntroHint", () => {
    it("returns Chinese hint", () => {
      const cfg = createMockConfig();

      const result = larkPlugin.groups.resolveGroupIntroHint({ cfg, accountId: "default" });

      expect(result).toContain("@机器人");
    });
  });
});

// ============================================================================
// Mentions Adapter Tests
// ============================================================================

describe("larkPlugin.mentions", () => {
  describe("stripPatterns", () => {
    it("returns pattern for Lark mentions", () => {
      const patterns = larkPlugin.mentions.stripPatterns({ ctx: {} as never });

      expect(patterns).toContain("@_user_\\d+");
    });
  });

  describe("stripMentions", () => {
    it("removes @_user_N patterns from text", () => {
      const result = larkPlugin.mentions.stripMentions({
        text: "@_user_1 Hello @_user_2 world",
        ctx: {} as never,
      });

      expect(result).toBe("Hello world");
    });

    it("handles text without mentions", () => {
      const result = larkPlugin.mentions.stripMentions({
        text: "Hello world",
        ctx: {} as never,
      });

      expect(result).toBe("Hello world");
    });

    it("trims result", () => {
      const result = larkPlugin.mentions.stripMentions({
        text: "@_user_1 Hello",
        ctx: {} as never,
      });

      expect(result).toBe("Hello");
    });
  });
});

// ============================================================================
// Gateway Methods Tests
// ============================================================================

describe("larkPlugin.gatewayMethods", () => {
  it("uses webhook method", () => {
    expect(larkPlugin.gatewayMethods).toContain("webhook");
  });
});

// ============================================================================
// Outbound Adapter Tests
// ============================================================================

describe("larkPlugin.outbound", () => {
  it("has direct delivery mode", () => {
    expect(larkPlugin.outbound.deliveryMode).toBe("direct");
  });

  it("has text chunk limit of 4000", () => {
    expect(larkPlugin.outbound.textChunkLimit).toBe(4000);
  });
});
