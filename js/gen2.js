// 半结构化/文件 对话引擎：条件模板匹配
// 数据读了，但只能命中一个条件，多条件不能融合

const GEN2_TEMPLATES = {
  hostess: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有 "thief" 标签',
      text: '你！我的暖暖汤是你拿的吧！赶紧还回来！',
      actions: [
        { label: '归还暖暖汤', effect: 'return_soup' },
        { label: '（装傻）',   effect: 'deny' },
        { label: '（离开）',   effect: 'leave' },
      ],
    },
    {
      condition: { playerHpPct: [0, 0.3] },
      conditionDesc: '玩家血量 < 30%',
      text: '哎呀，你怎么伤成这样！快进来休息一下！',
      actions: [
        { label: '谢谢关心', effect: 'rest' },
        { label: '我没事',   effect: 'leave' },
      ],
    },
    {
      condition: { weather: 'rain' },
      conditionDesc: '天气 = 雨天',
      text: '外面雨好大！快进来避避雨吧。',
      actions: [
        { label: '好的',   effect: 'enter' },
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
        { label: '好的',     effect: 'rest' },
        { label: '我还有事', effect: 'leave' },
      ],
    },
    {
      condition: {},
      conditionDesc: '默认（所有条件均未命中）',
      text: '旅行者你好！要不要来碗暖汤？',
      actions: [
        { label: '好的，谢谢', effect: 'accept_soup' },
        { label: '不用了',     effect: 'leave' },
      ],
    },
  ],

  merchant: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有 "thief" 标签',
      text: '嘿……我听说老板娘丢了东西。你最好小心点，别让士兵注意到你。',
      actions: [
        { label: '你什么意思？', effect: 'question' },
        { label: '（离开）',     effect: 'leave' },
      ],
    },
    {
      condition: { hasBehaviorTag: 'helpful' },
      conditionDesc: '玩家有 "helpful" 标签',
      text: '嘿伙计！老板娘刚才夸你来着，说你是个好人。我这有个独家情报，要不要听听？',
      actions: [
        { label: '说来听听', effect: 'listen_intel' },
        { label: '不了',     effect: 'leave' },
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

  bard: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有 "thief" 标签',
      text: '一碗暖汤失了踪，炉火旁边起了风。',
      actions: [
        { label: '（笑笑）', effect: 'chat' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
    {
      condition: { hasBehaviorTag: 'helpful' },
      conditionDesc: '玩家有 "helpful" 标签',
      text: '有人守住血月夜，驿站灯火未曾灭。',
      actions: [
        { label: '过奖了',   effect: 'chat' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
    {
      condition: {},
      conditionDesc: '默认',
      text: '旅人啊，路过此地，可愿听我一段小调？',
      actions: [
        { label: '听一段',   effect: 'listen_intel' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
  ],

  soldier: [
    {
      condition: { hasBehaviorTag: 'thief' },
      conditionDesc: '玩家有 "thief" 标签',
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

function matchCondition(cond) {
  // 空对象 = 默认 fallback，永远命中
  if (Object.keys(cond).length === 0) return true;

  if (cond.hasBehaviorTag && !player.behaviorTags.includes(cond.hasBehaviorTag)) return false;
  if (cond.playerHpPct) {
    const pct = player.hp / player.maxHp;
    if (pct < cond.playerHpPct[0] || pct > cond.playerHpPct[1]) return false;
  }
  if (cond.weather && worldState.weather !== cond.weather) return false;
  if (cond.caveStatus && worldState.caveStatus !== cond.caveStatus) return false;
  if (cond.minVisitCount && player.visitCount < cond.minVisitCount) return false;
  if (cond.timeOfDay && worldState.timeOfDay !== cond.timeOfDay) return false;
  if (cond.bloodMoonCountdown !== undefined && worldState.bloodMoonCountdown !== cond.bloodMoonCountdown) return false;
  return true;
}

// 列出当前实际满足的所有条件（用于展示"被丢弃"的条件）
function getActiveConditions() {
  const results = [];
  const pct = player.hp / player.maxHp;
  if (player.behaviorTags.includes('thief'))    results.push('  • 玩家是小偷 → 有对应模板');
  if (player.behaviorTags.includes('helpful'))  results.push('  • 玩家乐于助人 → 有对应模板');
  if (pct < 0.3)                                results.push('  • 血量低于30% → 有对应模板');
  if (worldState.weather === 'rain')            results.push('  • 正在下雨 → 有对应模板');
  if (worldState.timeOfDay === 'night')         results.push('  • 夜晚时段 → 有对应模板');
  if (worldState.bloodMoonCountdown === 0)      results.push('  • 血月之夜 → 有对应模板');
  if (worldState.caveStatus === 'letter_received') results.push('  • 收到猫头鹰密信 → 有任务模板');
  if (worldState.caveStatus === 'quest_accepted')  results.push('  • 惠子已登记任务 → 有放行模板');
  if (player.visitCount >= 3)                   results.push('  • 来访 ≥ 3 次 → 有对应模板');
  if (results.length > 1) {
    results.push('  → 但只能命中 1 个，其余被丢弃！模型友好存储可以全部融合。');
  }
  return results;
}

async function gen2Talk(npcId) {
  const backendResult = typeof backendGen2Talk === 'function'
    ? await backendGen2Talk(npcId)
    : null;
  if (backendResult) return backendResult;

  const templates = GEN2_TEMPLATES[npcId];
  const skipped = [];

  for (const t of templates) {
    if (matchCondition(t.condition)) {
      const active = getActiveConditions();
      const debugContent =
`匹配过程（从上到下，命中第一个即停止）：
${skipped.map(s => `  ✗ ${s}`).join('\n')}${skipped.length ? '\n' : ''}  ✓ ${t.conditionDesc} → 命中

返回模板：
"${t.text}"

⚠️ 当前同时满足的条件：
${active.length ? active.join('\n') : '  （只有当前命中的这一个）'}
⚠️ personality 字段（"热情、健谈"）存在于数据中但未影响输出。`;

      return {
        dialogue: t.text,
        actions: t.actions,
        debugInfo: {
          generation: 'gen2',
          title: '+ 半结构化/文件：条件模板匹配',
          content: debugContent,
        },
      };
    }
    skipped.push(t.conditionDesc);
  }

  // 兜底（理论上空对象的 default 会先命中，不会到这里）
  return {
    dialogue: '（沉默）',
    actions: [{ label: '离开', effect: 'leave' }],
    debugInfo: {
      generation: 'gen2',
      title: '+ 半结构化/文件：未命中任何模板',
      content: '所有条件都未命中，且没有 default 模板。',
    },
  };
}
