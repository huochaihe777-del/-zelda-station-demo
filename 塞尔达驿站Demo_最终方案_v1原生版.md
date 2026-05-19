# 塞尔达驿站Demo —— 完整技术方案（v1：原生HTML版）

> 如果v1效果满意就用这版；不满意再升级到React + Vite + TS + Phaser。

---

## 一、产品定义

### 一句话

一个像素风2D俯视角小游戏。林克在驿站场景中自由行走，与3个NPC交互。顶部三个Tab切换"第一代/第二代/第三代"对话模式，同一场景同一状态下体验三种完全不同的NPC对话方式。第三代由Anthropic API实时生成。

### 技术栈

纯HTML + Canvas + 原生JavaScript。零依赖，零构建步骤，浏览器打开index.html就能跑。第一代和第二代纯本地运行不需要API，第三代接Anthropic API。

### 文件结构

```
zelda-station-demo/
├── index.html          # 入口，引入所有JS和CSS
├── style.css           # 布局和UI样式
├── js/
│   ├── config.js       # 地图数据、NPC定义、物品定义、颜色常量
│   ├── skills.js       # 3个NPC的SKILL声明（字符串常量）
│   ├── gen1.js         # 第一代对话引擎：固定对话查表
│   ├── gen2.js         # 第二代对话引擎：条件模板匹配
│   ├── gen3.js         # 第三代对话引擎：Anthropic API调用
│   ├── memory.js       # 记忆系统：写入、查询、归纳
│   ├── game.js         # 游戏主循环：渲染、输入、碰撞、交互
│   ├── dialogue.js     # 对话框UI：显示文本、行动按钮、打字机效果
│   ├── debug.js        # 调试面板：展示每代的数据结构和API调用
│   └── controls.js     # 演示控件：天气/时段/血月/重置/受伤
└── README.md           # 运行说明
```

---

## 二、游戏设计

### 2.1 地图

```
画布：640×480px，20列×15行，每tile 32×32px

┌──────────────────────────────────────┐
│  🌳 🌳 🌿 🌿 🌿 🌿 🌿 🌿 🌳 🌳      │ 行0-1：外围草地和树
│  🌿 🌿 ┌──────────────┐ 🌿 🌿        │
│  🌿 🌿 │ 驿站内部       │ 🌿 🌿        │ 行2-9：驿站建筑
│  🌿 🌿 │               │ 🌿 🌿        │
│  🌿 🌿 │ [老板娘] [柜台] │ 🌿 🌿        │ 柜台上有暖暖汤
│  🌿 🌿 │               │ 🌿 🌿        │
│  🌿 🌿 │ [商人]  [桌椅]  │ 🌿 🌿        │
│  🌿 🌿 │               │ 🌿 🌿        │
│  🌿 🌿 │ [士兵]  [火炉]  │ 🌿 🌿        │
│  🌿 🌿 └───[门]────────┘ 🌿 🌿        │ 行10：门口
│  🌿 🌿 🌿 🟫 [矿石] 🟫 🌿 🌿 🌿       │ 行11：门外路+矿石
│  🌿 🌿 🌿 🟫 🟫 🟫 🌿 🌿 🌿 🌿        │ 行12-14：路和草地
└──────────────────────────────────────┘
```

### 2.2 Tile类型和颜色

```javascript
const TILES = {
  GRASS: { color: '#7CB342', walkable: true },
  FLOOR: { color: '#D7CCC8', walkable: true },
  WALL:  { color: '#795548', walkable: false },
  ROAD:  { color: '#BCAAA4', walkable: true },
  DOOR:  { color: '#FFC107', walkable: true },
  TREE:  { color: '#33691E', walkable: false },
  TABLE: { color: '#8D6E63', walkable: false },
  FIRE:  { color: '#FF7043', walkable: false },
  COUNTER: { color: '#A1887F', walkable: false },
};
```

### 2.3 精灵（纯色块+emoji，不依赖图片）

```javascript
const SPRITES = {
  player:   { color: '#4CAF50', emoji: '🧝', label: '林克' },
  hostess:  { color: '#FF9800', emoji: '👩', label: '惠子' },
  merchant: { color: '#9C27B0', emoji: '🧔', label: '阿福' },
  soldier:  { color: '#2196F3', emoji: '💂', label: '大壮' },
  ore:      { color: '#9E9E9E', emoji: '🪨', label: '矿石' },
  soup:     { color: '#FF5722', emoji: '🍲', label: '暖暖汤' },
};
```

