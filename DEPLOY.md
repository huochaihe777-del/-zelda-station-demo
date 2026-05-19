# 部署指南:Vercel 前端 + Railway 后端

## 架构

```
浏览器
  ├──> Vercel(静态前端:HTML/CSS/JS/SVG)
  └──> Railway(Node + SQLite 后端)
        ├──> 火山方舟 embedding API(向量召回)
        └──> DeepSeek API(LLM 对话)
```

DeepSeek 和方舟 API key 都在 **Railway env vars**,不进 git、不暴露给浏览器。

---

## 一、推 GitHub(5 分钟)

```bash
cd /Users/bytedance/Documents/AI\ project/AI_data_game/zelda-station-demo

# 已经 git init,直接 commit
git add .
git commit -m "Initial: zelda-station-demo with vector retrieval + LLM proxy"

# 在 GitHub 新建一个仓库(空仓,不要 README),拿到 URL,然后:
git remote add origin git@github.com:你的账号/zelda-station-demo.git
git push -u origin main
```

确认 push 完后 GitHub 仓库里**不应该包含**:
- ❌ `.env.local`
- ❌ `js/config.local.js`
- ❌ `data/game.sqlite`
- ❌ `node_modules/`
- ❌ `.claude/`

---

## 二、部署 Railway 后端(10 分钟)

1. 登录 [railway.app](https://railway.app),点 **New Project → Deploy from GitHub repo**,选 `zelda-station-demo` 仓库
2. Railway 自动检测到 `package.json` + `nixpacks.toml`,会用 Node 22 + `npm start`
3. **Settings → Region**:改成 **Singapore**(亚太节点调方舟/DeepSeek 国内 API 更快)
4. **Settings → Volumes → Add Volume**:Mount Path = `/app/data`,Size 1 GB(持久化 SQLite)
5. **Variables**(Settings → Variables → Raw Editor,粘贴):

```
ARK_EMBEDDING_API_KEY=ark-xxx...
ARK_EMBEDDING_ENDPOINT=ep-20260425105526-7bkxt
ARK_EMBEDDING_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal
ARK_EMBEDDING_BATCH_SIZE=64
DEEPSEEK_API_KEY=sk-xxx...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

(把 key 值从本地 `.env.local` 复制过来)

6. 点 **Deploy** — 等待 2-3 分钟
7. 部署完 **Settings → Networking → Public Networking → Generate Domain**,拿到域名,如 `zelda-xxx.up.railway.app`
8. 检查:浏览器打开 `https://zelda-xxx.up.railway.app/api/health` 应返回 `{"ok":true,...}`

### 首次部署后:reindex lore 数据

Railway Volume 是空的,需要触发一次 reindex 把 499 个 chunk 重新 embed:

- **方法 A**(简单):Railway dashboard → Service → 三点菜单 → **Restart**,server 启动时会自动后台 reindex(看 Logs 显示 `[embedding] N/499 完成`)
- **方法 B**(手动):Service → Settings → 改 startCommand 为 `node server.mjs --ingest-lore`,Deploy 一次,完了再改回 `node server.mjs`

reindex 完成后(8 分钟左右),数据库就有 499 个 chunk × 2048 维向量了。

---

## 三、部署 Vercel 前端(5 分钟)

1. 登录 [vercel.com](https://vercel.com),点 **Add New → Project → Import Git Repository**,选 `zelda-station-demo`
2. Framework Preset 留 **Other**(纯静态 HTML,不需要 build)
3. **Build & Output Settings**:全部留空
4. **Environment Variables**:**不需要**(前端的 BACKEND_URL 写在 `js/config.public.js`)
5. 点 **Deploy** — 等 30 秒
6. 部署完拿到域名,如 `zelda-xxx.vercel.app`

### 前端配置后端地址

打开 `js/config.public.js`,把 Railway 域名填上:

```js
window.BACKEND_URL = 'https://zelda-xxx.up.railway.app';
```

提交 + push,Vercel 自动重新部署:

```bash
git add js/config.public.js
git commit -m "config: point BACKEND_URL to Railway"
git push
```

---

## 四、验证(2 分钟)

1. 打开 `https://zelda-xxx.vercel.app/`
2. 应该看到 demo 界面,SQLite + JSON 后端已连接
3. 切到 **极端复合** 场景,跟惠子对话(选 + 模型友好存储)
4. **预期**:NPC 流式回复,右侧 dataflow 看到 `🧲 真向量召回 · cosine similarity · 模型 ep-... · 2048 维`
5. 浏览器 console:**应该看不到 DeepSeek key 字段**(view-source 也没有)

---

## 五、保活(可选)

Railway free tier 实例休眠唤醒要 3-5 秒,演讲场景下"老板打开第一秒转圈"不好看。

**最便宜的保活**:[cron-job.org](https://cron-job.org) 免费注册,新建任务:
- URL: `https://zelda-xxx.up.railway.app/api/health`
- 频率:每 5 分钟
- Railway 实例就永远是热的

---

## 六、常见问题

### Q: 部署后向量召回为啥还是 LIKE 兜底?
A: Volume 是空的,server 启动时正在后台 reindex。看 Railway Logs `[embedding] N/499 完成` 走完后再试。

### Q: gen3 对话报错 "503: DEEPSEEK_API_KEY 未在服务端配置"?
A: Railway Variables 没填 `DEEPSEEK_API_KEY`。去 Settings → Variables 补上。

### Q: 浏览器 console 报 CORS 错误?
A: `server.mjs` 已加 `Access-Control-Allow-Origin: *`,正常不会报。如果报了,检查 `js/config.public.js` 里 `BACKEND_URL` 是否带了末尾斜杠(不应该带)。

### Q: 演讲前怎么预热?
A: 演讲前 30 秒在浏览器打开 demo 一次,所有 API 都触发到,Vercel + Railway 都进入热状态,演讲过程中保持热。

### Q: 后续怎么更新?
A: 改代码 → `git push` → Vercel 和 Railway 都会自动重新部署。
