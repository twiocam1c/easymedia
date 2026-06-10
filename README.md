<div align="center">

# EasyMedia

**基于 FFmpeg 的桌面视频处理工具**

[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-stable-000000?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 这是什么

FFmpeg 很强,但门槛劝退普通人:几百个参数、晦涩的命令行、查不完的 StackOverflow。
HandBrake 把所有参数都摊在界面上,LosslessCut 只做单一功能。

**EasyMedia 走第三条路——任务导向 + 渐进式呈现:**

> 同一个软件,对小白是傻瓜机,对高手是 FFmpeg 遥控器。

## 核心设计:三层渐进式呈现

界面按你的需要逐层展开,绝不一上来就吓人。

| 层级 | 面向谁 | 你看到的 | 你不用关心的 |
| :--- | :--- | :--- | :--- |
| **L1 任务入口** | 所有人 | 拖文件 → 点大按钮,零参数 | 一切 |
| **L2 智能选项** | 想调一调 | 用人话给选择:画质(够用 / 清晰 / 接近原画)、目标大小、分辨率 | 编码器、CRF、码率 |
| **L3 专家抽屉** | 老手 | 真实 FFmpeg 参数:编码器 / CRF / 码率 / 预设 + **实时命令预览** | 没有,全摊开给你 |

三层最终都落到同一个「用户意图」数据结构上,后端再把意图翻译成 FFmpeg 参数。

## 支持的任务

| 任务 | 说明 |
| :--- | :--- |
| 🗜️ **压缩视频** | 按画质档位或目标大小压缩,自动反推码率 |
| 🔄 **转格式** | 在 mp4 / mkv / webm / mov 之间转换容器与编码 |
| 🎵 **提取音频** | 从视频里抽出 mp3 / aac / wav |
| ✂️ **剪辑** | 保留指定区间,无损快速裁切 |
| 🎞️ **转 GIF** | 截取片段转 GIF,自带 palettegen 调色优化质量 |

可把常用配置存成**预设**,下次一键复用。

## 技术架构

```
拖入文件
   │
   ▼
ffprobe 探测 ──► MediaInfo (时长/分辨率/编码/码率)
   │
   ▼
前端三层 UI ──► TaskSpec  (用户意图,可辨识联合 by `type`)
   │
   ▼
ffmpeg/builder.rs  (纯函数:意图 → 参数数组,天然防命令注入)
   │
   ▼
ffmpeg/runner.rs   (spawn sidecar,解析 -progress pipe:1 推送实时进度)
   │
   ▼
ProgressEvent ──► 进度条 / 速度 / 完成结果
```

**技术栈:** Tauri v2 · React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Rust

**关键设计点:**
- **意图与执行分离** —— 前端只表达「我想要什么」,参数翻译全部收敛在后端 builder,UI 改版不影响命令正确性。
- **防注入** —— builder 输出参数数组而非拼接字符串,用户输入永远当作数据而非命令。
- **可扩展** —— `TaskSpec` 是可辨识联合,新增一种任务 = 加一个 builder + 一张任务卡,不动框架。
- **内置 ffmpeg** —— ffmpeg / ffprobe 作为 sidecar 打进安装包,用户无需自行安装配置。

## 项目结构

```
src/                      前端 (React + TS)
├── components/
│   ├── tasks/            任务选择与工作区
│   ├── options/          L2/L3 各任务的选项面板 + 专家抽屉 + 预设栏
│   ├── dropzone/         拖拽区
│   └── progress/         进度视图
├── lib/                  类型契约、任务工厂、媒体工具、API 桥接
└── store/                Zustand 状态

src-tauri/                后端 (Rust)
└── src/
    ├── ffmpeg/
    │   ├── builder.rs    意图 → FFmpeg 参数(纯函数,核心)
    │   ├── runner.rs     执行 + 进度解析
    │   └── probe.rs      ffprobe 媒体探测
    ├── commands.rs       Tauri 命令 (run_task / preview_command …)
    ├── models.rs         与前端对应的 serde 结构
    └── presets.rs        预设持久化

scripts/fetch-ffmpeg.mjs  下载内置 ffmpeg/ffprobe 二进制
```

## 开发与构建

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) stable 工具链
- Tauri v2 的系统依赖(见 [Tauri 环境配置](https://tauri.app/start/prerequisites/))

### 上手

```bash
# 1. 安装依赖
npm install

# 2. 下载内置 ffmpeg / ffprobe 二进制(不入库,首次必须执行)
npm run fetch:ffmpeg

# 3. 开发模式(热重载)
npm run tauri dev

# 4. 运行测试
npm test                  # 前端 (Vitest)
cd src-tauri && cargo test # 后端 (Rust)

# 5. 打包安装程序 (Windows NSIS)
npm run tauri build
```

产物:`src-tauri/target/release/bundle/nsis/EasyMedia_0.1.0_x64-setup.exe`(含内置 ffmpeg,约 83 MB)。

> **国内打包提示:** Tauri 打包需从 GitHub 拉取 NSIS 工具,国内易超时。可设镜像环境变量:
> ```bash
> export TAURI_BUNDLER_TOOLS_GITHUB_MIRROR_TEMPLATE='https://gh-proxy.com/https://github.com/<owner>/<repo>/releases/download/<version>/<asset>'
> ```
> 占位符为命名 token(`<owner>` `<repo>` `<version>` `<asset>`),原样保留。

## 测试

后端 36 个单元测试 + 前端 23 个测试,覆盖参数构建、进度解析、任务工厂、媒体工具等核心逻辑。五种任务均已端到端验证。

## License

[MIT](LICENSE)
