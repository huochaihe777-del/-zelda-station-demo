// 模型友好存储 对话引擎：经后端代理调用 DeepSeek（SSE 流式透传）
// 之前是浏览器直接调，API key 会暴露在 view-source；现在 key 留 server 端
// SKILL + 世界状态 + 玩家记忆 一起注入 prompt，模型综合生成

async function gen3Talk(npcId, { onDelta } = {}) {
  const cfg = window.LLM_CONFIG || {};
  const skill = SKILLS[npcId];
  const loreContext = await buildExternalLoreContext(npcId);
  const systemPrompt = buildSystemPrompt(skill, loreContext);
  const userMessage = buildUserMessage(npcId, loreContext);

  let rawText = '';
  let result;
  let tFirstByte = null;
  const tStart = performance.now();

  try {
    // 调本服务的 /api/llm/chat 代理（同源或 BACKEND_URL 配置的远端）
    const proxyUrl = (window.BACKEND_URL || '') + '/api/llm/chat';
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        temperature: cfg.temperature ?? 0.8,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText}\n${errBody.slice(0, 400)}`);
    }

    // ----- 读 SSE 流 -----
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (tFirstByte === null) tFirstByte = performance.now();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 留下最后一段，可能未完整

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (delta) {
            rawText += delta;
            if (onDelta) {
              const partialDialogue = extractStreamingDialogue(rawText);
              if (partialDialogue) onDelta(partialDialogue);
            }
          }
        } catch { /* 单行 SSE 解析失败忽略 */ }
      }
    }

    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(clean);
  } catch (err) {
    return errorResult(err.message, systemPrompt, userMessage, rawText);
  }

  const dt = Math.round(performance.now() - tStart);
  const ttfb = tFirstByte ? Math.round(tFirstByte - tStart) : -1;

  return {
    dialogue: result.dialogue || '（沉默）',
    actions: (result.actions && result.actions.length)
      ? result.actions
      : [{ label: '（离开）', effect: 'leave' }],
    memoryNote: result.memory_note,
    debugInfo: {
      generation: 'gen3',
      title: `+ 模型友好存储：${cfg.provider || 'LLM'} · ${cfg.model || ''} · 流式（首字 ${ttfb}ms · 总 ${dt}ms）`,
      content:
`【System Prompt】
${systemPrompt}

──────────

【User Message】
${userMessage}

──────────

【API 返回（流式累积后解析的 JSON）】
${JSON.stringify(result, null, 2)}`,
    },
  };
}

// 从尚未结束的 JSON 字符串里抽取 dialogue 字段当前值
function extractStreamingDialogue(raw) {
  const m = raw.match(/"dialogue"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!m) return '';
  try {
    return JSON.parse('"' + m[1] + '"');
  } catch {
    // JSON 解析失败时，简单处理常见转义
    return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function errorResult(errMsg, systemPrompt, userMessage, rawText) {
  return {
    dialogue:
`[模型友好存储调用失败]

${errMsg}

可能原因：
• API key 失效或额度耗尽
• 浏览器 CORS 拦截（DeepSeek 通常允许，若被拦截需要本地代理）
• 网络不通

可以先切到结构化 / + 半结构化/文件查看本地对话效果。`,
    actions: [{ label: '好的', effect: 'leave' }],
    debugInfo: {
      generation: 'gen3',
      title: '+ 模型友好存储：API 调用失败（仍可看到完整 prompt）',
      content:
`错误：${errMsg}
${rawText ? `\n原始返回（前 400 字符）：\n${rawText.slice(0, 400)}\n` : ''}
即便没调通，下面是真正"会被送给模型"的全部上下文 ——
和前两层相比，模型友好存储的差异就是 SKILL / 记忆 / 世界状态 / 玩家状态 / 外部世界观召回全部进 prompt。

──────────

【System Prompt】
${systemPrompt}

──────────

【User Message】
${userMessage}`,
    },
  };
}

async function buildExternalLoreContext(npcId) {
  if (typeof backendSearchLore !== 'function') {
    return { query: '', results: [], status: 'backend_unavailable' };
  }
  const query = buildLoreSearchQuery(npcId);
  const result = await backendSearchLore(query, 5);
  return rememberLoreContext(result || { query, results: [], status: 'search_failed' }, npcId);
}

function buildLoreSearchQuery(npcId) {
  const npc = npcs.find(n => n.id === npcId);
  return [
    npc?.name || npcId,
    npcId === 'hostess' ? '地点 学校 规矩 食物' : '',
    npcId === 'merchant' ? '物品 商人 阵营' : '',
    npcId === 'soldier' ? '机构 职位 事件 规则' : '',
    npcId === 'bard' ? '典故 传说 时间线' : '',
    worldState.caveStatus !== 'unexplored' ? '禁林 独角兽 魔法部 学校 通行 规矩 密信' : '',
    player.behaviorTags.join(' '),
    player.inventory.join(' '),
    worldState.weather,
    worldState.timeOfDay,
  ].filter(Boolean).join(' ');
}

function rememberLoreContext(loreContext, npcId) {
  const context = {
    query: loreContext?.query || buildLoreSearchQuery(npcId),
    results: loreContext?.results || [],
    status: loreContext?.status || 'ok',
    method: loreContext?.method || 'unknown',         // 'vector' | 'keyword-like' | 'recent'
    model: loreContext?.model || null,                // 方舟 endpoint id（vector 路径才有）
    dim: loreContext?.dim || null,
    embeddedCount: loreContext?.embeddedCount || null,
    timing: loreContext?.timing || null,              // { embed_ms, rank_ms }
    fallbackReason: loreContext?.fallbackReason || null,
    npcId,
    generatedAt: Date.now(),
  };
  window.lastLoreContext = context;
  return context;
}

function formatLoreContext(loreContext) {
  const results = loreContext?.results || [];
  if (!results.length) {
    return '（未召回外部世界观片段；如果后端已启动，可检查 /api/lore/status）';
  }
  // 把召回方式作为 prompt 头一行，让 LLM 知道这是 cosine 召回的相关片段（不是关键词）
  const methodLine = loreContext?.method === 'vector'
    ? `[召回方式: 向量 cosine 相似度 · 模型 ${loreContext.model} · ${loreContext.dim} 维]`
    : loreContext?.method === 'keyword-like'
      ? '[召回方式: 关键词 LIKE 兜底]'
      : '';
  const lines = results.map((hit, index) => {
    const tags = hit.tags?.length ? `；tags=${hit.tags.join('/')}` : '';
    const score = typeof hit.score === 'number' ? `（score=${hit.score}）` : '';
    return `${index + 1}. [${hit.category}] ${hit.title}${score}（来源：${hit.sourcePath}${tags}）\n   摘要：${hit.safePreview}`;
  });
  return methodLine ? `${methodLine}\n${lines.join('\n')}` : lines.join('\n');
}

function buildSystemPrompt(skill, loreContext) {
  return `你是一个游戏NPC对话生成器。你需要扮演指定NPC，根据SKILL声明、世界状态和玩家信息，生成符合角色性格的对话。

## 输出格式要求
必须返回纯JSON，不要用Markdown包裹，格式：
{
  "dialogue": "NPC说的话，可以多段，用\\n分隔",
  "actions": [
    {"label": "显示给玩家的选项文字（10字以内）", "effect": "snake_case效果标识"}
  ],
  "memory_note": "本次交互的一句话摘要"
}

## actions规则
- 提供2-3个行动选项
- effect用snake_case，如 accept_quest_cave, give_ore, return_soup, rest, leave
- 至少包含一个"离开"选项: {"label": "（离开）", "effect": "leave"}
- 如果NPC有理由提供任务，加入任务相关选项
- 如果 caveStatus=letter_received 且 NPC 是惠子，可以提供 {"label":"接受任务","effect":"accept_quest_cave"}
- 如果 caveStatus=quest_accepted 且 NPC 是大壮，可以提供 {"label":"领取许可","effect":"grant_cave_permit"}
- 如果玩家背包里有"矿石"且对话场景适合，可以给"把矿石给她"选项（effect: give_ore）
- 如果玩家有 thief 标签 + 背包里有"暖暖汤"，可以给"归还暖暖汤"选项（effect: return_soup）

## NPC的SKILL声明
${skill}

## 外部世界观检索结果
以下内容来自后端索引的外部 compiled 世界观语料库。只把它当作可参考的风格/设定素材，不要大段复述来源文本，不要声称玩家进入了该原作世界。
${formatLoreContext(loreContext)}

## 当前世界状态
- 时段：${worldState.timeOfDay}
- 天气：${worldState.weather}
- 距离血月：${worldState.bloodMoonCountdown}天${worldState.bloodMoonCountdown === 0 ? '（正在血月！）' : ''}
- 东边山洞状态：${worldState.caveStatus}
- 近期事件：${worldState.recentEvents.join('；')}

## 关键约束
- 对话必须完全符合NPC的性格和说话风格
- 必须引用玩家记忆中的相关内容（如果有的话）
- 对话3-6句话，不要太长
- 如果玩家有负面行为标签（thief），NPC必须自然地做出反应
- 如果多个条件同时存在（如：下雨+受伤+偷过东西+帮过忙），要自然融合表达，而不是只提一个
- 商人（merchant）有特殊机制：能知道玩家在老板娘那里的表现 —— 玩家偷过东西时商人会暗示"老板娘气得不轻"，玩家帮过忙时商人会说"老板娘刚才夸你"
- 外部世界观只用于增强设定一致性和隐喻，不要直接复制或长篇改写来源内容`;
}

function buildUserMessage(npcId, loreContext) {
  const memoryText = memory.entries.length > 0
    ? memory.entries.map(m => `- ${m.detail}`).join('\n')
    : '- 这是玩家第一次来到这个驿站';

  const npc = npcs.find(n => n.id === npcId);

  return `## 当前交互的NPC
${npc.name}

## 玩家当前状态
- 血量：${player.hp}/${player.maxHp}（${Math.round(player.hp / player.maxHp * 100)}%）
- 背包：${player.inventory.length > 0 ? player.inventory.join('、') : '空'}
- 行为标签：${player.behaviorTags.length > 0 ? player.behaviorTags.join('、') : '无特殊行为'}
- 来驿站次数：${player.visitCount}

## 玩家交互记忆
${memoryText}

${memory.summary ? `## 记忆归纳\n${memory.summary}` : ''}

## 本轮外部世界观召回
- query: ${loreContext?.query || '无'}
- 命中数: ${loreContext?.results?.length || 0}

请生成这个NPC此刻会对玩家说的话。`;
}