### 2.4 操作

| 按键 | 功能 |
|------|------|
| 方向键 / WASD | 移动（带碰撞检测，不能穿墙/NPC/家具） |
| 空格 | 与面前的NPC或物品交互（需面朝目标且相邻） |
| E | 打开/关闭背包面板 |
| R | 重置游戏 |

---

## 三、状态设计

### 3.1 玩家状态

```javascript
const player = {
  x: 10,               // tile坐标
  y: 12,               // 初始位置：门外路上
  facing: 'up',        // 面朝方向：up/down/left/right
  hp: 100,
  maxHp: 100,
  inventory: [],       // ['矿石', '暖暖汤', ...]
  behaviorTags: [],    // ['helpful', 'thief', ...]
  visitCount: 0,       // 进入驿站的次数
};
```

### 3.2 记忆状态

```javascript
const memory = {
  entries: [],
  // 每条: { timestamp, event, npcId?, detail }
  // event类型: 'dialogue', 'steal', 'pickup', 'give', 'quest_accept'
  
  summary: '',
  // 归纳摘要，当entries超过10条时调用API归纳
};
```

### 3.3 世界状态

```javascript
const worldState = {
  weather: 'clear',           // 'clear' | 'rain' | 'storm'
  timeOfDay: 'evening',       // 'morning' | 'afternoon' | 'evening' | 'night'
  bloodMoonCountdown: 2,      // 距血月天数，0=正在血月
  caveStatus: 'unexplored',   // 'unexplored' | 'quest_accepted' | 'explored'
  recentEvents: [
    '有旅行者报告东边山洞有异响',
    '平原上最近出现了一只白鬃莱尼尔',
  ],
};
```

### 3.4 当前模式

```javascript
let currentGeneration = 'gen3'; // 'gen1' | 'gen2' | 'gen3'
```

---

## 四、NPC定义

```javascript
const npcs = [
  {
    id: 'hostess',
    name: '驿站老板娘·惠子',
    x: 6, y: 4,
    sprite: SPRITES.hostess,
  },
  {
    id: 'merchant',
    name: '旅行商人·阿福',
    x: 6, y: 6,
    sprite: SPRITES.merchant,
  },
  {
    id: 'soldier',
    name: '驻扎士兵·大壮',
    x: 6, y: 8,
    sprite: SPRITES.soldier,
  },
];
```

---

## 五、可交互物品

```javascript
const items = [
  {
    id: 'soup',
    name: '暖暖汤',
    x: 8, y: 4,          // 柜台上
    sprite: SPRITES.soup,
    type: 'stealable',
    visible: true,         // 被拿走后设为false
    onInteract: () => {
      player.inventory.push('暖暖汤');
      player.behaviorTags.push('thief');
      addMemory('steal', null, '偷取了老板娘柜台上的暖暖汤');
      items.find(i => i.id === 'soup').visible = false;
    },
  },
  {
    id: 'ore',
    name: '矿石',
    x: 10, y: 11,         // 门外地上
    sprite: SPRITES.ore,
    type: 'pickable',
    visible: true,
    onInteract: () => {
      player.inventory.push('矿石');
      addMemory('pickup', null, '在驿站门口捡到了一块矿石');
      items.find(i => i.id === 'ore').visible = false;
    },
  },
];
```

---

## 六、三代对话引擎

### 6.1 路由

```javascript
async function generateDialogue(npcId) {
  switch (currentGeneration) {
    case 'gen1': return gen1Talk(npcId);
    case 'gen2': return gen2Talk(npcId);
    case 'gen3': return await gen3Talk(npcId);
  }
}

// 所有引擎返回统一格式：
// {
//   dialogue: "NPC说的话",
//   actions: [ { label: "选项文字", effect: "效果标识" } ],
//   memoryNote: "写入记忆的摘要"（仅gen3）,
//   debugInfo: { ... }（调试面板用）
// }
```

### 6.2 第一代：固定对话

