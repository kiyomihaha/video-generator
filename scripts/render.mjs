import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
import process from "node:process";

const args = process.argv.slice(2);
const readArg = (name) => {
  const index = args.findIndex((arg) => arg === `--${name}`);
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  return index >= 0 ? args[index + 1] : undefined;
};

const video = readArg("video") ?? process.env.npm_config_video;
if (!video) {
  console.error("Usage: npm run render -- --video <CompositionID>");
  process.exit(1);
}

mkdirSync("out", {recursive: true});
const output = readArg("output") ?? `out/${video}.mp4`;
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["remotion", "render", "src/index.ts", video, output],
  {stdio: "inherit", shell: process.platform === "win32"},
);

process.exit(result.status ?? 1);
