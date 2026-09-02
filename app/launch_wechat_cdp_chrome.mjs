import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = "Profile 2";
const sourceRoot = "C:\\Users\\www19\\AppData\\Local\\Google\\Chrome\\User Data";
const debugRoot = "C:\\Users\\www19\\AppData\\Local\\Temp\\wechat-cdp-profile-20260823";

// The only normal Chrome root process belongs to the task window opened for this run.
// Closing it releases the profile lock so the same logged-in profile can expose CDP.
try {
  execFileSync("taskkill", ["/PID", process.env.WECHAT_CHROME_ROOT_PID || "17284", "/T", "/F"], { stdio: "ignore" });
} catch {
  // It may already be closed; launch still performs the authoritative check below.
}

await new Promise(resolve => setTimeout(resolve, 1500));
await rm(debugRoot, { recursive: true, force: true });
await mkdir(debugRoot, { recursive: true });
await cp(path.join(sourceRoot, "Local State"), path.join(debugRoot, "Local State"));
await cp(path.join(sourceRoot, profile), path.join(debugRoot, profile), { recursive: true });
execFileSync("cmd.exe", ["/d", "/s", "/c", "start", "\"\"", chrome,
  "--remote-debugging-port=9222", `--user-data-dir=${debugRoot}`, `--profile-directory=${profile}`, "--new-window", "https://mp.weixin.qq.com/"
], { stdio: "ignore" });

let reachable = false;
for (let i = 0; i < 12; i++) {
  await new Promise(resolve => setTimeout(resolve, 500));
  try {
    const response = await fetch("http://127.0.0.1:9222/json");
    if (response.ok) { reachable = true; break; }
  } catch {}
}
if (!reachable) throw new Error("Chrome was launched but CDP port 9222 is not reachable");
console.log("CDP_READY");
