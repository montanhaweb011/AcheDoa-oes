import { spawn } from "node:child_process";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev", "-w", "backend"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
  spawn(npm, ["run", "dev", "-w", "frontend", "--", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
];
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  children.forEach((p) => p.kill());
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((p) =>
  p.on("exit", (code) => {
    stop();
    process.exitCode = code || 0;
  }),
);