```javascript
// gen1.js

const GEN1_DIALOGUES = {
  hostess: {
    text: '旅行者你好！要不要来碗暖汤？',
    actions: [
      { label: '好的，谢谢', effect: 'accept_soup' },
      { label: '不用了', effect: 'leave' },
    ],
  },
  merchant: {
    text: '嘿，伙计！看看我的好货吧。',
    actions: [
      { label: '看看', effect: 'browse' },
      { label: '不了', effect: 'leave' },
    ],
  },
  soldier: {
    text: '注意安全。',
    actions: [
      { label: '好的', effect: 'leave' },
    ],
  },
};

function gen1Talk(npcId) {
  const d = GEN1_DIALOGUES[npcId];
  return {
    dialogue: d.text,
    actions: d.actions,
    debugInfo: {
      generation: 'gen1',
      title: '第一代：固定对话查表',
      content: `SQL查询：\nSELECT text, options FROM dialogue_nodes\nWHERE npc_id = '${npcId}' LIMIT 1;\n\n结果：\n"${d.text}"\n\n⚠️ 无论玩家血量${player.hp}%、背包${JSON.stringify(player.inventory)}、行为${JSON.stringify(player.behaviorTags)}——永远返回同一句话。\n\n如果要覆盖 3种天气 × 4种时段 × 5种好感度 × 有无偷窃 = 120种组合\n需要预写 120 × 3个NPC = 360条对话记录`,
    },
  };
}
```

### 6.3 第二代：条件模板

```javascript
// gen2.js

const GEN2_TEMPLATES = {
  hostess: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有"thief"标签',
      text: '你！我的暖暖汤是你拿的吧！赶紧还回来！',
      actions: [
        { label: '归还暖暖汤', effect: 'return_soup' },
        { label: '（装傻）', effect: 'deny' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
    {
      condition: { playerHpPct: [0, 0.3] },
      conditionDesc: '玩家血量 < 30%',
      text: '哎呀，你怎么伤成这样！快进来休息一下！',
      actions: [
        { label: '谢谢关心', effect: 'rest' },
        { label: '我没事', effect: 'leave' },
      ],
    },
    {
      condition: { weather: 'rain' },
      conditionDesc: '天气 = 雨天',
      text: '外面雨好大！快进来避避雨吧。',
      actions: [
        { label: '好的', effect: 'enter' },
        { label: '我赶路', effect: 'leave' },
      ],
    },
    {
      condition: { minVisitCount: 3 },
      conditionDesc: '来访次数 >= 3',
      text: '又来啦？老朋友！今天想吃点什么？',
      actions: [
        { label: '来碗暖汤', effect: 'accept_soup' },
        { label: '随便聊聊', effect: 'chat' },
      ],
    },
    {
      condition: { timeOfDay: 'night' },
      conditionDesc: '时段 = 夜晚',
      text: '这么晚了还在外面跑？快进来歇歇吧。',
      actions: [
        { label: '好的', effect: 'rest' },
        { label: '我还有事', effect: 'leave' },
      ],
    },
    {
      condition: {},
      conditionDesc: '默认（所有条件均未命中）',
      text: '旅行者你好！要不要来碗暖汤？',
      actions: [
        { label: '好的，谢谢', effect: 'accept_soup' },
        { label: '不用了', effect: 'leave' },
      ],
    },
  ],
  merchant: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有"thief"标签',
      text: '嘿……我听说老板娘丢了东西。你最好小心点，别让士兵注意到你。',
      actions: [
        { label: '你什么意思？', effect: 'question' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
    {
      condition: { hasBehaviorTag: 'helpful' },
      conditionDesc: '玩家有"helpful"标签',
      text: '嘿伙计！老板娘刚才夸你来着，说你是个好人。我这有个独家情报，要不要听听？',
      actions: [
        { label: '说来听听', effect: 'listen_intel' },
        { label: '不了', effect: 'leave' },
      ],
    },
    {
      condition: {},
      conditionDesc: '默认',
      text: '嘿，伙计！路过的吧？看看我的好货，绝对全平原最低价。',
      actions: [
        { label: '看看', effect: 'browse' },
        { label: '不了', effect: 'leave' },
      ],
    },
  ],
  soldier: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有"thief"标签',
      text: '你。我在盯着你。别在驿站搞事。',
      actions: [
        { label: '（低头走开）', effect: 'leave' },
      ],
    },
    {
      condition: { bloodMoonCountdown: 0 },
      conditionDesc: '血月倒计时 = 0',
      text: '血月之夜。所有人留在室内。这不是建议，是命令。',
      actions: [
        { label: '明白', effect: 'stay' },
      ],
    },
    {
      condition: {},
      conditionDesc: '默认',
      text: '注意安全。',
      actions: [
        { label: '好的', effect: 'leave' },
      ],
    },
  ],
};

function gen2Talk(npcId) {
  const templates = GEN2_TEMPLATES[npcId];
  const skipped = [];

  for (const t of templates) {
    if (matchCondition(t.condition)) {
      return {
        dialogue: t.text,
        actions: t.actions,
        debugInfo: {
          generation: 'gen2',
          title: '第二代：条件模板匹配',
          content: `匹配过程（从上到下，命中第一个即停止）：\n${skipped.map(s => `  ✗ ${s}`).join('\n')}${skipped.length ? '\n' : ''}  ✓ ${t.conditionDesc} → 命中\n\n返回模板：\n"${t.text}"\n\n⚠️ 当前同时满足的条件可能有多个，但只命中第一个：\n${getActiveConditions(npcId).join('\n')}\n⚠️ personality字段（"热情、健谈"）存在数据中但未影响输出`,
        },
      };
    }
    skipped.push(t.conditionDesc);
  }
}

function matchCondition(cond) {
  if (Object.keys(cond).length === 0) return false; // 空=default，不主动命中
  if (cond.hasBehaviorTag && !player.behaviorTags.includes(cond.hasBehaviorTag)) return false;
  if (cond.playerHpPct) {
    const pct = player.hp / player.maxHp;
    if (pct < cond.playerHpPct[0] || pct > cond.playerHpPct[1]) return false;
  }
  if (cond.weather && worldState.weather !== cond.weather) return false;
  if (cond.minVisitCount && player.visitCount < cond.minVisitCount) return false;
  if (cond.timeOfDay && worldState.timeOfDay !== cond.timeOfDay) return false;
  if (cond.bloodMoonCountdown !== undefined && worldState.bloodMoonCountdown !== cond.bloodMoonCountdown) return false;
  return true;
}

// 辅助：列出当前实际满足的所有条件（用于debugInfo展示"丢失"的条件）
function getActiveConditions(npcId) {
  const results = [];
  const pct = player.hp / player.maxHp;
  if (player.behaviorTags.includes('thief')) results.push('  • 玩家是小偷 → 有对应模板');
  if (player.behaviorTags.includes('helpful')) results.push('  • 玩家乐于助人 → 有对应模板');
  if (pct < 0.3) results.push('  • 血量低于30% → 有对应模板');
  if (worldState.weather === 'rain') results.push('  • 正在下雨 → 有对应模板');
  if (worldState.timeOfDay === 'night') results.push('  • 夜晚时段 → 有对应模板');
  if (results.length > 1) results.push('  → 但只能命中1个，其余被丢弃！第三代可以全部融合。');
  return results;
}
```

