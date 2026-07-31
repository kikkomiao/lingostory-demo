# LingoStory Demo

一个用剧情状态机演示英语口语练习的交互前端。当前故事是「拿错了老板的午饭」：

- 4 轮沟通任务和倒计时
- 有效 / 可理解 / 需要补救三条演示路径
- Cyrus 中性、开心、难过、生气、紧张、惊讶六种表情状态
- 多结局和口语复盘
- 奶油纸张底、粗黑手绘线、明快原色的生活方式插画风

## 画风升级（2026-07-31）

本次版本将原来的写实沉浸风调整为生活方式手绘插画风：场景采用奶油纸张质感、粗黑线与明快原色；NPC 统一为圆润卡通造型，并支持六种剧情情绪。

## 真实学习复盘（2026-08-01）

练习过程保持自然交流、不强行打断纠正；真实故事结束后自动调用后端学习复盘：

- 展示后端返回的六项能力维度，每项使用 1–4 级量表，不虚构百分制总分
- 呈现本轮总结、稳定优势、优先改进项和下一次练习目标
- 逐句对比原句、最小修改和更自然的表达
- 支持生成中、完成、失败重试、不可用以及刷新后恢复
- 文本与语音回合分别提交 `source=text|voice`，便于后端准确说明评价范围

## NPC 剧情库 Demo（2026-07-31）

故事开场前提供 NPC × 专属故事选择页，目前已经接入 Cyrus、Kate、Mike、Mary、Cassie 五位角色：

- 每位角色都有 1 张选择页立绘
- 每位角色都有中性、开心、难过、生气、紧张、惊讶 6 种情绪立绘
- Cyrus 当前绑定「拿错了老板的午饭」，可进入完整离线演示
- Kate、Mike、Mary、Cassie 的故事尚未确定，选择页展示为“故事筹备中”
- 后端返回对应 `npcId + storyId` 后，角色卡可以自动开放

## 前后端联调 P0（2026-07-31）

前端现已支持真实 API 与离线 Demo 双模式：

- 自动探测 `/api/health`、`/api/npcs` 和 `/api/stories`
- 创建并恢复 playthrough，刷新页面不会丢失当前剧情
- 使用文本输入提交真实回合，并用 `clientTurnId` 保证失败重试不会重复推进
- 动态展示后端返回的目标、提示、进度、NPC 回复和规范化情绪
- 提供独立角色资料页，展示玩家身份、NPC 性格、关系和对话风格
- 在剧情中和真实结局页提供可折叠完整对话记录
- 使用 `controller.outcome` 提供轻量剧情推进反馈
- API 断开时提供显式重新连接入口
- API 不可用或缺少 Cyrus 故事时自动回退到原有好 / 中 / 差演示路径
- 真实剧情结束时自动接入 `/api/playthroughs/:id/language-review`

完整联调契约见 `docs/FRONTEND_BACKEND_INTEGRATION_API.md`，基于后端
`main@ac17433` 的实测差异见 `docs/FRONTEND_BACKEND_GAP_ANALYSIS.md`。

## 本地使用

直接双击 `index.html` 即可打开离线 Demo，不依赖网络。请保留
`app.js`、`styles.css`、角色资料页文件、背景图和 `npc/` 资源目录的相对位置。

需要检查真实 API 模式的交互流程时，可启动仓库内置的本地联调服务：

```bash
node scripts/fixture-server.mjs
```

然后打开 `http://127.0.0.1:18892/`。联调服务会从剧情阶段 1 开始，并将实际提交的每一轮内容追加到完整对话中。

真实 API 默认使用同源 `/api/*`。前后端分离部署时，需要在加载
`app.js` 前注入：

```html
<script>
  window.LINGOSTORY_API_BASE_URL = "https://your-api.example.com";
</script>
```

同时需要由后端为前端域名配置 CORS；更推荐在同一域名下反向代理
`/api/*`。

需要联调真实语音链路时，先启动 LingoStory 后端（默认
`http://127.0.0.1:8790`），再运行：

```bash
npm run dev
```

打开 `http://127.0.0.1:8000`。开发服务器会把同源 `/api` 代理到后端，避免跨域问题。
如后端地址不同，可设置 `LINGOSTORY_API_TARGET`。直接双击 `index.html` 仍可进入离线 Demo，
但浏览器可能因安全策略限制麦克风或 VAD 资源加载。

也可以使用仓库内置的固定数据服务检查非语音交互：

```bash
node scripts/fixture-server.mjs
```

然后打开 `http://127.0.0.1:18892/`。

## 菜单配乐与按钮音效

菜单配乐会在用户首次操作后启动，并在开屏、NPC 选择和剧情准备阶段循环播放；
进入正式对话后自动淡出。开屏和菜单顶部的声音按钮会同时关闭配乐与按钮音效，
不会关闭 NPC 的语音输入或 TTS 播放。

## 真实语音与日语

- 麦克风通过 Silero VAD 获取 16kHz 单声道语音帧，并保留 300ms pre-roll。
- Qwen3-ASR WebSocket 流式转写，英语故事使用 English，日语故事使用 Japanese。
- 日语无语言标记转写必须含平假名或片假名；明确标记为其他语言的候选会被过滤。
- 最终转写复用文本输入的 `/turn` 接口；ASR、TTS 或麦克风不可用时仍可继续文本流程。
- 大模型返回 NPC 回复后，按角色 `voiceProfile` 调用 Qwen3-TTS WebSocket。
- TTS 下行 PCM 以 24kHz 单声道流式排队播放；再次点击麦克风会中断当前播报。
- TTS 请求通过字段白名单构造，不透传角色风格、情绪、分句或变速参数；NPC 回复原文
  直接发送。播放器在首批 PCM 累计约 400ms 后启播，以降低网络抖动造成的断续。
- ASR/TTS 地址可通过 `window.LINGOSTORY_VOICE_CONFIG` 覆盖。

## Mike 粤语固定故事

- Mike 使用 `targetLanguage=yue`，ASR 会话请求使用 `Cantonese`。
- 粤语转写完成后自动进入与文本输入相同的 `/turn` 流程。
- Mike 的 `gpt-sovits` 声线通过同源 `POST /api/tts` 获取完整 WAV；英语和日语仍使用原有 Qwen3-TTS WebSocket。
- 新回复、开始录音或切换角色会取消旧请求并停止旧 WAV，避免串播。
- GPT-SoVITS 不可用时只跳过语音，字幕和剧情状态不会丢失。
- 粤语故事与日语故事一样暂不生成英语学习复盘。

## 主要文件

- `index.html`：页面结构与真实前端入口
- `styles.css`：视觉系统与响应式布局
- `app.js`：剧情状态机、真实 API 适配和离线回退
- `npc.html`：独立 NPC 角色资料页
- `npc-detail.css`：角色资料页布局与响应式样式
- `npc-detail.js`：角色资料、故事身份字段和离线回退适配
- `npc/`：五位 NPC 的选择页与六种情绪素材
- `docs/`：接口契约与前后端实码差异清单
