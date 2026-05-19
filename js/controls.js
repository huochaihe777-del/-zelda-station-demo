// 演示控件 + Tab 切换 + HUD 更新

const TIME_LABEL = {
  morning: '🌅 早晨',
  afternoon: '🏞️ 下午',
  evening: '🌆 黄昏',
  night: '🌙 夜晚',
};

const WEATHER_LABEL = {
  clear: '☀️ 晴天',
  rain:  '🌧️ 雨天',
  storm: '⛈️ 暴风雨',
};

const CAVE_LABEL = {
  unexplored: '未探索',
  letter_received: '收到密信',
  quest_accepted: '已接任务',
  cave_unlocked: '准入放行',
  explored: '已探索',
};

function setWeather(w) {
  worldState.weather = w;
  updateWorldHud();
  if (typeof syncBackendState === 'function') syncBackendState(`weather:${w}`);
}

function syncRainLetterTrigger() {
  const letter = items.find(i => i.id === 'letter');
  if (!letter) return;
  const questAlreadyStarted =
    worldState.caveStatus !== 'unexplored' ||
    player.inventory.includes('猫头鹰密信');
  letter.visible = worldState.weather === 'rain' && !questAlreadyStarted;
}

function setTimeOfDay(t) {
  worldState.timeOfDay = t;
  updateWorldHud();
  if (typeof syncBackendState === 'function') syncBackendState(`time:${t}`);
}

function triggerBloodMoon() {
  worldState.bloodMoonCountdown = 0;
  updateWorldHud();
  if (typeof syncBackendState === 'function') syncBackendState('blood_moon');
}

function simulateInjury() {
  player.hp = Math.round(player.maxHp * 0.2);
  updatePlayerHud();
  if (typeof syncBackendState === 'function') syncBackendState('injury');
}

function resetGame() {
  resetWorld();
  updatePlayerHud();
  updateWorldHud();
  renderMemoryPanel();
  closeDialogue();
  clearWriteBack();
  renderDataflowPanel();
  updateDebugPanel({
    title: '等待第一次对话…',
    content: '游戏已重置。和 NPC 对话后这里会显示当前代背后的运行细节。',
  });
  if (typeof resetBackendState === 'function') resetBackendState();
}

// ----- 一键场景 -----
const SCENES = {
  good: () => {
    resetWorld();
    player.behaviorTags = ['helpful'];
    player.visitCount = 4;
    memory.entries = [
      '在驿站门口捡到了一块矿石',
      '把矿石交给了惠子',
    ].map(d => ({ timestamp: Date.now(), event: 'dialogue', npcId: null, detail: d }));
  },
  thief: () => {
    resetWorld();
    player.behaviorTags = ['thief'];
    player.inventory = ['暖暖汤'];
    const soup = items.find(i => i.id === 'soup'); if (soup) soup.visible = false;
    player.visitCount = 1;
    memory.entries = [
      { timestamp: Date.now(), event: 'steal', npcId: null, detail: '偷取了老板娘柜台上的暖暖汤' },
    ];
  },
  extreme: () => {
    resetWorld();
    player.behaviorTags = ['thief'];
    // 偷过汤、捡过矿石（两项已经完成）；密信仍在驿站门口等待玩家走过去捡，触发剧情
    player.inventory = ['暖暖汤', '矿石'];
    const soup = items.find(i => i.id === 'soup'); if (soup) soup.visible = false;
    const ore  = items.find(i => i.id === 'ore');  if (ore)  ore.visible = false;
    // 信封保持可见：演讲剧本是「极端复合状态下，玩家走过去捡密信触发禁林任务」
    const letter = items.find(i => i.id === 'letter'); if (letter) letter.visible = true;
    player.hp = 18;
    player.visitCount = 4;
    worldState.weather = 'rain';
    worldState.timeOfDay = 'night';
    worldState.bloodMoonCountdown = 1;
    // caveStatus 还没收到密信，触发时由 game.js 写回为 letter_received
    worldState.caveStatus = 'unexplored';
    worldState.recentEvents.push('猫头鹰正在驿站门口投递一封带魔法部封蜡的禁林来信');
    memory.entries = [
      '偷取了老板娘柜台上的暖暖汤',
      '在驿站门口捡到了一块矿石',
      '被士兵警告过一次',
    ].map(d => ({ timestamp: Date.now(), event: 'dialogue', npcId: null, detail: d }));
  },
  letter: () => {
    resetWorld();
    // 雨夜，密信刚到驿站门口；玩家身上没有，等他走过去捡触发剧情
    player.inventory = [];
    player.visitCount = 2;
    worldState.weather = 'rain';
    worldState.timeOfDay = 'night';
    worldState.caveStatus = 'unexplored';
    worldState.recentEvents.push('猫头鹰正在驿站门口投递一封带魔法部封蜡的禁林来信');
    const letter = items.find(i => i.id === 'letter'); if (letter) letter.visible = true;
    memory.entries = [];
  },
};

const SCENE_NAMES = { good: '好人路线', thief: '小偷路线', letter: '禁林来信', extreme: '极端复合' };
const MODE_KEYS = ['player', 'creator'];

