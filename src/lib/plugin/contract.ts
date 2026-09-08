export interface AiAdminPluginConfig {
  title?: string;
  defaultRoute?: "/dashboard" | "/library" | "/ingestion" | "/questions" | "/resources" | "/reports";
  enableModules?: Array<"library" | "ingestion" | "resources" | "questions" | "reports">;
}

export const defaultPluginConfig: Required<AiAdminPluginConfig> = {
  title: "LMS AI Admin",
  defaultRoute: "/dashboard",
  enableModules: ["library", "ingestion", "resources", "questions", "reports"]
};

export const mergePluginConfig = (incoming?: AiAdminPluginConfig): Required<AiAdminPluginConfig> => ({
  ...defaultPluginConfig,
  ...incoming,
  enableModules: incoming?.enableModules ?? defaultPluginConfig.enableModules
});
