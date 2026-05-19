// 数据流面板：把"三代差异不在文案而在数据如何被获取、组织、融合、写回"显式化

// ----- 12 项数据源（覆盖三代会涉及的所有源） -----
const DATA_SOURCES = [
  { key: 'npc_table',      label: 'NPC 表 / Profile',  desc: 'npc_id → name / position' },
  { key: 'fixed_dialogue', label: '固定对话表',          desc: 'dialogue_nodes 查表' },
  { key: 'cond_template',  label: '条件模板',            desc: 'templates[] + condition' },
  { key: 'player_state',   label: '玩家状态',            desc: 'HP / visitCount' },
  { key: 'player_inv',     label: '玩家背包',            desc: 'player.inventory' },
  { key: 'player_tags',    label: '行为标签',            desc: 'player.behaviorTags' },
  { key: 'player_memory',  label: '玩家记忆',            desc: 'memory.entries / summary' },
  { key: 'world_state',    label: '世界状态',            desc: 'weather / time / blood_moon' },
  { key: 'external_lore',  label: '外部世界观库',        desc: 'compiled corpus / lore chunks' },
  { key: 'quest_state',    label: '任务状态',            desc: 'worldState.caveStatus' },
  { key: 'npc_skill',      label: 'NPC Skill 声明',      desc: '性格 / 口吻 / 知识边界' },
  { key: 'context_pack',   label: 'Context Pack',        desc: '装配后的多源上下文' },
];

// ----- 每代对数据源的使用情况（基于实际代码事实） -----
// used    = ✅ 被读且参与生成
// partial = ⚠️ 被读但只能命中其一，无法融合
// 其余    = ❌ 未读取
const GEN_USAGE = {
  gen1: {
    used:    ['npc_table', 'fixed_dialogue'],
    partial: [],
  },
  gen2: {
    used:    ['npc_table', 'cond_template', 'player_state', 'player_tags'],
    partial: ['world_state', 'external_lore'],
  },
  gen3: {
    used: [
      'npc_table', 'npc_skill', 'player_state', 'player_inv',
      'player_tags', 'player_memory', 'world_state', 'external_lore', 'quest_state',
      'context_pack',
    ],
    partial: [],
  },
};