### 6.4 第三代：Anthropic API

```javascript
// gen3.js

async function gen3Talk(npcId) {
  const npc = npcs.find(n => n.id === npcId);
  const skill = SKILLS[npcId];
  const systemPrompt = buildSystemPrompt(skill);
  const userMessage = buildUserMessage(npcId);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await response.json();
    const raw = data.content[0].text;
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(clean);

    return {
      dialogue: result.dialogue,
      actions: result.actions || [{ label: '（离开）', effect: 'leave' }],
      memoryNote: result.memory_note,
      debugInfo: {
        generation: 'gen3',
        title: '第三代：SKILL + Agent实时生成',
        content: `【System Prompt】\n${systemPrompt}\n\n──────────\n\n【User Message】\n${userMessage}\n\n──────────\n\n【API返回】\n${JSON.stringify(result, null, 2)}`,
      },
    };
  } catch (err) {
    return {
      dialogue: '[API调用失败，请检查网络或API配置]\n\n可切换到第一代或第二代模式查看本地对话效果。',
      actions: [{ label: '好的', effect: 'leave' }],
      debugInfo: {
        generation: 'gen3',
        title: '第三代：API调用失败',
        content: `错误：${err.message}\n\nSystem Prompt和User Message已构建完成（见下），但API未返回：\n\n${buildSystemPrompt(skill)}\n\n${buildUserMessage(npcId)}`,
      },
    };
  }
}

function buildSystemPrompt(skill) {
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
- effect用snake_case，如 accept_quest, decline, give_item
- 至少包含一个"离开"选项: {"label": "（离开）", "effect": "leave"}
- 如果NPC有理由提供任务，加入任务相关选项

## NPC的SKILL声明
${skill}

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
- 如果多个条件同时存在（如：下雨+受伤+偷过东西+帮过忙），要自然融合表达，而不是只提一个`;
}

