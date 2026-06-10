// 下载 Windows 版 ffmpeg/ffprobe 静态二进制,放入 src-tauri/binaries/
// 并按 Tauri sidecar 约定加上目标三元组后缀(如 -x86_64-pc-windows-msvc.exe)。
//
// 用法: npm run fetch:ffmpeg
//
// 数据源:ffbinaries 6.1(ffmpeg 与 ffprobe 版本统一,较新)。
// 二进制托管在 GitHub release,故配置多个国内镜像逐个尝试,直到成功。
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BIN_DIR = join(ROOT, "src-tauri", "binaries");
const TMP_DIR = join(ROOT, ".ffmpeg-tmp");

// Tauri sidecar 需要的目标三元组(Windows MSVC)
const TARGET_TRIPLE = "x86_64-pc-windows-msvc";

// ffbinaries 版本(ffmpeg/ffprobe 同版本号,保持统一)
const FF_VERSION = "6.1";

// GitHub 镜像前缀,按顺序尝试。空串 = 直连 GitHub。
// 镜像速度波动较大,逐个 fallback 比固定单源更稳。
const MIRRORS = [
  "https://gh-proxy.com/",
  "https://ghfast.top/",
  "https://ghproxy.net/",
  "", // 最后兜底:直连
];

// 每个二进制一个 zip 包
const PACKAGES = [
  { exe: "ffmpeg.exe", zip: `ffmpeg-${FF_VERSION}-win-64.zip`, minBytes: 10 * 1024 * 1024 },
  { exe: "ffprobe.exe", zip: `ffprobe-${FF_VERSION}-win-64.zip`, minBytes: 5 * 1024 * 1024 },
];

function githubUrl(zip) {
  return `https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v${FF_VERSION}/${zip}`;
}

// 依次尝试各镜像下载,首个成功(文件达到最小体积)即停止。
function downloadWithFallback(zip, dest, minBytes) {
  const ghUrl = githubUrl(zip);
  for (const mirror of MIRRORS) {
    const url = mirror + ghUrl;
    const label = mirror || "GitHub 直连";
    try {
      console.log(`尝试 ${label} …`);
      execSync(`curl.exe -L --fail --max-time 180 -o "${dest}" "${url}"`, {
        stdio: ["ignore", "ignore", "ignore"],
      });
      const size = existsSync(dest) ? statSync(dest).size : 0;
      if (size >= minBytes) {
        console.log(`  ✓ ${label} 成功(${(size / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }
      console.log(`  ✗ ${label} 文件过小,换下一个源`);
    } catch {
      console.log(`  ✗ ${label} 失败,换下一个源`);
    }
  }
  throw new Error(`所有镜像均无法下载 ${zip},请检查网络或稍后重试。`);
}

// 递归查找指定文件名(忽略大小写)
function findExe(dir, name) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findExe(full, name);
      if (found) return found;
    } else if (entry.name.toLowerCase() === name) {
      return full;
    }
  }
  return null;
}

function fetchBinary({ exe, zip, minBytes }) {
  const base = exe.replace(".exe", "");
  const zipPath = join(TMP_DIR, zip);
  const extractDir = join(TMP_DIR, base);

  // 复用完整缓存
  const cached = existsSync(zipPath) && statSync(zipPath).size >= minBytes;
  if (!cached) {
    downloadWithFallback(zip, zipPath, minBytes);
  }

  console.log(`解压 ${base} …`);
  rmSync(extractDir, { recursive: true, force: true });
  mkdirSync(extractDir, { recursive: true });
  // ffbinaries 是 .zip,用 PowerShell Expand-Archive 解压(避免 tar 处理盘符问题)
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${extractDir}' -Force"`,
    { stdio: "inherit" }
  );

  const src = findExe(extractDir, exe);
  if (!src) throw new Error(`未在 ${zip} 中找到 ${exe}`);
  const dest = join(BIN_DIR, `${base}-${TARGET_TRIPLE}.exe`);
  copyFileSync(src, dest);
  console.log(`✓ ${dest}`);
}

function main() {
  if (process.platform !== "win32") {
    console.warn("当前脚本仅处理 Windows 二进制。其他平台请扩展数据源。");
  }
  mkdirSync(BIN_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  for (const pkg of PACKAGES) {
    fetchBinary(pkg);
  }

  rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`完成。ffmpeg/ffprobe ${FF_VERSION} sidecar 已就绪。`);
}

try {
  main();
} catch (err) {
  console.error("出错:", err.message);
  process.exit(1);
}