// ----- 三代"数据怎么存" -----
// 渲染函数返回 HTML 字符串，三代视觉上完全不同
const STORAGE_VIEWS = {
  gen1: () => `
    ${structuredStorageBadge()}
    <div class="storage-caption">SQLite 关系型表 · 字符串字段，每行孤立</div>
    <table class="sql-table">
      <thead>
        <tr><th>id</th><th>npc_id</th><th>text</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>hostess</td><td>旅行者你好！要不要来碗暖汤？</td></tr>
        <tr><td>2</td><td>merchant</td><td>嘿，伙计！看看我的好货吧。</td></tr>
        <tr><td>3</td><td>soldier</td><td>注意安全。</td></tr>
      </tbody>
    </table>
    ${dialogueNodeRowsHtml()}
    <div class="storage-hint">↑ 这不是 UI 假数据：结构化层现在会从 /api/dialogue/gen1 查 SQLite 的 dialogue_nodes。</div>
  `,

  gen2: () => `
    ${semiStructuredBadge()}
    <div class="storage-caption">半结构化 JSON · 把性格当字段、把分支当数组</div>
    <pre class="json-block"><span class="j-punct">{</span>
  <span class="j-key">"id"</span>: <span class="j-string">"hostess"</span>,
  <span class="j-comment">// 存了但运行时不读 ↓</span>
  <span class="j-key dim">"personality"</span>: <span class="j-string dim">"热情啰嗦"</span>,
  <span class="j-key dim">"knowledge"</span>: <span class="j-string dim">["山洞八卦", "莱尼尔传闻"]</span>,
  <span class="j-key">"templates"</span>: <span class="j-punct">[</span>
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"thief"</span>,        <span class="j-key">text</span>: <span class="j-string">"你！我的暖暖汤…"</span> <span class="j-punct">}</span>,
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"hp&lt;30%"</span>,       <span class="j-key">text</span>: <span class="j-string">"哎呀你怎么伤成…"</span> <span class="j-punct">}</span>,
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"weather=rain"</span>, <span class="j-key">text</span>: <span class="j-string">"外面雨好大！"</span> <span class="j-punct">}</span>,
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"visit&gt;=3"</span>,     <span class="j-key">text</span>: <span class="j-string">"又来啦老朋友！"</span> <span class="j-punct">}</span>,
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"time=night"</span>,   <span class="j-key">text</span>: <span class="j-string">"这么晚了…"</span> <span class="j-punct">}</span>,
    <span class="j-punct">{</span> <span class="j-key">cond</span>: <span class="j-string">"default"</span>,      <span class="j-key">text</span>: <span class="j-string">"旅行者你好！"</span> <span class="j-punct">}</span>
  <span class="j-punct">]</span>
<span class="j-punct">}</span></pre>
    ${templateRowsHtml('hostess')}
    <div class="storage-hint">↑ 这批模板现在由后端从 content/dialogue_templates.json 读取并匹配；profile / lore 也以 JSON 资产形式存在。</div>
    <div class="attachment-note">
      <span class="att-badge">📎 附件 + ID 关联范式</span>
      <span class="att-body">同一层还存了 4 张 NPC 头像在 <code>public/avatars/*.svg</code>。结构化表里只放 <code>npc_id</code> + <code>avatar_url</code>，浏览器/客户端按 URL 从文件系统拉文件渲染 —— 等价于医疗的 "基本信息进表 / CT 片进文件 / 用 patient_id 关联拿出"。</span>
    </div>
  `,

  gen3: () => `
    <div class="storage-caption">多份"模型友好资产"· 不再是一张表，是一堆可被装配的语料</div>
    <div class="asset-grid">
      <div class="asset-card asset-md">
        <div class="asset-name">📄 skill.md</div>
        <div class="asset-body">## 性格
- 热情啰嗦，邻居大姐
- 嘴硬心软
## 说话风格
- "哎呀""我跟你说"
## 知识边界
- 不剧透主线
## 任务方向
- 山洞情报…</div>
      </div>
      <div class="asset-card asset-state">
        <div class="asset-name">📊 player_state</div>
        <div class="asset-body">{
  hp: <span class="j-num">${player.hp}</span>/<span class="j-num">${player.maxHp}</span>,
  inventory: ${JSON.stringify(player.inventory)},
  behaviorTags: ${JSON.stringify(player.behaviorTags)},
  visitCount: <span class="j-num">${player.visitCount}</span>
}</div>
      </div>
      <div class="asset-card asset-mem">
        <div class="asset-name">📜 memory.jsonl <span class="asset-meta">append-only</span></div>
        <div class="asset-body">${
          memory.entries.length
            ? memory.entries.slice(-3).map(m => `+ ${escapeHtml(m.detail)}`).join('\n')
            : '(还没有条目)'
        }${memory.summary ? '\n\n💭 ' + escapeHtml(memory.summary) : ''}</div>
      </div>
      <div class="asset-card asset-world">
        <div class="asset-name">🌍 world_state</div>
        <div class="asset-body">{
  weather: <span class="j-string">"${worldState.weather}"</span>,
  time: <span class="j-string">"${worldState.timeOfDay}"</span>,
  blood_moon: <span class="j-num">${worldState.bloodMoonCountdown}</span>,
  cave: <span class="j-string">"${worldState.caveStatus}"</span>,
  events: [...]
}</div>
      </div>
      <div class="asset-card asset-attachment">
        <div class="asset-name">📎 npc.avatar <span class="asset-meta">附件 · 文件系统</span></div>
        <div class="asset-body">
          <div class="avatar-row"><img src="/public/avatars/hostess.svg"  class="avatar-thumb"/><code>/public/avatars/hostess.svg</code></div>
          <div class="avatar-row"><img src="/public/avatars/merchant.svg" class="avatar-thumb"/><code>/public/avatars/merchant.svg</code></div>
          <div class="avatar-row"><img src="/public/avatars/soldier.svg"  class="avatar-thumb"/><code>/public/avatars/soldier.svg</code></div>
          <div class="avatar-row"><img src="/public/avatars/bard.svg"     class="avatar-thumb"/><code>/public/avatars/bard.svg</code></div>
          <div class="avatar-note">表里只有 npc_id + avatar_url，文件本身在 public/avatars/ —— 等价医疗 CT 片范式</div>
        </div>
      </div>
    </div>
    <div class="storage-hint">↑ 没有一张"对话表" —— 文本是 runtime 由模型基于资产生成的；附件（头像）走文件系统，表里只留 URL。</div>
  `,
};

