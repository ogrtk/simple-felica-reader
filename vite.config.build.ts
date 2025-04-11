import { defineConfig, mergeConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";
import viteConfig from "./vite.config";

/**
 * 設定
 */
export default mergeConfig(viteConfig,defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.build.json"] }),
    dts({ outDir: "dist", include: "src" }),
  ],
}));
