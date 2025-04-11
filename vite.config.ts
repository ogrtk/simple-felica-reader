import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * 設定
 */
export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    dts({ outDir: "dist", include: "src" }),
  ],
  build: {
    lib: {
      entry: "./src/index.ts", // エントリポイント
      formats: ["es"], // 生成するモジュール形式を配列で指定します。デフォルトで['es', 'umd'] なのでこの場合はなくても大丈夫です。
    },
    rollupOptions: {
      output: {
        // 各モジュールを個別ファイルとして出力する
        preserveModules: true,
        // 共通のディレクトリパスを除去したい場合はオプションで指定
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