// ----- 三代"运行时怎么查" -----
const QUERY_VIEWS = {
  gen1: () => `<span class="q-comment">-- SQL：一次精确查表，O(1) 命中</span>
<span class="q-kw">SELECT</span> text
<span class="q-kw">FROM</span>   dialogue_nodes
<span class="q-kw">WHERE</span>  npc_id = <span class="q-string">'hostess'</span>
<span class="q-kw">LIMIT</span>  1;

<span class="q-comment">// 当前玩家状态：HP ${pct()}% · ${player.behaviorTags.join(',') || '无 tag'} · ${liveSignalsShort() || '晴天'}
// 不参与查询。返回值永远是 "旅行者你好！要不要来碗暖汤？"</span>`,

  gen2: () => `<span class="q-comment">// 顺序遍历 + 条件匹配，命中第一条即返回</span>
<span class="q-kw">for</span> (<span class="q-kw">const</span> t <span class="q-kw">of</span> npc.templates) {
  <span class="q-kw">if</span> (matchCondition(t.cond, { player, world })) {
    <span class="q-kw">return</span> t.text;       <span class="q-comment">// ← 命中即停</span>
  }
}

<span class="q-comment">// 当前同时满足的条件：
${(() => {
  const hits = [];
  if (player.behaviorTags.includes('thief'))   hits.push('• tag=thief');
  if (pct() < 30)                              hits.push('• hp<30%');
  if (worldState.weather === 'rain')           hits.push('• weather=rain');
  if (player.visitCount >= 3)                  hits.push('• visit>=3');
  if (worldState.timeOfDay === 'night')        hits.push('• time=night');
  return hits.length ? hits.map(h => '//   ' + h).join('\n') + '\n//   ⚠️ 但只取第一个，其余被丢弃' : '//   （只命中默认）';
})()}</span>`,

  gen3: () => `<span class="q-comment">// 多源装配 → 一次推理 → 写回</span>

<span class="q-kw">const</span> loreHits = <span class="q-kw">await</span> vector.search({
  query: <span class="q-string">'${escapeHtml(getLoreSearchQueryForCurrentNpc())}'</span>,
  topK: <span class="q-num">5</span>
});

<span class="q-kw">const</span> system = [
  readFile(<span class="q-string">'skill.md'</span>),         <span class="q-comment">// NPC 性格/口吻/边界</span>
  format(world_state),            <span class="q-comment">// 天气/时段/血月/事件</span>
  format(loreHits),               <span class="q-comment">// 本轮召回的世界观 chunk</span>
  loadConstraints(),              <span class="q-comment">// 不剧透、不滥发奖励</span>
].join(<span class="q-string">'\\n\\n'</span>);

<span class="q-kw">const</span> user = [
  format(player_state),           <span class="q-comment">// HP/背包/tag/来访</span>
  recent(memory, <span class="q-num">10</span>),             <span class="q-comment">// 最近 10 条记忆</span>
  memorySummary(memory),          <span class="q-comment">// 早期归纳摘要</span>
].join(<span class="q-string">'\\n\\n'</span>);

<span class="q-kw">const</span> result = <span class="q-kw">await</span> LLM.complete({ system, user });

<span class="q-comment">// → 只把 TopK 片段送进 prompt，不把几百章全文塞进去
// → 模型自行决定每句话引用哪个源
// → 并输出新的 memory_note 写回 memory.jsonl</span>`,
};

const MODE_TITLE = {
  gen1: '结构化 · 关系表查表',
  gen2: '+ 半结构化/文件 · 模板与资产匹配',
  gen3: '+ 模型友好存储 · 多源上下文 + Agent',
};

const MODE_SUMMARY = {
  gen1: '只读 npc_id 和固定对话表。玩家状态、记忆、性格统统不进对话。',
  gen2: '读取部分状态做条件匹配。多条件同时存在时只能命中一个，无法融合。',
  gen3: '从多源数据装配 Context Pack 交给 Agent。性格、记忆、状态、世界全部融合，并将结果写回。',
};

function structuredStorageBadge() {
  const storage = window.backendStorage?.structured;
  if (!storage) {
    return '<div class="storage-hint">后端未连接时展示静态形态；用 node server.mjs 启动后会显示真实 SQLite 表。</div>';
  }
  const tableCount = Object.keys(storage.tables || {}).length;
  const rowCount = Object.values(storage.tables || {}).reduce((sum, table) => sum + table.count, 0);
  return `<div class="storage-hint">✅ 已连接真实后端：${escapeHtml(storage.database)} · ${tableCount} 张表 · ${rowCount} 行结构化记录</div>`;
}

