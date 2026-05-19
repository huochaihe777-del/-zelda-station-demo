// 对话框 UI：打字机效果 + 按钮渲染
// 也是三代对话路由入口：generateDialogue / openDialogue

const dialogueState = {
  open: false,
  typing: false,
  typeTimer: null,
  fullText: '',
  currentNpcId: null,
};

async function generateDialogue(npcId, opts = {}) {
  switch (currentGeneration) {
    case 'gen1': return gen1Talk(npcId);
    case 'gen2': return gen2Talk(npcId);
    case 'gen3': return await gen3Talk(npcId, opts);
  }
}

async function openDialogue(npcId) {
  if (dialogueState.open) return;
  const npc = npcs.find(n => n.id === npcId);
  if (!npc) return;

  dialogueState.open = true;
  dialogueState.currentNpcId = npcId;

  const box = document.getElementById('dialogue-box');
  const nameEl = document.getElementById('dialogue-npc-name');
  const textEl = document.getElementById('dialogue-text');
  const actionsEl = document.getElementById('dialogue-actions');
  const avatarEl = document.getElementById('dialogue-npc-avatar');

  nameEl.textContent = `${npc.sprite.emoji} ${npc.name}`;
  nameEl.style.color = npc.sprite.color;
  // CT 片范式：表里只存 avatar_url，浏览器实际从文件系统拉 SVG/PNG 渲染
  // 「📎 从 ... 加载」的元信息已移到右侧 dataflow 面板，避免污染游戏沉浸感
  if (avatarEl && npc.avatar_url) {
    avatarEl.src = npc.avatar_url;
    avatarEl.style.display = '';
  } else if (avatarEl) {
    avatarEl.style.display = 'none';
  }
  textEl.textContent = '思考中…';
  actionsEl.innerHTML = '';
  box.classList.remove('hidden');

  // gen3 走 SSE 流式：每收到一段就实时刷到对话框
  const isStream = currentGeneration === 'gen3';
  let streamStarted = false;
  const onDelta = (partial) => {
    if (!dialogueState.open) return;
    if (!streamStarted) { streamStarted = true; }
    textEl.textContent = partial;
  };

  let result;
  try {
    result = await generateDialogue(npcId, isStream ? { onDelta } : undefined);
  } catch (err) {
    result = {
      dialogue: `[对话生成异常] ${err.message}`,
      actions: [{ label: '好的', effect: 'leave' }],
      debugInfo: {
        generation: currentGeneration,
        title: '对话生成异常',
        content: String(err.stack || err.message),
      },
    };
  }

  // 调试面板更新
  updateDebugPanel(result.debugInfo);

  // 语义理解层 附带 memory_note 直接写记忆
  const noteToWrite = result.memoryNote || `和 ${npc.name} 进行了一次对话`;
  addMemory('dialogue', npcId, noteToWrite);
  if (typeof logWriteBack === 'function') {
    logWriteBack(
      currentGeneration === 'gen3' ? 'Agent 生成对话 → 写回记忆' : '对话完成 → 写回记忆',
      [
        { label: 'memory.entries +=', value: `"${noteToWrite}"` },
        ...(currentGeneration === 'gen3'
          ? [{ label: '↳ 由 LLM 返回的 memory_note', value: '（不是规则写死的）' }]
          : []),
      ]
    );
  }

  // 文本展示：gen3 流式已经把文本逐步刷上来了，确保收尾正确；gen1/2 用打字机
  if (isStream && streamStarted) {
    dialogueState.fullText = result.dialogue;
    textEl.textContent = result.dialogue;
    dialogueState.typing = false;
  } else {
    typeText(result.dialogue);
  }

  // 渲染按钮
  actionsEl.innerHTML = '';
  result.actions.forEach(a => {
    const btn = document.createElement('button');
    btn.textContent = a.label;
    btn.addEventListener('click', () => {
      handleActionEffect(a.effect, npcId);
      closeDialogue();
    });
    actionsEl.appendChild(btn);
  });
}

function typeText(fullText) {
  const textEl = document.getElementById('dialogue-text');
  dialogueState.fullText = fullText;
  textEl.textContent = '';
  dialogueState.typing = true;

  let i = 0;
  clearInterval(dialogueState.typeTimer);
  dialogueState.typeTimer = setInterval(() => {
    if (!dialogueState.open) {
      clearInterval(dialogueState.typeTimer);
      return;
    }
    textEl.textContent += fullText[i] || '';
    i++;
    if (i >= fullText.length) {
      clearInterval(dialogueState.typeTimer);
      dialogueState.typing = false;
    }
  }, 22);
}

function skipTyping() {
  if (!dialogueState.typing) return;
  clearInterval(dialogueState.typeTimer);
  document.getElementById('dialogue-text').textContent = dialogueState.fullText;
  dialogueState.typing = false;
}

function closeDialogue() {
  dialogueState.open = false;
  dialogueState.typing = false;
  clearInterval(dialogueState.typeTimer);
  document.getElementById('dialogue-box').classList.add('hidden');
  dialogueState.currentNpcId = null;
}

// 点对话框任意位置：在打字时跳过，打完后不响应（避免误关）
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('dialogue-box');
  box.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    if (dialogueState.typing) skipTyping();
  });
});
