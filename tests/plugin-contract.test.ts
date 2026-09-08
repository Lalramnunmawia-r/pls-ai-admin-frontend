import { describe, expect, it } from "vitest";
import { defaultPluginConfig, mergePluginConfig } from "../src/lib/plugin/contract";

describe("plugin config contract", () => {
  it("keeps defaults when no override provided", () => {
    expect(mergePluginConfig()).toEqual(defaultPluginConfig);
  });

  it("allows overriding selected fields", () => {
    const merged = mergePluginConfig({ title: "Custom AI Admin", enableModules: ["library", "reports"] });
    expect(merged.title).toBe("Custom AI Admin");
    expect(merged.enableModules).toEqual(["library", "reports"]);
    expect(merged.defaultRoute).toBe("/dashboard");
  });
});