function dialogueNodeRowsHtml() {
  const rows = window.backendStorage?.structured?.tables?.dialogue_nodes?.rows || [];
  if (!rows.length) return '';
  return `<pre class="json-block">${escapeHtml(JSON.stringify(rows.slice(0, 4), null, 2))}</pre>`;
}

function semiStructuredBadge() {
  const storage = window.backendStorage?.semiStructured;
  if (!storage) {
    return '<div class="storage-hint">后端未连接时展示静态形态；用 node server.mjs 启动后会读取 content/*.json。</div>';
  }
  const lore = storage.externalLore;
  const loreLine = lore?.indexed
    ? `<br>外部世界观库：${escapeHtml(lore.rootDir)} · ${lore.sourceCount} 个文件 · ${lore.chunkCount} 个 chunk`
    : `<br>外部世界观库：${escapeHtml(lore?.rootDir || '未配置')} · 未索引`;
  return `<div class="storage-hint">✅ 已连接半结构化资产：${storage.files.map(escapeHtml).join(' / ')}${loreLine}</div>`;
}

function templateRowsHtml(npcId) {
  const templates = window.backendStorage?.semiStructured?.dialogueTemplates?.[npcId] || [];
  if (!templates.length) return '';
  return `<pre class="json-block">${escapeHtml(JSON.stringify(templates.slice(0, 3), null, 2))}</pre>`;
}

// ----- 工具函数 -----
function pct() {
  return Math.round(player.hp / player.maxHp * 100);
}

function liveSignalsShort() {
  const tags = [];
  if (worldState.weather === 'rain')             tags.push('🌧️ 雨');
  if (worldState.weather === 'storm')            tags.push('⛈️ 暴风');
  if (worldState.timeOfDay === 'night')          tags.push('🌙 夜');
  if (worldState.timeOfDay === 'morning')        tags.push('🌅 晨');
  if (worldState.bloodMoonCountdown === 0)       tags.push('🔴 血月');
  else if (worldState.bloodMoonCountdown === 1)  tags.push('🔴 血月-1');
  if (pct() < 30)                                tags.push('❤️ 重伤');
  return tags.join(' · ');
}