function buildUserMessage(npcId) {
  const memoryText = memory.entries.length > 0
    ? memory.entries.map(m => `- ${m.detail}`).join('\n')
    : '- 这是玩家第一次来到这个驿站';

  return `## 当前交互的NPC
${npcs.find(n => n.id === npcId).name}

## 玩家当前状态
- 血量：${player.hp}/${player.maxHp}（${Math.round(player.hp/player.maxHp*100)}%）
- 背包：${player.inventory.length > 0 ? player.inventory.join('、') : '空'}
- 行为标签：${player.behaviorTags.length > 0 ? player.behaviorTags.join('、') : '无特殊行为'}
- 来驿站次数：${player.visitCount}

## 玩家交互记忆
${memoryText}

${memory.summary ? `## 记忆归纳\n${memory.summary}` : ''}

请生成这个NPC此刻会对玩家说的话。`;
}
```

---

## 七、NPC的SKILL声明

```javascript
// skills.js

const SKILLS = {

hostess: `## NPC：驿站老板娘（惠子）

### 性格
- 热情健谈，像邻居大姐
- 关心每个旅行者，看到受伤的人会紧张
- 消息灵通，喜欢分享从其他旅行者那里听来的八卦
- 有点迷信，血月将近时会焦虑
- 嘴硬心软——即使生气了，过一会儿还是会关心你

### 说话风格
- 亲切啰嗦，用"哎呀""我跟你说""你可别……"等口头禅
- 会用比喻和夸张表达（"伤成这样是去跟莱尼尔打架了吧！"）
- 不说敬语，像跟熟人聊天

### 知识范围
- 熟悉平原地区的地理和怪物传闻
- 从旅行者口中听说东边山洞有异响
- 知道血月会让怪物变强
- 不了解主线剧情秘密

### 对待玩家的态度规则
- 初次见面：热情但正常
- 多次来访（3次+）/ 帮过忙：更亲近，像老朋友
- 玩家受伤（HP低）：紧张关心，催促休息
- 玩家偷过东西：愤怒质问，但如果玩家曾经帮过她，会有"失望"的复杂情绪
- 玩家归还偷的东西：原谅但仍有芥蒂
- 深夜+下雨：担心玩家安全

### 支线任务方向
- 日常：帮忙收集食材、修缮驿站
- 情报：听说东边山洞有异响，请林克帮忙去看看
- 应急：血月将至，帮忙准备防御物资
- 任务应从对话中自然产生，不要硬塞`,

merchant: `## NPC：旅行商人（阿福）

### 性格
- 精明世故，见多识广
- 说话喜欢绕弯子，但关键信息会给
- 重利但讲信用——骗过他的人他永远记得
- 胆小，不愿自己冒险，但愿意"投资"冒险者

### 说话风格
- 商人腔调："嘿伙计""我这儿有个好消息""这可是独家情报"
- 喜欢讨价还价的语气，即使不是在做生意
- 偶尔吹嘘自己走南闯北的经历

### 知识范围
- 各地物价和稀有物品行情
- 听说过白鬃莱尼尔的传闻（加了水分）
- 知道一些山洞里可能有什么（不确定但爱说）
- 会评价其他NPC（"老板娘的汤确实不错""那个士兵太严肃了"）

### 关键机制：NPC间信息流通
- 如果玩家偷了老板娘的东西 → 商人会提到"老板娘刚才气得不轻"
- 如果玩家帮了老板娘 → 商人会提到"老板娘刚才夸你来着"
- 这体现了NPC之间的信息是通的——第一代和第二代做不到

### 对待玩家的态度规则
- 初次见面：热情推销，试探实力
- 玩家有好名声（helpful标签）：主动透露更多情报
- 玩家有坏名声（thief标签）：警惕，话变少，不分享情报
- 血月时：比平时胆小，问玩家"你能保护驿站吗"`,

soldier: `## NPC：驻扎士兵（大壮）

### 性格
- 沉稳寡言，职责感强
- 不擅长社交，说话简短直接
- 对违规行为零容忍，但不会滥用武力
- 私下其实很关心驿站的人，但不太会表达

### 说话风格
- 短句为主，一般不超过3句话
- 不用语气词，不闲聊
- 军事化用语："注意""保持警惕""报告情况"
- 偶尔冒出一句笨拙的关心（很少，仅在特殊情况）

### 知识范围
- 平原地区的安全形势和怪物动向
- 对东边山洞有更专业的评估（比老板娘更准确但更冷淡）
- 血月期间的防御部署
- 不参与八卦

### 对待玩家的态度规则
- 初次见面：简短盘问
- 玩家帮过驿站：点头认可，话稍微多一点
- 玩家偷窃：严厉警告
- 玩家多次偷窃：威胁驱逐
- 血月将近/正在血月：罕见地主动说话，提供战术建议
- 玩家受伤严重：笨拙地关心（"……去找老板娘看看伤。别逞强。"）`,

};
```

---

## 八、记忆系统

```javascript
// memory.js

function addMemory(event, npcId, detail) {
  memory.entries.push({
    timestamp: Date.now(),
    event: event,
    npcId: npcId,
    detail: detail,
  });

  // 超过10条时归纳
  if (memory.entries.length > 10) {
    summarizeMemory();
  }
}

async function summarizeMemory() {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `将以下玩家交互记录归纳为2-3句话摘要，保留关键事件和情感倾向，用第三人称描述：\n\n${memory.entries.map(m => `- ${m.detail}`).join('\n')}\n\n只返回摘要文本。`,
        }],
      }),
    });
    const data = await response.json();
    memory.summary = data.content[0].text;
    // 保留最近5条，旧的归入摘要
    memory.entries = memory.entries.slice(-5);
  } catch (err) {
    // 归纳失败不影响游戏，只是摘要不更新
    console.warn('记忆归纳失败:', err);
  }
}

// 行动效果处理
function handleActionEffect(effect) {
  switch (effect) {
    case 'accept_quest_cave':
      addMemory('quest_accept', 'hostess', '接受了惠子的请求，答应去调查东边山洞');
      worldState.caveStatus = 'quest_accepted';
      break;
    case 'give_ore':
      if (player.inventory.includes('矿石')) {
        player.inventory = player.inventory.filter(i => i !== '矿石');
        if (!player.behaviorTags.includes('helpful')) player.behaviorTags.push('helpful');
        addMemory('give', 'hostess', '把矿石交给了惠子');
      }
      break;
    case 'return_soup':
      if (player.inventory.includes('暖暖汤')) {
        player.inventory = player.inventory.filter(i => i !== '暖暖汤');
        player.behaviorTags = player.behaviorTags.filter(t => t !== 'thief');
        addMemory('give', 'hostess', '归还了偷来的暖暖汤');
      }
      break;
    case 'leave':
      // 关闭对话框
      break;
    default:
      // 未知效果：记录为一般对话
      addMemory('dialogue', null, `选择了"${effect}"行动`);
      break;
  }
}
```

---

## 九、UI布局

```html
<!-- index.html 核心结构 -->

<div id="app">
  <!-- 三代切换Tab -->
  <div id="generation-tabs">
    <button data-gen="gen1" class="tab">第一代：固定对话</button>
    <button data-gen="gen2" class="tab">第二代：模板对话</button>
    <button data-gen="gen3" class="tab active">⭐ 第三代：Agent生成</button>
  </div>

  <!-- 游戏画布 -->
  <canvas id="game-canvas" width="640" height="480"></canvas>

  <!-- 对话框（覆盖在画布上） -->
  <div id="dialogue-box" class="hidden">
    <div id="dialogue-npc-name"></div>
    <div id="dialogue-text"></div>
    <div id="dialogue-actions"></div>
  </div>

  <!-- 状态栏 -->
  <div id="status-bar">
    <span id="hp-display">❤️ HP: 100/100</span>
    <span id="inventory-display">🎒 背包：空</span>
    <span id="tags-display">🏷️ 标签：无</span>
    <span id="visit-display">📍 来访：0次</span>
  </div>

  <!-- 演示控件 -->
  <div id="demo-controls">
    <button onclick="setWeather('clear')">☀️ 晴天</button>
    <button onclick="setWeather('rain')">🌧️ 雨天</button>
    <button onclick="setTimeOfDay('morning')">🌅 早晨</button>
    <button onclick="setTimeOfDay('night')">🌙 夜晚</button>
    <button onclick="triggerBloodMoon()">🔴 触发血月</button>
    <button onclick="simulateInjury()">💔 模拟受伤（HP→20%）</button>
    <button onclick="resetGame()">🔄 重置游戏</button>
  </div>

  <!-- 调试面板 -->
  <div id="debug-panel">
    <button onclick="toggleDebug()">📋 调试面板 ▼</button>
    <div id="debug-content" class="hidden">
      <h3 id="debug-title"></h3>
      <pre id="debug-text"></pre>
    </div>
  </div>
</div>
```

---

## 十、给Claude Code的构建指令

### 第1步：项目骨架 + 地图 + 移动

```
创建一个纯HTML + Canvas + 原生JS的2D俯视角小游戏。不用任何框架或构建工具，浏览器打开index.html直接运行。

项目结构：index.html + style.css + js/目录下多个js文件。

游戏画布640×480px，20×15 tile网格（每tile 32px）。

地图设计：
- 外围是草地（绿色#7CB342）和树（深绿#33691E，不可通行）
- 中间是一个驿站建筑：墙壁（棕色#795548，不可通行）围成的矩形房间
- 房间内是地板（米色#D7CCC8）
- 底部有一个门（黄色#FFC107，可通行）
- 门外是路（浅棕#BCAAA4）连接到下方
- 房间内有家具tile：柜台（浅棕#A1887F，不可通行）、桌椅（木色#8D6E63，不可通行）、火炉（橙红#FF7043，不可通行）

玩家是绿色(#4CAF50)方块+🧝emoji，初始在门外(10,12)。方向键或WASD移动，有碰撞检测，不能穿墙/家具/NPC/树。玩家移动时更新面朝方向。

3个NPC：
- 老板娘（橙色#FF9800 + 👩）位于(6,4)
- 商人（紫色#9C27B0 + 🧔）位于(6,6)
- 士兵（蓝色#2196F3 + 💂）位于(6,8)
NPC是不可通行的。

2个物品：
- 暖暖汤（红色#FF5722 + 🍲）位于(8,4)柜台旁
- 矿石（灰色#9E9E9E + 🪨）位于(10,11)门外

所有精灵用Canvas绘制：填充色块 + 上面居中绘制emoji文字。不需要任何外部图片。

画布下方显示状态栏：HP、背包、行为标签、来访次数。

按空格键时检测：玩家面朝方向的相邻tile是否有NPC或物品。如果有，触发交互：
- 物品：捡取（矿石）或偷取（暖暖汤），物品从地图消失，进入背包，更新状态栏
- 偷取暖暖汤时自动给玩家加"thief"行为标签
- NPC：暂时显示"对话中..."文字（后续步骤替换为真实对话）

玩家走过门(tile类型DOOR)时，visitCount +1。
```

### 第2步：三代切换Tab + 对话框UI

```
在游戏画布上方添加三个Tab按钮：
- [第一代：固定对话] [第二代：模板对话] [⭐第三代：Agent生成]
- 默认选中第三代
- 点击切换currentGeneration变量（'gen1' / 'gen2' / 'gen3'）
- 选中的Tab高亮，未选中的灰色

在画布底部添加对话框UI（半透明黑色背景，白色文字）：
- 顶部显示NPC名字（带颜色标识）
- 中间显示对话文本（支持\n换行）
- 底部显示行动按钮（可点击）
- 对话框默认隐藏，与NPC交互时显示
- 对话框打开时，玩家不能移动
- 点击行动按钮后关闭对话框，恢复移动
- 添加打字机效果：文字逐字显示，点击任意处跳过直接显示全部
```

### 第3步：三代对话引擎

```
实现三代对话引擎：

第一代（gen1.js）：
- 每个NPC一句固定对话，无论任何状态都返回同一句
- 老板娘："旅行者你好！要不要来碗暖汤？"
- 商人："嘿，伙计！看看我的好货吧。"
- 士兵："注意安全。"

第二代（gen2.js）：
- 每个NPC有多个条件模板，从上到下匹配第一个满足的条件
- 老板娘的条件优先级：thief标签 > HP低 > 下雨 > 来访3次+ > 夜晚 > 默认
- 商人的条件优先级：thief标签 > helpful标签 > 默认
- 士兵的条件优先级：thief标签 > 血月 > 默认
（使用本技术方案中提供的完整模板数据）

第三代（gen3.js）：
- 调用Anthropic API（claude-sonnet-4-20250514）
- System Prompt包含：NPC的SKILL声明 + 世界状态 + 输出格式要求
- User Message包含：玩家状态 + 记忆列表 + 记忆摘要
- API不传API key（由环境处理）
- 解析返回的JSON：dialogue + actions + memory_note
- API失败时显示降级提示
（使用本技术方案中提供的完整SKILL声明和prompt构建逻辑）

对话路由：根据currentGeneration调用对应引擎。

所有引擎返回统一格式：{ dialogue, actions, debugInfo }
```

### 第4步：记忆系统 + 行动效果

```
实现记忆系统：

1. memory对象包含entries数组和summary字符串
2. addMemory(event, npcId, detail)函数向entries追加记录
3. 以下操作触发记忆写入：
   - 偷取暖暖汤 → "偷取了老板娘柜台上的暖暖汤"
   - 捡取矿石 → "在驿站门口捡到了一块矿石"
   - 每次NPC对话后 → 写入API返回的memoryNote（第三代），或生成默认摘要（一二代）
4. 行动按钮的effect处理：
   - accept_quest_cave: 写入记忆 + caveStatus改为quest_accepted
   - give_ore: 从背包移除矿石 + 加helpful标签 + 写入记忆
   - return_soup: 从背包移除暖暖汤 + 移除thief标签 + 写入记忆
   - leave: 关闭对话框
   - 其他: 写入通用记忆
5. 记忆超过10条时调用Anthropic API归纳为2-3句摘要，保留最近5条详细记录
6. 记忆和标签会显示在调试面板中
```

### 第5步：调试面板

```
在演示控件下方添加可折叠的调试面板：

- 点击"📋 调试面板"按钮展开/折叠
- 展开后显示上一次NPC对话的调试信息：
  - 标题：当前是哪一代
  - 第一代：显示模拟的SQL查询和表结构，以及"无论状态如何返回同一条"的说明
  - 第二代：显示条件匹配过程（哪些条件被跳过、哪个被命中）、当前同时满足但被丢弃的条件
  - 第三代：显示完整的System Prompt、User Message、API返回的原始JSON
- 调试面板内容在每次对话后自动更新
- 用等宽字体（monospace）显示，便于阅读
- 面板最大高度400px，超出滚动
```

### 第6步：演示控件 + 重置

```
在状态栏下方添加演示辅助按钮：

- ☀️晴天 / 🌧️雨天：切换worldState.weather
- 🌅早晨 / 🌙夜晚：切换worldState.timeOfDay
- 🔴触发血月：将bloodMoonCountdown设为0
- 💔模拟受伤：将HP设为maxHp的20%
- 🔄重置游戏：
  - 清空背包、记忆、标签
  - HP恢复满
  - 物品重新出现
  - 世界状态恢复默认
  - visitCount归零
  - 玩家回到初始位置

每个按钮点击后更新状态栏显示。
天气和时段切换可以视觉反映在游戏画布上（可选）：
- 雨天：画布加半透明蓝色遮罩
- 夜晚：画布加半透明深蓝遮罩
- 血月：画布加半透明红色遮罩
```

---

## 十一、演示剧本

### 第一轮：好人路线

```
1. 游戏开始，默认第三代模式
2. 林克走进驿站（visitCount变为1）
3. 走到老板娘面前按空格 → Agent生成热情欢迎对话
4. 选择"听她说说" → 老板娘提到东边山洞
5. 走到门外捡矿石 → 背包多了矿石
6. 走回老板娘，再次对话 → Agent引用"你刚捡了矿石"，态度更亲近
7. 选择"把矿石给她" → helpful标签亮起
8. 走到商人对话 → 商人提到"老板娘刚才夸你呢"
9. 切到第一代 → 商人："嘿伙计看看好货" → 完全无感知
10. 切到第二代 → 商人命中helpful模板 → 但不会提及老板娘
11. 切回第三代 → 商人自然地引用老板娘的态度
12. 展开调试面板，让观众看到prompt里的记忆和返回值
```

### 第二轮：偷窃路线

```
1. 按重置
2. 林克走进驿站
3. 走到柜台偷暖暖汤 → thief标签亮起
4. 走到老板娘对话 → 三代切换对比：
   - 第一代："旅行者你好！" → 毫无反应
   - 第二代："你！暖暖汤是你拿的吧！" → 模板命中
   - 第三代：融合偷窃+初次见面+性格 → 更复杂的情感反应
5. 走到士兵 → 三代切换对比：
   - 第一代："注意安全。"
   - 第二代："你。别在驿站搞事。"
   - 第三代：更有威慑力的个性化警告
6. 再走到商人 → 第三代：商人提到"老板娘气得不轻"
```

### 核心话术

> "两轮演示，我没有改一行代码。
> 你们看调试面板——两轮的区别只在于玩家记忆和行为标签不同。
> NPC的SKILL声明一个字没变。
> 
> 第一代：数据存了但运行时不读。老板娘的性格写在personality字段里，对话树从来不碰它。
> 第二代：数据读了但只能命中一个条件。下雨+受伤+偷窃同时发生，只会触发第一个命中的模板。
> 第三代：所有信息融合理解。SKILL定义性格，记忆提供历史，世界状态提供上下文，Agent一次性综合生成。
> 
> 这就是第三代存储的意义——不是换了个数据库，是让数据从'存着'变成'活着'。"

