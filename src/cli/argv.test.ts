import { describe, expect, it } from "vitest";

import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "clawbot", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "clawbot", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "clawbot", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "clawbot", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "clawbot", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "clawbot", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "clawbot", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "clawbot"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "clawbot", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "clawbot", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "clawbot", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "clawbot", "status", "--timeout=2500"], "--timeout")).toBe("2500");
    expect(getFlagValue(["node", "clawbot", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "clawbot", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "clawbot", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "clawbot", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "clawbot", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "clawbot", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "clawbot", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "clawbot", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "clawbot", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "clawbot", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node", "clawbot", "status"],
    });
    expect(nodeArgv).toEqual(["node", "clawbot", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node-22", "clawbot", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "clawbot", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node-22.2.0.exe", "clawbot", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "clawbot", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node-22.2", "clawbot", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "clawbot", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node-22.2.exe", "clawbot", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "clawbot", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["/usr/bin/node-22.2.0", "clawbot", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "clawbot", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["nodejs", "clawbot", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "clawbot", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["node-dev", "clawbot", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "clawbot", "node-dev", "clawbot", "status"]);

    const directArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["clawbot", "status"],
    });
    expect(directArgv).toEqual(["node", "clawbot", "status"]);

    const bunArgv = buildParseArgv({
      programName: "clawbot",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "clawbot",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "clawbot", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "clawbot", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "clawbot", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "clawbot", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "clawbot", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "clawbot", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "clawbot", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "clawbot", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
