import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";
export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src"],
        },
    },
}));
