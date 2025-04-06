import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
/**
 * 設定
 */
export default defineConfig({
    plugins: [tsconfigPaths()],
});
