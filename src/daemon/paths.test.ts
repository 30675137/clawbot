import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".clawdbot"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".clawdbot-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".clawdbot"));
  });

  it("uses CLAWDBOT_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_STATE_DIR: "/var/lib/clawbot" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/clawbot"));
  });

  it("expands ~ in CLAWDBOT_STATE_DIR", () => {
    const env = { HOME: "/Users/test", CLAWDBOT_STATE_DIR: "~/clawbot-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/clawbot-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { CLAWDBOT_STATE_DIR: "C:\\State\\clawbot" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\clawbot");
  });
});
