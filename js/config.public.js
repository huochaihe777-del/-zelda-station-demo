// 公开配置（进 git，部署到 Vercel 后会被加载）
// 注意：apiKey 不在这里 —— DeepSeek 调用走后端 /api/llm/chat 代理，key 留在 Railway env vars
// 部署后请把 BACKEND_URL 改成你的 Railway 域名（不带末尾斜杠）

// 后端 URL：留空 = 同源（本地开发用）；部署后改成 Railway URL
// Vercel 部署时浏览器从这里读取，所有 /api/* 调用都会指向 Railway 后端
window.BACKEND_URL = window.BACKEND_URL || 'https://zelda-station-demo-production.up.railway.app';

window.LLM_CONFIG = window.LLM_CONFIG || {
  provider: 'deepseek',
  model: 'deepseek-chat',
  temperature: 0.8,
};
