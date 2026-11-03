# AI 角色参考与合成工作台 · 中文版（3合1）

> **姿势库（1,439 张素体白模 + 1,439 张深度图 Depth） + 服装库（1,407 套） + 人像库（1,499 位） = 4,345 条全中文参考数据 / 11,568 张本地高清图**，集成 **AI 角色合成工作台**（本 fork：出图由站内 studio 提供）。

![画廊总览预览](docs/preview.jpg)

![AI 角色合成台预览](docs/studio.jpg)

<details><summary>手机端预览</summary>

![手机端预览](docs/mobile.jpg)

</details>

**在线演示：** <https://ai-pose-gallery.anhao.app/>
**原始站点：**
- 姿势库（白模）：<https://ai-pose-gallery.pages.dev/>
- 姿势深度图库（Depth）：<https://ai-pose-depth-gallery.pages.dev/>
- 服装库：<https://ai-costume-gallery.pages.dev/>
- 人像库：<https://ai-portrait-gallery.pages.dev/>

**原作者：** ギア（@giaaibusi）
**中文版维护：** Anhao · [X @anhao_ai](https://x.com/anhao_ai)
**GitHub：** <https://github.com/anhao/ai-pose-gallery-zh>

> ⚠️ **免责声明（必读）**：
> 1. **学习与创作限定**：本项目及配套插件/工作流**仅供个人学习、人体动态研究、合法艺术创作与技术交流使用**，严禁用于任何违反法律法规、生成违法违规/淫秽色情内容或侵害他人合法权益（如未经授权的真人肖像换脸）的用途。
> 2. **NSFW 敏感内容提示**：图库包含部分 18+ 成人向人体素体姿势与内衣/性感穿搭参考，系统默认开启「安全模式 (SFW)」隐藏，**未成年人严禁解锁或访问**。
> 3. **来源与版权声明**：全部姿势、服装、人像参考图均源自原作者 **ギア（@giaaibusi）** 公开站点，版权归原作者所有；本仓库仅为中文翻译整理与工程学习存档，禁止将图库图片打包倒卖。使用者因违规使用产生的一切法律责任由使用者本人独立承担。

---

## 这是什么

原站是ギア（@giaaibusi）发布的三大 AI 绘画参考图库（姿势、服装、人像），元数据全部为日文，且分散在三个独立站点。本仓库（v2.0）完成了**三站合一、全量中文化、AI 角色合成工作台**：

1. **三库四站全量本地镜像（11,568 张图）** —— 完整收录姿势库（素体白模 2,878 张 + 深度图 Depth 2,878 张 WebP）、服装库（2,814 张 WebP）、人像库（2,998 张，全尺寸 `1600×2000` 高清 WebP）的全部缩略图与高清原图，支持纯离线浏览与静态托管。
2. **100% 纯净中文元数据（零日文残留）** —— 动作体系、姿势分类、服装款式、穿搭标签、人像分区、发长与 51 种细分发型全部译为地道中文，自动组装的生图提示词纯净无日文干扰。
3. **三合一 AI 角色合成工作台（Web Studio）** —— 基于 **React 19 + Tailwind CSS 4 + TypeScript 7 + shadcn/ui + TanStack Router** 构建的响应式多页面应用（兼容 PC / 平板 / 手机）：
   - 从三大图库任意挑选 **人像 + 服装 + 姿势（支持素体白模 / 深度图一键切换）** 组合配方，或一键随机捏人；
   - 支持拖拽、剪贴板粘贴（`Cmd+V` / `Ctrl+V`）或 URL 添加多张自定义附加参考图；
   - 出图由站内 studio 提供（同源 `/api/studio/v1`，OpenAI 兼容接口，无需填写 API Key），生成记录通过 **IndexedDB** 本地持久化保存。
---

## 核心功能

### 1. 三大参考图库（姿势 / 服装 / 人像）
- **姿势参考库（`/poses`）**：4 大体系（全身单人・标准系 / 全身单人・性感系 / 上半身单人 / 双人缠绵）、26 个动作分类、288 组姿势、5 种视角（正面 / 斜前 / 侧面 / 背面 / 俯视），支持**按姿势分组 / 逐张浏览**双模式、卡片内多角度切换，以及 **`[ 素体白模 | 深度图 (Depth) ]` 一键切换预览与下载**。
- **服装参考库（`/costumes`）**：8 大穿搭分类（春季 / 夏季 / 秋季 / 冬季 / 内衣・睡衣 / 性感穿搭 / 泳装・度假 / 派对・礼服）、86 个中文细节标签与英文 Prompt 关键词。
- **人像参考库（`/portraits`）**：2 大分区（正脸参考 893 / 造型氛围 606）、4 种发长（短发 / 中发 / 中长发 / 长发）、51 种细分发型，支持**精选题集**与**热门榜单**一键筛选。
- **统一交互体验**：中文关键词实时检索、灯箱高清原图预览与下载、一键「加入合成配方」。

### 2. AI 角色合成台（`/studio`）
- **3+N 参考图组合**：3 个核心槽位（人像 / 服装 / 姿势，姿势槽位内置 `[ 白模 | 深度 ]` 实时切换）+ 任意张自定义附加参考图（点击上传、拖拽文件、剪贴板粘贴、填写图片 URL）。
- **参考拼图预览与导出**：弹窗查看三合一高清参考拼图（`1800×1200` Canvas 实时合成），支持一键下载拼图 PNG。
- **12 种画风预设 & 纯中文结构化提示词**：内置「无预设（跟随参考图）」、写实人像写真、日韩杂志画报、复古胶片写真、2.5D 游戏原画立绘、日系二次元插画、新海诚感动画电影、日式黑白漫画网点、3D 次世代角色渲染、3D 潮玩手办质感、赛博朋克霓虹、角色设定集立绘（纯白底）共 12 种画风，根据已选素材自动组装提示词。
- **出图由站内 studio 提供**：浏览器只请求同源 `/api/studio/v1/*`，由服务端 nginx 转发到集群内 studio 生图总入口并注入令牌；模型列表从 `GET /api/studio/v1/models` 动态获取（默认 `gpt-image-2`），以后加模型也在 studio 侧完成。参考图以 multipart 上传（单次最多 4 张），无参考图时走文生图；超过 60 秒自动转为后台轮询任务状态。
- **跨页面后台生图 & IndexedDB 历史记录**：切换页面不会中断正在进行的生图请求；生成结果自动存入浏览器 IndexedDB（避免 `localStorage` 容量限制），支持复用提示词与原图下载。

---

## 数据规模

| 图库 | 分类 / 体系划分 | 记录数 | 本地图片文件数 |
| --- | --- | ---: | ---: |
| **姿势库（Pose 白模）** | 全身标准 (365) · 全身性感 (399) · 上半身 (400) · 双人缠绵 (275) | 1,439 | 2,878 张（缩略图 `.jpg` + 原图 `.png`） |
| **姿势深度图（Pose Depth）** | 与 1,439 条姿势 ID 一一对应（`POSE-DB-02`） | 1,439（共享索引） | 2,878 张（缩略图 `.webp` + 原图 `.webp`） |
| **服装库（Costume）** | 春季 (215) · 夏季 (254) · 秋季 (244) · 冬季 (253) · 内衣睡衣 (199) · 性感 (140) · 泳装 (54) · 礼服 (48) | 1,407 | 2,814 张（缩略图 `.webp` + 原图 `.webp`） |
| **人像库（Portrait）** | 正脸参考 (893) · 造型氛围 (606) / 短发 (727) · 中发 (376) · 中长发 (260) · 长发 (136) | 1,499 | 2,998 张（缩略图 `.webp` + `1600×2000` 原图 `.webp`） |
| **合计** | **3 大图库全中文索引（含白模 + 深度双视图）** | **4,345** | **11,568 张** |

---

## 技术栈与目录结构

- **前端框架**：React 19.3 + TypeScript 7.0 + Vite 8 (Rolldown)
- **路由与状态**：TanStack Router + TanStack Query + IndexedDB 本地存储
- **样式与组件**：Tailwind CSS 4.3 + shadcn/ui (Radix UI) + Lucide Icons
- **代码质量**：Oxlint + Oxfmt

```text
.
├── src/
│   ├── components/         # 通用组件、AppLayout 响应式导航、GalleryLightbox 灯箱、RecipeDock
│   ├── routes/             # 页面路由：概览(index)、姿势(poses)、服装(costumes)、人像(portraits)、合成台(studio)、出图设置(settings)、指南(guide)
│   ├── services/           # studio 出图客户端、提示词组装与 Canvas 拼图合成 (aiGenerator.ts)
│   ├── store/              # 全局配方、生图状态与 IndexedDB 历史管理 (studioStore.tsx)
│   ├── lib/                # 数据加载器 (dataLoader.ts) 与 IndexedDB 工具 (idbStorage.ts)
│   └── types/              # 三库数据结构与出图配置类型定义 (gallery.ts)
├── deploy/web/             # 集群版 web 镜像（非 root nginx + 站点；/api/studio 同源反代）
├── chart/pose/             # 集群工作负载 chart（HelmOp 部署）
├── worker.ts               # Cloudflare Worker 入口（只服务 /img、/thumbs 静态图片）
├── wrangler.jsonc          # Cloudflare Workers 配置文件
├── data/
│   ├── pose.json / pose-zh.json                 # 姿势库原始数据 & 中文数据（1,439 条）
│   ├── costume.json / costume-zh.json           # 服装库原始数据 & 中文数据（1,407 条）
│   ├── portrait.json / portrait-zh.json         # 人像库原始数据 & 中文数据（1,499 条）
│   ├── meta-zh.json / *-meta-zh.json            # 三库中文体系分类元数据与热门榜单
│   └── translations.csv                         # 日⇄中翻译对照表
├── thumbs/                 # 缩略图目录（姿势根目录 + depth/ + costume/ + portrait/）
├── img/                    # 高清原图目录（姿势根目录 + depth/ + costume/ + portrait/）
├── scripts/
│   ├── download.py         # 四站并发下载器（支持 DATASET=all|pose|depth|costume|portrait）
│   ├── i18n.py             # 日译中词典与人像发型/服装标签映射
│   ├── apply_translation.py# 生成三库 *-zh.json 纯中文数据与检索索引
│   ├── verify.py           # 校验本地图片完整性（存在性 / 大小 / 文件头）
│   └── build.sh            # 构建 Cloudflare 发布目录 dist/
├── skills/                 # Claude Code / Agent 姿势・服装・人像检索技能包
└── README.md
```

---

## 本地开发与构建

需要 **Node.js 20+** 与 **pnpm**：

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地开发服务器（默认 http://localhost:5173）
pnpm dev

# 3. 类型检查 + 生产构建 + 代码规范检查
pnpm build && pnpm lint
```

### 数据与图片维护脚本（Python 3）

```bash
# 拉取/补全三站图片（已存在的文件自动跳过，支持断点续传）
python3 scripts/download.py
WORKERS=64 python3 scripts/download.py   # 调整并发线程数

# 修改 scripts/i18n.py 词典后，重新生成三库中文 JSON
python3 scripts/apply_translation.py

# 校验全部图片文件是否完整
python3 scripts/verify.py
```

---

## 部署（codearea fork）

- **站点与出图**：CI（`.github/workflows/codearea.yml`）构建 web 镜像 `ghcr.io/ioucode/ai-pose-gallery-zh-web`（不含 `img/`、`thumbs/`）并推 chart `oci://ghcr.io/ioucode/charts/pose`，集群里由 HelmOp 部署；`/api/studio/v1/*` 由 Pod 内 nginx 转发到集群内 studio。
- **图片**：约 1.2 GB 的 `img/`、`thumbs/` 仍由 Cloudflare Worker 提供（[worker.ts](worker.ts)，经路由 `pose.codearea.cc/img/*`、`/thumbs/*`），产物镜像 `ghcr.io/ioucode/ai-pose-gallery-zh` 由 cf-workers 仓库的 `pose-gallery/deploy.sh` 上传。

---

## Agent 技能（Skills）

`skills/` 下提供 8 个 `SKILL.md` 格式的 Agent 技能，让 AI Agent 直接检索本仓库三大图库，作为生图 / 生视频的姿势、服装、人像参考。每个技能的 `references/catalog.csv` 用**相对路径**（`../../img/…`）指向本仓库 `img/`，不重复存图：

| 技能 | 图片数 | 范围 |
| --- | ---: | --- |
| `pose-reference-standard` | 365 | 全身单人・标准系 |
| `pose-reference-upper` | 400 | 上半身单人 |
| `pose-reference-sexy` | 399 | 全身单人・性感系（18+） |
| `pose-reference-couple` | 275 | 双人缠绵（18+） |
| `pose-reference-all` | 1,439 | 全部姿势 |
| `costume-reference` | 1,068 | 服装：春夏秋冬・派对礼服・泳装度假（按单品 / 颜色 / 英文关键词检索） |
| `costume-reference-sexy` | 339 | 服装：内衣睡衣・性感穿搭（18+） |
| `portrait-reference` | 1,499 | 人像：正脸参考・造型氛围，按发长 / 51 种发型检索 |

```bash
git clone --depth 1 https://github.com/anhao/ai-pose-gallery-zh.git ~/ai-pose-gallery-zh
mkdir -p ~/.claude/skills
for d in ~/ai-pose-gallery-zh/skills/*-reference*; do ln -s "$d" ~/.claude/skills/; done
```

技能靠相对路径读取 `img/`，请**软链**而不是复制，并保留整个仓库。三个技能可组合使用：人像定脸和发型 + 服装定穿搭 + 姿势定动作。

---

## 免责声明与版权说明（Disclaimer）

1. **合法合规与学习用途声明（严禁违法）**
   - 本项目（含前端工作台及 Agent 技能）**仅供个人学习、人体结构研究、绘画动作参考与技术交流使用**。
   - **严禁将本项目用于任何违法违规用途**，包括但不限于生成制作传播淫秽色情物品、暴力恐怖内容、虚假违法信息，或未经他人明确授权使用真实人物照片进行换脸/深伪合成（Deepfake）等侵犯他人肖像权、隐私权与名誉权的行为。
   - 出图由站内 studio 提供：生图时参考图与提示词会发送到站内 studio，生成结果保存在 studio 与本机浏览器中，不对外公开。**使用者对其上传素材及生成内容承担全部法律责任，本仓库作者及贡献者不对使用者的任何不当或违法行为承担责任。**
2. **NSFW（18+）敏感内容声明**
   - 图库中包含部分成人向 3D 素体姿势（全身单人・性感系、双人缠绵）及性感/内衣穿搭参考，旨在服务插画师与创作者的人体动态与光影练习。
   - 站点默认开启 **「安全模式 (SFW)」** 屏蔽上述分类；**未满 18 周岁的未成年人严禁关闭安全模式或访问相关内容**。
3. **数据来源与版权归属声明**
   - 本仓库中的全部姿势（`ai-pose-gallery.pages.dev`）、服装（`ai-costume-gallery.pages.dev`）、人像（`ai-portrait-gallery.pages.dev`，CC0 1.0 协议）图片与原始数据的著作权归原作者 **ギア（@giaaibusi）** 所有。
   - 本仓库仅为中文本地化翻译与前端工程实践存档，不对原始图片主张任何权利，**严禁任何人将本仓库图片提取后进行商业倒卖或付费分发**。若原作者对镜像存档有任何异议，请联系维护者立即处理。
4. **开源协议**
   - 前端应用代码（`src/`）与数据处理脚本（`scripts/`）以 [MIT 协议](LICENSE) 开源；该协议**不覆盖** `img/`、`thumbs/` 与 `data/` 中的图片及原始数据。
