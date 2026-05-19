// 玩家记忆系统 + 行动效果处理

const memory = {
  entries: [],   // { timestamp, event, npcId, detail }
  summary: '',
};

function addMemory(event, npcId, detail) {
  if (!detail) return;
  memory.entries.push({
    timestamp: Date.now(),
    event,
    npcId,
    detail,
  });
  if (typeof recordBackendMemory === 'function') {
    recordBackendMemory({
      timestamp: Date.now(),
      event,
      npcId,
      detail,
    });
  }
  renderMemoryPanel();

  // 超过 10 条时调用 API 归纳；失败不影响主流程
  if (memory.entries.length > 10) {
    summarizeMemory();
  }
}

async function summarizeMemory() {
  const cfg = window.LLM_CONFIG || {};
  if (!cfg.apiKey) return;
  try {
    const response = await fetch(cfg.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `将以下玩家交互记录归纳为2-3句话摘要，保留关键事件和情感倾向，用第三人称描述：\n\n${memory.entries.map(m => `- ${m.detail}`).join('\n')}\n\n只返回摘要文本。`,
        }],
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    memory.summary = (data.choices?.[0]?.message?.content || '').trim();
    memory.entries = memory.entries.slice(-5);
    renderMemoryPanel();
  } catch (err) {
    console.warn('记忆归纳失败:', err);
  }
}

// 把侧栏的记忆面板同步成最新
function renderMemoryPanel() {
  const list = document.getElementById('memory-list');
  const count = document.getElementById('memory-count');
  const summaryEl = document.getElementById('memory-summary');
  if (!list) return;

  count.textContent = `(${memory.entries.length}${memory.summary ? ' + 摘要' : ''})`;

  if (memory.entries.length === 0 && !memory.summary) {
    list.innerHTML = '还没有记录…';
  } else {
    list.innerHTML = memory.entries
      .map(m => `<div class="memory-entry">· ${escapeHtml(m.detail)}</div>`)
      .join('');
  }

  summaryEl.textContent = memory.summary ? `💭 ${memory.summary}` : '';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 行动按钮点击后的效果
function handleActionEffect(effect, npcId) {
  const wb = []; // 本轮写回明细
  let wbLabel = `选择 "${effect}"`;

  switch (effect) {
    case 'accept_quest_cave':
    case 'accept_quest':
      addMemory('quest_accept', npcId || 'hostess', '接受了惠子的请求，答应带着猫头鹰密信去调查东边山洞');
      worldState.caveStatus = 'quest_accepted';
      updateWorldHud();
      wbLabel = '接受任务：禁林来信';
      wb.push({ label: 'worldState.caveStatus =', value: '"quest_accepted"' });
      wb.push({ label: 'memory.entries +=', value: '"接受了惠子的请求，答应带着猫头鹰密信去调查东边山洞"' });
      break;

    case 'grant_cave_permit':
      worldState.caveStatus = 'cave_unlocked';
      addMemory('quest_permit', npcId || 'soldier', '大壮检查密信和任务状态后放行，允许前往东边山洞');
      updateWorldHud();
      wbLabel = '获得山洞通行许可';
      wb.push({ label: 'worldState.caveStatus =', value: '"cave_unlocked"' });
      wb.push({ label: 'memory.entries +=', value: '"大壮检查密信和任务状态后放行"' });
      break;

    case 'give_ore':
      if (player.inventory.includes('矿石')) {
        player.inventory = player.inventory.filter(i => i !== '矿石');
        const newHelp = !player.behaviorTags.includes('helpful');
        if (newHelp) player.behaviorTags.push('helpful');
        addMemory('give', npcId || 'hostess', '把矿石交给了惠子');
        wbLabel = '把矿石交给惠子';
        wb.push({ label: 'player.inventory -=', value: '"矿石"' });
        if (newHelp) wb.push({ label: 'player.behaviorTags +=', value: '"helpful"' });
        wb.push({ label: 'memory.entries +=', value: '"把矿石交给了惠子"' });
      } else {
        addMemory('dialogue', npcId, '想交出矿石，但身上没有');
        wb.push({ label: 'memory.entries +=', value: '"想交出矿石，但身上没有"' });
      }
      break;

    case 'return_soup':
      if (player.inventory.includes('暖暖汤')) {
        player.inventory = player.inventory.filter(i => i !== '暖暖汤');
        const hadThief = player.behaviorTags.includes('thief');
        player.behaviorTags = player.behaviorTags.filter(t => t !== 'thief');
        const soup = items.find(i => i.id === 'soup');
        if (soup) soup.visible = true;
        addMemory('give', npcId || 'hostess', '归还了偷来的暖暖汤');
        wbLabel = '归还暖暖汤';
        wb.push({ label: 'player.inventory -=', value: '"暖暖汤"' });
        if (hadThief) wb.push({ label: 'player.behaviorTags -=', value: '"thief"' });
        wb.push({ label: 'items.soup.visible =', value: 'true' });
        wb.push({ label: 'memory.entries +=', value: '"归还了偷来的暖暖汤"' });
      } else {
        addMemory('dialogue', npcId, '想归还暖暖汤，但身上没有');
        wb.push({ label: 'memory.entries +=', value: '"想归还暖暖汤，但身上没有"' });
      }
      break;

    case 'accept_soup':
      addMemory('dialogue', npcId, '在惠子那里喝了一碗暖暖汤');
      wb.push({ label: 'memory.entries +=', value: '"在惠子那里喝了一碗暖暖汤"' });
      break;

    case 'rest':
      player.hp = player.maxHp;
      addMemory('dialogue', npcId, '在驿站休息了一会儿，恢复了体力');
      wbLabel = '在驿站休息';
      wb.push({ label: 'player.hp =', value: `${player.maxHp}` });
      wb.push({ label: 'memory.entries +=', value: '"在驿站休息了一会儿，恢复了体力"' });
      break;

    case 'leave':
    case 'browse':
    case 'chat':
    case 'listen_intel':
    case 'enter':
    case 'stay':
    case 'deny':
    case 'question':
      addMemory('dialogue', npcId, `和 ${npcDisplay(npcId)} 进行了一次对话`);
      wb.push({ label: 'memory.entries +=', value: `"和 ${npcDisplay(npcId)} 进行了一次对话"` });
      break;

    default:
      addMemory('dialogue', npcId, `和 ${npcDisplay(npcId)} 互动："${effect}"`);
      wb.push({ label: 'memory.entries +=', value: `"和 ${npcDisplay(npcId)} 互动：${effect}"` });
      break;
  }

  updatePlayerHud();
  if (typeof syncBackendState === 'function') syncBackendState(`action:${effect}`);
  if (typeof logWriteBack === 'function') logWriteBack(wbLabel, wb);
}

function npcDisplay(npcId) {
  if (!npcId) return 'NPC';
  const n = npcs.find(x => x.id === npcId);
  return n ? n.name : npcId;
}
