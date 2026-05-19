// 真实后端桥接：SQLite 结构化层 + content/*.json 半结构化资产
// 如果页面不是从本地后端服务打开，会自动降级为纯前端演示。

const backendState = {
  available: false,
  health: null,
  storage: null,
  syncTimer: null,
  lastSyncReason: '',
};

async function backendFetch(path, options = {}) {
  if (location.protocol === 'file:') return null;
  // 同源（留空）或远端 Railway（config.public.js / config.local.js 里配 window.BACKEND_URL）
  const base = (typeof window !== 'undefined' && window.BACKEND_URL) || '';
  const url = base + path;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[backend disabled]', url, err.message);
    backendState.available = false;
    updateBackendBadge();
    return null;
  }
}

function updateBackendBadge() {
  const el = document.getElementById('backend-status');
  if (!el) return;
  if (backendState.available) {
    el.textContent = '🗄️ SQLite + JSON 后端已连接';
    el.className = 'backend-ok';
  } else {
    el.textContent = '🗄️ 后端未连接（纯前端降级）';
    el.className = 'backend-off';
  }
}

function buildBackendSnapshot() {
  return {
    player: {
      x: player.x,
      y: player.y,
      facing: player.facing,
      hp: player.hp,
      maxHp: player.maxHp,
      inventory: [...player.inventory],
      behaviorTags: [...player.behaviorTags],
      visitCount: player.visitCount,
    },
    worldState: {
      weather: worldState.weather,
      timeOfDay: worldState.timeOfDay,
      bloodMoonCountdown: worldState.bloodMoonCountdown,
      caveStatus: worldState.caveStatus,
      recentEvents: [...worldState.recentEvents],
    },
    items: items.map((item) => ({
      id: item.id,
      visible: item.visible,
    })),
  };
}

function applyBackendBootstrap(payload) {
  const structured = payload?.structured;
  if (!structured) return;

  Object.assign(player, {
    x: structured.player.x,
    y: structured.player.y,
    facing: structured.player.facing,
    hp: structured.player.hp,
    maxHp: structured.player.maxHp,
    visitCount: structured.player.visitCount,
  });
  player.inventory = [...structured.player.inventory];
  player.behaviorTags = [...structured.player.behaviorTags];

  Object.assign(worldState, {
    weather: structured.worldState.weather,
    timeOfDay: structured.worldState.timeOfDay,
    bloodMoonCountdown: structured.worldState.bloodMoonCountdown,
    caveStatus: structured.worldState.caveStatus,
  });
  worldState.recentEvents = [...structured.worldState.recentEvents];

  for (const incoming of structured.items || []) {
    const local = items.find((item) => item.id === incoming.id);
    if (local) local.visible = Boolean(incoming.visible);
  }

  memory.entries = (structured.memory?.entries || []).map((entry) => ({
    timestamp: entry.timestamp,
    event: entry.event,
    npcId: entry.npcId,
    detail: entry.detail,
  }));
  memory.summary = structured.memory?.summary || '';
}

async function refreshBackendStorage() {
  if (!backendState.available) return;
  const [structured, semiStructured] = await Promise.all([
    backendFetch('/api/storage/structured'),
    backendFetch('/api/storage/semi-structured'),
  ]);
  if (structured && semiStructured) {
    backendState.storage = { structured, semiStructured };
    window.backendStorage = backendState.storage;
    if (typeof renderDataflowPanel === 'function') renderDataflowPanel();
  }
}

async function initBackendState() {
  const health = await backendFetch('/api/health');
  backendState.available = Boolean(health?.ok);
  backendState.health = health;
  updateBackendBadge();
  if (!backendState.available) return;

  const bootstrap = await backendFetch('/api/game/bootstrap');
  if (bootstrap) {
    applyBackendBootstrap(bootstrap);
    updatePlayerHud();
    updateWorldHud();
    renderMemoryPanel();
  }
  await refreshBackendStorage();
}

function syncBackendState(reason = 'state_change') {
  if (!backendState.available) return;
  backendState.lastSyncReason = reason;
  clearTimeout(backendState.syncTimer);
  backendState.syncTimer = setTimeout(async () => {
    await backendFetch('/api/player/state', {
      method: 'POST',
      body: JSON.stringify({
        reason: backendState.lastSyncReason,
        snapshot: buildBackendSnapshot(),
      }),
    });
    refreshBackendStorage();
  }, 120);
}

async function resetBackendState() {
  if (!backendState.available) return null;
  const result = await backendFetch('/api/reset', { method: 'POST', body: '{}' });
  await refreshBackendStorage();
  return result;
}

function recordBackendMemory(entry) {
  if (!backendState.available) return;
  backendFetch('/api/memory', {
    method: 'POST',
    body: JSON.stringify({ entry }),
  }).then(() => refreshBackendStorage());
}

async function backendGen1Talk(npcId) {
  if (!backendState.available) return null;
  return backendFetch('/api/dialogue/gen1', {
    method: 'POST',
    body: JSON.stringify({
      npcId,
      snapshot: buildBackendSnapshot(),
    }),
  });
}

async function backendGen2Talk(npcId) {
  if (!backendState.available) return null;
  return backendFetch('/api/dialogue/gen2', {
    method: 'POST',
    body: JSON.stringify({
      npcId,
      snapshot: buildBackendSnapshot(),
    }),
  });
}

async function backendSearchLore(query, limit = 6) {
  if (!backendState.available) return null;
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return backendFetch(`/api/lore/search?${params.toString()}`);
}

document.addEventListener('DOMContentLoaded', () => {
  updateBackendBadge();
  initBackendState();
});
