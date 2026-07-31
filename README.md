# LingoStory Demo

一个用剧情状态机演示英语口语练习的交互前端。当前故事是「拿错了老板的午饭」：

- 4 轮沟通任务和倒计时
- 有效 / 可理解 / 需要补救三条演示路径
- Alex 中性、不耐烦、释然三种表情状态
- 多结局和口语复盘
- 奶油纸张底、粗黑手绘线、明快原色的生活方式插画风

## 画风升级（2026-07-31）

本次版本将原来的写实沉浸风调整为生活方式手绘插画风：场景采用奶油纸张质感、粗黑线与明快原色；NPC 统一为圆润卡通造型，并保留中性、不耐烦、释然三种剧情表情。

## 本地使用

```bash
npm test
node scripts/build-offline.mjs
```

构建后的单文件离线 Demo 位于 `outputs/LingoStory-Offline-Demo.html`，双击即可打开，不依赖网络。

## 主要文件

- `site/index.html`：页面结构
- `site/styles.css`：视觉系统与响应式布局
- `site/app.js`：剧情状态机和交互
- `public/assets/`：场景与 NPC 表情素材
