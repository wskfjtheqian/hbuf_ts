import {defineConfig} from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs", "iife"],
    dts: {
        entry: "src/index.ts"
    },
    sourcemap: true,
    clean: true,
    target: "es2020",
    globalName: "hbuf",
});
