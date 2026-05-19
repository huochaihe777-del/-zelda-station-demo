// 结构化层 对话引擎：固定对话查表
// 数据存了但运行时不读 —— 无论玩家状态如何，永远返回同一句

const GEN1_DIALOGUES = {
  hostess: {
    text: '旅行者你好！要不要来碗暖汤？',
    actions: [
      { label: '好的，谢谢', effect: 'accept_soup' },
      { label: '不用了',     effect: 'leave' },
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
  bard: {
    text: '旅人啊，愿风指引你的路。',
    actions: [
      { label: '谢谢',   effect: 'leave' },
      { label: '（离开）', effect: 'leave' },
    ],
  },
};

async function gen1Talk(npcId) {
  const backendResult = typeof backendGen1Talk === 'function'
    ? await backendGen1Talk(npcId)
    : null;
  if (backendResult) return backendResult;

  const d = GEN1_DIALOGUES[npcId];

  const debugContent =
`SQL 查询：
SELECT text, options FROM dialogue_nodes
WHERE npc_id = '${npcId}' LIMIT 1;

结果：
"${d.text}"

⚠️ 无论玩家血量 ${player.hp}%、背包 ${JSON.stringify(player.inventory)}、行为 ${JSON.stringify(player.behaviorTags)}
   —— 永远返回同一句话。

如果要覆盖 3 种天气 × 4 种时段 × 5 种好感度 × 有无偷窃 = 120 种组合，
需要预写 120 × 4 个 NPC = 480 条对话记录。`;

  return {
    dialogue: d.text,
    actions: d.actions,
    debugInfo: {
      generation: 'gen1',
      title: '结构化：固定对话查表',
      content: debugContent,
    },
  };
}