function extractSkillChars(skill) {
  if (!skill) return [];
  const m = skill.match(/###\s*性格\s*\n([\s\S]*?)(?=\n###)/);
  if (!m) return [];
  return m[1].split('\n')
    .filter(l => l.trim().startsWith('-'))
    .slice(0, 4)
    .map(l => l.replace(/^\s*-\s*/, '').trim());
}

function getLoreNpcIdForPreview() {
  return dialogueState?.currentNpcId || 'hostess';
}

function getLoreSearchQueryForCurrentNpc() {
  const npcId = getLoreNpcIdForPreview();
  if (typeof buildLoreSearchQuery === 'function') {
    return buildLoreSearchQuery(npcId);
  }
  const npc = npcs.find(n => n.id === npcId);
  return [
    npc?.name || npcId,
    worldState.caveStatus !== 'unexplored' ? '禁林 独角兽 魔法部 学校 通行 规矩 密信' : '',
    player.inventory.join(' '),
    worldState.weather,
    worldState.timeOfDay,
  ].filter(Boolean).join(' ');
}

// ----- 写回区状态 -----
let lastWriteBack = null;
let vectorRecallRequestId = 0;
let vectorRecallCacheKey = '';
let vectorRecallCache = null;

function logWriteBack(label, changes) {
  lastWriteBack = { label, changes, time: Date.now() };
  renderWriteBack();
}

function clearWriteBack() {
  lastWriteBack = null;
  renderWriteBack();
}

// ----- 渲染入口（Tab 切换 / 状态变化都调） -----
function renderDataflowPanel() {
  if (!document.getElementById('dataflow-mode-title')) return;
  renderModeBlock();
  renderStorageView();
  renderQueryView();
  renderVectorRecall();
  renderSourceList();
  renderContextPack();
  renderWriteBack();
}

function renderModeBlock() {
  document.getElementById('dataflow-mode-title').textContent = MODE_TITLE[currentGeneration];
  document.getElementById('dataflow-mode-summary').textContent = MODE_SUMMARY[currentGeneration];
}

function renderStorageView() {
  const el = document.getElementById('storage-view');
  if (!el) return;
  el.innerHTML = STORAGE_VIEWS[currentGeneration]();
}

function renderQueryView() {
  const el = document.getElementById('query-view');
  if (!el) return;
  el.innerHTML = QUERY_VIEWS[currentGeneration]();
}

function renderVectorRecall() {
  const block = document.getElementById('vector-recall-block');
  const view = document.getElementById('vector-recall-view');
  if (!block || !view) return;
  if (currentGeneration !== 'gen3') {
    block.style.display = 'none';
    return;
  }
  block.style.display = '';

  const query = getLoreSearchQueryForCurrentNpc();
  const key = `${query}|${worldState.caveStatus}|${player.inventory.join(',')}|${memory.entries.length}`;
  if (vectorRecallCache && vectorRecallCacheKey === key) {
    renderVectorRecallResult(view, vectorRecallCache);
    return;
  }

  vectorRecallCacheKey = key;
  vectorRecallCache = null;
  view.innerHTML = `
    <div class="vector-recall loading">
      <div class="vector-query"><span>query</span><code>${escapeHtml(query || '(空)')}</code></div>
      <div class="vector-note">正在调用 /api/lore/search 做 TopK 召回…</div>
    </div>`;

  if (typeof backendSearchLore !== 'function') {
    renderVectorRecallResult(view, { query, results: [], status: 'backend_unavailable' });
    return;
  }

  const requestId = ++vectorRecallRequestId;
  backendSearchLore(query, 5)
    .then((result) => {
      if (requestId !== vectorRecallRequestId) return;
      vectorRecallCache = result || { query, results: [], status: 'search_failed' };
      window.lastLoreContext = {
        ...vectorRecallCache,
        npcId: getLoreNpcIdForPreview(),
        generatedAt: Date.now(),
      };
      renderVectorRecallResult(view, vectorRecallCache);
      renderContextPack();
    })
    .catch((error) => {
      if (requestId !== vectorRecallRequestId) return;
      renderVectorRecallResult(view, { query, results: [], status: 'error', error: error.message });
    });
}

function renderVectorRecallResult(view, recall) {
  const results = recall?.results || [];
  const statusText = recall?.status && recall.status !== 'ok' ? ` · ${escapeHtml(recall.status)}` : '';
  const rows = results.length
    ? results.map((hit, index) => `
      <div class="vector-hit">
        <div class="vector-hit-rank">#${index + 1}</div>
        <div class="vector-hit-main">
          <div class="vector-hit-title">
            <span>${escapeHtml(hit.title || '未命名片段')}</span>
            <em>${escapeHtml(hit.category || 'unknown')}</em>
            ${hit.score != null ? `<strong>score ${escapeHtml(String(hit.score))}</strong>` : ''}
          </div>
          <div class="vector-hit-src">${escapeHtml(hit.sourcePath || 'compiled corpus')}</div>
          <div class="vector-hit-preview">${escapeHtml(hit.safePreview || '（无预览）')}</div>
        </div>
      </div>`).join('')
    : `<div class="vector-empty">未召回片段${recall?.error ? `：${escapeHtml(recall.error)}` : ''}</div>`;

  // 召回方式 badge: 真向量 vs LIKE 兜底
  const methodBadge = recall?.method === 'vector'
    ? `<div class="recall-method real">
         <span class="rm-badge">🧲 真向量召回</span>
         <span class="rm-detail">cosine similarity · 模型 <code>${escapeHtml(recall.model || '?')}</code> · ${recall.dim || '?'} 维 · 已 embed ${recall.embeddedCount || '?'}/${recall.embeddedCount || '?'} chunk · 耗时 ${recall.timing?.embed_ms ?? '?'}ms embed + ${recall.timing?.rank_ms ?? '?'}ms rank</span>
       </div>`
    : recall?.method === 'keyword-like'
      ? `<div class="recall-method fallback">
           <span class="rm-badge">⚠️ 兜底:LIKE 关键词</span>
           <span class="rm-detail">${escapeHtml(recall.fallbackReason || '向量召回不可用')}</span>
         </div>`
      : '';

  view.innerHTML = `
    <div class="vector-recall">
      ${methodBadge}
      <div class="vector-query"><span>query</span><code>${escapeHtml(recall?.query || getLoreSearchQueryForCurrentNpc() || '(空)')}</code></div>
      <div class="vector-flow">
        <b>compiled/*</b>
        <span>chunk + embedding</span>
        <span>TopK=${results.length}/5${statusText}</span>
        <span>写入 System Prompt「外部世界观检索结果」</span>
      </div>
      <div class="vector-hits">${rows}</div>
    </div>`;
}

function renderSourceList() {
  const usage = GEN_USAGE[currentGeneration];
  const used = new Set(usage.used);
  const partial = new Set(usage.partial);
  const ul = document.getElementById('dataflow-sources');
  ul.innerHTML = '';

  DATA_SOURCES.forEach(s => {
    const li = document.createElement('li');
    let icon, cls, hint = '';
    if (partial.has(s.key)) {
      icon = '⚠️'; cls = 'src-partial'; hint = '已读但未融合';
    } else if (used.has(s.key)) {
      icon = '✅'; cls = 'src-on';       hint = '已使用';
    } else {
      icon = '❌'; cls = 'src-off';      hint = '未读取';
    }
    li.className = `df-source ${cls}`;
    li.innerHTML =
      `<span class="src-icon" title="${hint}">${icon}</span>` +
      `<span class="src-label">${s.label}</span>` +
      `<span class="src-desc">${s.desc}</span>`;
    ul.appendChild(li);
  });
}

function renderContextPack() {
  const block = document.getElementById('context-pack-block');
  if (currentGeneration !== 'gen3') {
    block.style.display = 'none';
    return;
  }
  block.style.display = '';

  // 选一个示意 NPC（优先用上一次对话的）
  const npcId = dialogueState?.currentNpcId || 'hostess';
  const npc = npcs.find(n => n.id === npcId) || npcs[0];

  const pack = {
    npc: npc.name,
    npc_skill_chars: extractSkillChars(SKILLS[npc.id] || ''),
    player: {
      hp_pct: pct() + '%',
      inventory: player.inventory.length ? [...player.inventory] : '(空)',
      tags: player.behaviorTags.length ? [...player.behaviorTags] : '(无)',
      visit_count: player.visitCount,
    },
    memory: memory.entries.length
      ? memory.entries.map(m => m.detail)
      : '(空)',
    memory_summary: memory.summary || null,
    world: {
      weather: worldState.weather,
      time: worldState.timeOfDay,
      blood_moon: worldState.bloodMoonCountdown === 0
        ? '正在血月'
        : `${worldState.bloodMoonCountdown}天后`,
      cave_status: worldState.caveStatus,
    },
    external_lore: externalLorePackPreview(),
    constraints: ['必须符合 SKILL 性格', '不剧透主线', '不直接发放奖励'],
  };
  document.getElementById('context-pack').textContent = JSON.stringify(pack, null, 2);
}

function externalLorePackPreview() {
  const lore = window.backendStorage?.semiStructured?.externalLore;
  if (!lore?.indexed) {
    return {
      status: 'not_indexed',
      root: lore?.rootDir || null,
    };
  }
  return {
    status: 'indexed',
    root: lore.rootDir,
    sources: lore.sourceCount,
    chunks: lore.chunkCount,
    categories: lore.categories.slice(0, 8).map((item) => `${item.category}:${item.count}`),
    current_query: (window.lastLoreContext || vectorRecallCache)?.query || getLoreSearchQueryForCurrentNpc(),
    recalled_chunks: ((window.lastLoreContext || vectorRecallCache)?.results || []).slice(0, 5).map((hit, index) => ({
      rank: index + 1,
      title: hit.title,
      category: hit.category,
      source: hit.sourcePath,
      score: hit.score,
      prompt_preview: hit.safePreview,
    })),
    runtime: 'gen3 按当前 NPC/玩家状态调用 /api/lore/search，只把 TopK chunk 装进 prompt',
  };
}

function renderWriteBack() {
  const el = document.getElementById('dataflow-writeback');
  if (!el) return;
  if (!lastWriteBack) {
    el.innerHTML = '<span class="muted">（还没有交互）</span>';
    return;
  }
  const items = lastWriteBack.changes.map(c =>
    `<li><code class="wb-key">${escapeHtml(c.label)}</code> ${escapeHtml(String(c.value))}</li>`
  ).join('');
  el.innerHTML =
    `<div class="wb-label">↪ ${escapeHtml(lastWriteBack.label)}</div>` +
    `<ul class="wb-list">${items}</ul>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderDataflowPanel();
});