function applyScene(key) {
  const fn = SCENES[key];
  if (!fn) return;
  closeDialogue();
  fn();
  updatePlayerHud();
  updateWorldHud();
  renderMemoryPanel();
  logWriteBack(`一键场景：${SCENE_NAMES[key]}`, [
    { label: 'player.behaviorTags =', value: JSON.stringify(player.behaviorTags) },
    { label: 'player.inventory =',    value: JSON.stringify(player.inventory) },
    { label: 'player.hp =',           value: `${player.hp}` },
    { label: 'worldState =',          value: `${worldState.weather} / ${worldState.timeOfDay} / 血月-${worldState.bloodMoonCountdown}` },
    { label: 'memory.entries =',      value: `${memory.entries.length} 条预置记忆` },
  ]);
  renderDataflowPanel();
  if (typeof syncBackendState === 'function') syncBackendState(`scene:${key}`);
}

function updatePlayerHud() {
  document.getElementById('hp-display').textContent =
    `❤️ HP ${player.hp}/${player.maxHp}`;
  document.getElementById('inventory-display').textContent =
    `🎒 ${player.inventory.length ? player.inventory.join('、') : '空'}`;
  document.getElementById('tags-display').textContent =
    `🏷️ ${player.behaviorTags.length ? player.behaviorTags.join('、') : '无'}`;
  document.getElementById('visit-display').textContent =
    `📍 ${player.visitCount} 次`;
  if (typeof renderDataflowPanel === 'function') renderDataflowPanel();
}

function updateWorldHud() {
  syncRainLetterTrigger();
  document.getElementById('weather-display').textContent =
    WEATHER_LABEL[worldState.weather] || worldState.weather;
  document.getElementById('time-display').textContent =
    TIME_LABEL[worldState.timeOfDay] || worldState.timeOfDay;
  document.getElementById('bloodmoon-display').textContent =
    worldState.bloodMoonCountdown === 0
      ? '🔴 血月之夜！'
      : `🌑 血月 ${worldState.bloodMoonCountdown} 天`;
  document.getElementById('cave-display').textContent =
    `⛰️ 山洞 ${CAVE_LABEL[worldState.caveStatus] || worldState.caveStatus}`;
  if (typeof renderDataflowPanel === 'function') renderDataflowPanel();
}

function syncTabActive() {
  document.querySelectorAll('#generation-tabs .tab').forEach(b => {
    b.classList.toggle('active', b.dataset.gen === currentGeneration);
  });
}

function syncModeTabs() {
  document.querySelectorAll('#mode-tabs .mode-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === currentMode);
  });
  document.body.dataset.mode = currentMode;
}

function setMode(m) {
  if (m === currentMode) {
    syncModeTabs();
    if (m === 'creator') {
      if (typeof renderProjectPanel === 'function') renderProjectPanel();
      if (typeof renderCreatorPanel === 'function') renderCreatorPanel();
    }
    return;
  }
  currentMode = m;
  if (MODE_KEYS.includes(m)) {
    history.replaceState(null, '', `#${m}`);
  }
  syncModeTabs();
  if (m === 'creator') {
    if (typeof renderProjectPanel === 'function') renderProjectPanel();
    if (typeof renderCreatorPanel === 'function') renderCreatorPanel();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hashMode = location.hash.replace(/^#/, '');
  if (MODE_KEYS.includes(hashMode)) currentMode = hashMode;

  // 模式切换
  document.querySelectorAll('#mode-tabs .mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
      btn.blur();
    });
  });
  syncModeTabs();
  if (currentMode === 'creator') {
    if (typeof renderProjectPanel === 'function') renderProjectPanel();
    if (typeof renderCreatorPanel === 'function') renderCreatorPanel();
  }

  window.addEventListener('hashchange', () => {
    const nextMode = location.hash.replace(/^#/, '');
    if (MODE_KEYS.includes(nextMode)) setMode(nextMode);
  });

  // Tab 切换：切代 + 同步数据流面板 + 焦点回画布
  document.querySelectorAll('#generation-tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGeneration = btn.dataset.gen;
      syncTabActive();
      renderDataflowPanel();
      if (currentMode === 'creator' && typeof renderCreatorPanel === 'function') {
        renderCreatorPanel();
      }
      btn.blur();
      document.getElementById('game-canvas').focus();
    });
  });

  // 演示控件按钮点完后也把焦点交回画布
  document.querySelectorAll('#demo-controls button').forEach(btn => {
    btn.addEventListener('click', () => btn.blur());
  });

  // 一键场景
  document.querySelectorAll('#demo-scenes .scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyScene(btn.dataset.scene);
      btn.blur();
      document.getElementById('game-canvas').focus();
    });
  });

  // 用 JS 强制同步初始 active，避免 HTML 写错或外部模拟点击
  syncTabActive();

  // 演示控件
  const map = {
    'weather-clear': () => setWeather('clear'),
    'weather-rain':  () => setWeather('rain'),
    'time-morning':  () => setTimeOfDay('morning'),
    'time-night':    () => setTimeOfDay('night'),
    'blood-moon':    () => triggerBloodMoon(),
    'injury':        () => simulateInjury(),
    'reset':         () => resetGame(),
  };
  document.querySelectorAll('#demo-controls button').forEach(btn => {
    const fn = map[btn.dataset.action];
    if (fn) btn.addEventListener('click', fn);
  });

  // 初始 HUD
  updatePlayerHud();
  updateWorldHud();
  renderMemoryPanel();
});
