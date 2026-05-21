import esbuild from "esbuild";

const release = process.argv.includes("release");
const build = process.argv.includes("build") || release;

const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*"],
  format: "cjs",
  target: "es2021",
  platform: "node",
  outfile: "main.js",
  sourcemap: release ? false : "inline",
  minify: release,
  logLevel: "info"
});

if (build) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}