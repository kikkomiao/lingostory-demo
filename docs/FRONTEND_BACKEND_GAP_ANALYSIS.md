# LingoStory 前后端实测差异与联调清单

> 对照日期：2026-07-31
> 前端：`codex/frontend-api-integration`
> 后端：`chenjingyin/lingostory` `main@e5d06b92`

## 1. 当前结论

后端已经具备 P0 剧情主链路，前端也已经完成对应调用和离线回退。现在不能直接进入 Cyrus 真实剧情的首要原因不是“缺少整套接口”，而是：

1. 后端内置故事仍为 `lunch-mixup-v6`，NPC 是 Alex；前端当前只有 Cyrus 的角色素材映射。
2. 后端内部已经产生 `emotionId`，但公开会话和回合响应没有返回它，前端无法切换六种情绪立绘。
3. 还没有可供前端访问的同源部署地址，或跨域 API 地址与 CORS 配置。

## 2. 已有接口兼容情况

| 能力 | 后端现状 | 前端现状 | 结论 |
| --- | --- | --- | --- |
| `GET /api/health` | 已有，返回 `ok`、模型、数据库、协议版本 | 已接入，失败自动进入离线 Demo | 可用 |
| `GET /api/npcs` | 已有，返回 `{ npcs }`，每项包含 `profile` | 已支持该结构 | 可用，但缺 Cyrus |
| `GET /api/stories` | 已有，返回 `{ stories }` | 已支持，并可按 `npc` 显示名匹配 | 可用，但当前故事绑定 Alex |
| `GET /api/stories/:id` | 已有公开详情 | P0 不依赖 debug 数据 | 可用 |
| `POST /api/stories/:id/playthroughs` | 已有，返回 `{ session, debug }` | 只消费 `session`，忽略 `debug` | 可用 |
| `POST /api/playthroughs/:id/turn` | 已有，接收 `clientTurnId` 和 `text` | 已接入，失败重试复用同一 ID | 可用 |
| 回合幂等 | SQLite `client_turns` 已缓存相同 `clientTurnId` 的结果 | 已按同一个 ID 重试 | 可用 |
| `GET /api/playthroughs/:id` | 已有公开会话恢复 | 已接入并保存会话 ID | 可用 |
| NPC 情绪 | 内部事件有 `emotionId` | 可映射六种前端情绪 | 公开响应缺字段 |
| 剧情进度 | 未返回 `progress` | 缺失时降级展示剩余回合 | 可降级，建议补 |
| 中文翻译 | 未返回 `translationZh` | 缺失时隐藏翻译 | 可降级 |
| 稳定错误码 | 只有 `error` 和可选 `issues` | 可按 HTTP 状态降级处理 | 可降级，建议补 |
| 学习复盘 | 没有 `/review` 接口 | 真实剧情结局不会展示假评分 | P1 未开始 |

## 3. P0 必做清单

### 后端

- [ ] 新增或发布 Cyrus NPC，公开 ID 建议固定为 `cyrus`。
- [ ] 新增 Cyrus 版本的「拿错了老板的午饭」故事，或把现有 Alex 故事显式迁移为 Cyrus。
- [ ] 在 `session.activeNpc` 返回规范化 `emotionId`。
- [ ] 在回合响应 `npc` 返回规范化 `emotionId`。
- [ ] 在公开 NPC 事件中保留 `emotionId`，确保刷新恢复后表情正确。
- [ ] 提供一个前端可访问的 API 环境，并配置完整 MAAS 环境变量。

### 前端

- [x] 接入健康检查、NPC、故事、playthrough 和 turn。
- [x] 支持动态任务、提示、剩余回合、NPC 回复和结局。
- [x] 支持会话恢复与同一 `clientTurnId` 重试。
- [x] 支持后端不可用时回退离线 Demo。
- [ ] 确定部署方式：将前端产物放入后端 `dist` 由 Express 同源托管，或配置跨域 API Base URL。
- [ ] 使用真实后端环境跑一遍完整 Cyrus 剧情契约测试。

## 4. P0 建议增强

### 后端

- [ ] `GET /api/stories` 增加稳定 `npcId`，避免依赖显示名匹配。
- [ ] PublicSession 增加 `progress: { current, total, percent }`。
- [ ] 错误响应增加 `code` 和 `retryable`。
- [ ] 可选返回 `translationZh`。
- [ ] 生产响应移除 `debug`，或仅在显式 debug 模式返回。

### 前端

- [ ] 如果采用跨域部署，在 HTML 启动前注入 `window.LINGOSTORY_API_BASE_URL`。
- [ ] 为服务不可用、会话过期和故事下线补充更明确的用户提示。

## 5. P1 学习复盘

后端需要新增独立 Learning Reviewer，并提供：

- `POST /api/playthroughs/:id/review`
- `GET /api/playthroughs/:id/review`
- 每句话的流畅度、地道度、正确度、语法/用词问题、自然改写和语块

前端已有折线图、重点句和带练 UI。接口完成后需把当前离线评分数据替换为真实 review 数据。

## 6. 联调验收标准

- [ ] 前端选择 Cyrus 后进入“真实 API”模式，而不是离线演示。
- [ ] 创建会话后展示真实目标和开场。
- [ ] 连续提交多轮文本可推进不同剧情节点。
- [ ] 每轮 NPC 表情与后端 `emotionId` 一致。
- [ ] 刷新后恢复到相同 playthrough、任务和表情。
- [ ] 模拟一次 5xx 后使用相同 `clientTurnId` 重试，不重复推进。
- [ ] 三种结局至少各验收一条路径。
- [ ] 后端不可用时前端仍可进入离线 Demo。
