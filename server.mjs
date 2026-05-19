import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env.local（如果存在），让 ARK_EMBEDDING_API_KEY 等敏感配置不进 git
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(join(__dirname, '.env.local'));
  }
} catch (e) {
  // .env.local 不存在或读取失败 —— 向量召回会自动回落到 LIKE 检索
}

const PORT = Number(process.env.PORT || 5180);
const DATA_DIR = join(__dirname, 'data');
const CONTENT_DIR = join(__dirname, 'content');
const DB_PATH = join(DATA_DIR, 'game.sqlite');
const DEFAULT_LORE_DIR = '/Users/bytedance/Documents/哈利波特小说编译/compiled';
const LORE_DIR = process.env.LORE_DIR || DEFAULT_LORE_DIR;
const PLAYER_ID = 'player_demo';
const PROJECT_ID = 'zelda_station';
const MAP_ID = 'station_main';

// ----- 火山方舟 embedding 配置 -----
const ARK_EMBEDDING = {
  apiKey: process.env.ARK_EMBEDDING_API_KEY || '',
  endpoint: process.env.ARK_EMBEDDING_ENDPOINT || 'ep-20260425105526-7bkxt',
  baseUrl: process.env.ARK_EMBEDDING_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/embeddings',
  batchSize: Math.max(1, Math.min(Number(process.env.ARK_EMBEDDING_BATCH_SIZE) || 64, 256)),
};
const EMBEDDING_ENABLED = !!ARK_EMBEDDING.apiKey;
if (EMBEDDING_ENABLED) {
  console.log(`[embedding] 方舟 endpoint=${ARK_EMBEDDING.endpoint} batchSize=${ARK_EMBEDDING.batchSize}`);
} else {
  console.log('[embedding] ARK_EMBEDDING_API_KEY 未设置 → 检索将回落到 LIKE 关键词匹配（不是真向量召回）');
}

// ----- 对话 LLM 配置（DeepSeek，浏览器→Railway→DeepSeek 代理透传，避免 key 暴露给前端）-----
const LLM_PROVIDER = {
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_BASE_URL || process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || process.env.LLM_MODEL || 'deepseek-chat',
};
const LLM_ENABLED = !!LLM_PROVIDER.apiKey;
if (LLM_ENABLED) {
  console.log(`[llm] DeepSeek 代理已启用 model=${LLM_PROVIDER.model}`);
} else {
  console.log('[llm] DEEPSEEK_API_KEY 未设置 → gen3 对话生成将失败（仅 gen1/gen2 可用）');
}

mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

const MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8',
  '.md': 'text/markdown; charset=UTF-8',
};

const seed = {
  project: {
    id: PROJECT_ID,
    name: '塞尔达边境驿站',
  },
  map: {
    id: MAP_ID,
    name: '边境驿站主地图',
    cols: 20,
    rows: 15,
    rawMap: [
      'TTT..............TTT',
      'T..................T',
      'T.WWWWWWWWWWW......T',
      'T.WFFFFFFFFFW......T',
      'T.WFFFFCFFFFW......T',
      'T.WFFFFFFFFFW......T',
      'T.WFFFFtFFFFW......T',
      'T.WFFFFFFFFFW......T',
      'T.WFFFFfFFFFW......T',
      'T.WFFFFFFFFFW......T',
      'T.WWWWWWWWDWW......T',
      'T.........RRR......T',
      'T.........RRR......T',
      'T.........RRR......T',
      'TTTTTTTTTTTTTTTTTTTT',
    ],
  },
  player: {
    id: PLAYER_ID,
    name: '林克',
    x: 10,
    y: 12,
    facing: 'up',
    hp: 100,
    maxHp: 100,
    visitCount: 0,
  },
  world: {
    weather: 'clear',
    timeOfDay: 'evening',
    bloodMoonCountdown: 2,
    caveStatus: 'unexplored',
    recentEvents: [
      '有旅行者报告东边山洞有异响',
      '平原上最近出现了一只白鬃莱尼尔',
      '驿站门口偶尔会有猫头鹰投递带封蜡的密信',
    ],
  },
  npcs: [
    { id: 'hostess', name: '驿站老板娘·惠子', role: 'hostess', x: 6, y: 4, spriteKey: 'hostess', published: 1 },
    { id: 'merchant', name: '旅行商人·阿福', role: 'merchant', x: 6, y: 6, spriteKey: 'merchant', published: 1 },
    { id: 'soldier', name: '驻扎士兵·大壮', role: 'soldier', x: 6, y: 8, spriteKey: 'soldier', published: 1 },
    { id: 'bard', name: '流浪诗人·伊莱', role: 'bard', x: 10, y: 6, spriteKey: 'bard', published: 0 },
  ],
  items: [
    { id: 'soup', name: '暖暖汤', x: 8, y: 4, type: 'stealable', visible: 1 },
    { id: 'ore', name: '矿石', x: 10, y: 11, type: 'pickable', visible: 1 },
    { id: 'letter', name: '猫头鹰密信', x: 11, y: 11, type: 'quest', visible: 0 },
  ],
  dialogueNodes: [
    {
      npcId: 'hostess',
      text: '旅行者你好！要不要来碗暖汤？',
      actions: [
        { label: '好的，谢谢', effect: 'accept_soup' },
        { label: '不用了', effect: 'leave' },
      ],
    },
    {
      npcId: 'merchant',
      text: '嘿，伙计！看看我的好货吧。',
      actions: [
        { label: '看看', effect: 'browse' },
        { label: '不了', effect: 'leave' },
      ],
    },
    {
      npcId: 'soldier',
      text: '注意安全。',
      actions: [{ label: '好的', effect: 'leave' }],
    },
    {
      npcId: 'bard',
      text: '旅人啊，愿风指引你的路。',
      actions: [
        { label: '谢谢', effect: 'leave' },
        { label: '（离开）', effect: 'leave' },
      ],
    },
  ],
};

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maps (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cols INTEGER NOT NULL,
      rows INTEGER NOT NULL,
      raw_map_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      map_id TEXT NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      sprite_key TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      facing TEXT NOT NULL,
      hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      visit_count INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_inventory (
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (player_id, item_name)
    );

    CREATE TABLE IF NOT EXISTS player_tags (
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (player_id, tag)
    );

    CREATE TABLE IF NOT EXISTS world_state (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      weather TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
      blood_moon_countdown INTEGER NOT NULL,
      cave_status TEXT NOT NULL,
      recent_events_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      type TEXT NOT NULL,
      visible INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dialogue_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id TEXT NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
      priority INTEGER NOT NULL DEFAULT 100,
      text TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      npc_id TEXT,
      detail TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dialogue_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      npc_id TEXT NOT NULL,
      generation TEXT NOT NULL,
      source TEXT NOT NULL,
      request_json TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lore_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corpus_id TEXT NOT NULL,
      source_path TEXT NOT NULL UNIQUE,
      relative_path TEXT NOT NULL,
      media_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mtime_ms INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lore_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES lore_sources(id) ON DELETE CASCADE,
      corpus_id TEXT NOT NULL,
      chunk_key TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      safe_preview TEXT NOT NULL,
      search_text TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lore_ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corpus_id TEXT NOT NULL,
      root_dir TEXT NOT NULL,
      source_count INTEGER NOT NULL,
      changed_count INTEGER NOT NULL,
      skipped_count INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_lore_chunks_corpus ON lore_chunks(corpus_id);
    CREATE INDEX IF NOT EXISTS idx_lore_chunks_category ON lore_chunks(category);
    CREATE INDEX IF NOT EXISTS idx_lore_chunks_title ON lore_chunks(title);
    CREATE INDEX IF NOT EXISTS idx_lore_sources_corpus ON lore_sources(corpus_id);
  `);

  // ----- Schema 演进：lore_chunks 追加向量列（旧库自动 ALTER） -----
  // embedding: Float32Array 序列化后的 BLOB；embedding_dim: 维度；embedding_model: 模型标识
  ensureColumn('lore_chunks', 'embedding', 'BLOB');
  ensureColumn('lore_chunks', 'embedding_dim', 'INTEGER');
  ensureColumn('lore_chunks', 'embedding_model', 'TEXT');
  ensureColumn('lore_chunks', 'embedded_at', 'TEXT');
}

function ensureColumn(table, column, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table});`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl};`);
    console.log(`[migrate] ${table}.${column} 已添加`);
  }
}

function withTransaction(fn) {
  db.exec('BEGIN;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function resetSeedData() {
  withTransaction(() => {
    db.exec(`
      DELETE FROM dialogue_events;
      DELETE FROM memory_entries;
      DELETE FROM dialogue_nodes;
      DELETE FROM player_tags;
      DELETE FROM player_inventory;
      DELETE FROM items;
      DELETE FROM world_state;
      DELETE FROM players;
      DELETE FROM npcs;
      DELETE FROM maps;
      DELETE FROM projects;
    `);

    db.prepare('INSERT INTO projects (id, name) VALUES (?, ?)').run(seed.project.id, seed.project.name);
    db.prepare('INSERT INTO maps (id, project_id, name, cols, rows, raw_map_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(seed.map.id, PROJECT_ID, seed.map.name, seed.map.cols, seed.map.rows, JSON.stringify(seed.map.rawMap));

    const insertNpc = db.prepare(`
      INSERT INTO npcs (id, project_id, map_id, name, role, x, y, sprite_key, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const npc of seed.npcs) {
      insertNpc.run(npc.id, PROJECT_ID, MAP_ID, npc.name, npc.role, npc.x, npc.y, npc.spriteKey, npc.published);
    }

    db.prepare(`
      INSERT INTO players (id, project_id, name, x, y, facing, hp, max_hp, visit_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seed.player.id,
      PROJECT_ID,
      seed.player.name,
      seed.player.x,
      seed.player.y,
      seed.player.facing,
      seed.player.hp,
      seed.player.maxHp,
      seed.player.visitCount,
    );

    db.prepare(`
      INSERT INTO world_state
        (project_id, weather, time_of_day, blood_moon_countdown, cave_status, recent_events_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      PROJECT_ID,
      seed.world.weather,
      seed.world.timeOfDay,
      seed.world.bloodMoonCountdown,
      seed.world.caveStatus,
      JSON.stringify(seed.world.recentEvents),
    );

    const insertItem = db.prepare(`
      INSERT INTO items (id, project_id, name, x, y, type, visible)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of seed.items) {
      insertItem.run(item.id, PROJECT_ID, item.name, item.x, item.y, item.type, item.visible);
    }

    const insertDialogue = db.prepare(`
      INSERT INTO dialogue_nodes (npc_id, priority, text, actions_json)
      VALUES (?, ?, ?, ?)
    `);
    seed.dialogueNodes.forEach((row, index) => {
      insertDialogue.run(row.npcId, index + 1, row.text, JSON.stringify(row.actions));
    });
  });
}

function ensureSeeded() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM projects').get().count;
  if (!count) resetSeedData();
}

function readJsonFile(name) {
  return JSON.parse(readFileSync(join(CONTENT_DIR, name), 'utf8'));
}

function getSemiStructuredAssets() {
  return {
    files: [
      'content/npc_profiles.json',
      'content/dialogue_templates.json',
      'content/world_lore.json',
      `${LORE_DIR}/*`,
    ],
    npcProfiles: readJsonFile('npc_profiles.json'),
    dialogueTemplates: readJsonFile('dialogue_templates.json'),
    worldLore: readJsonFile('world_lore.json'),
    externalLore: getLoreStatus(),
  };
}

function toPosixPath(filePath) {
  return filePath.split('\\').join('/');
}

function walkLoreFiles(rootDir) {
  if (!existsSync(rootDir)) return [];
  const allowed = new Set(['.json', '.md', '.txt']);
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const name of readdirSync(current)) {
        if (name.startsWith('.')) continue;
        stack.push(join(current, name));
      }
    } else if (stat.isFile() && allowed.has(extname(current).toLowerCase())) {
      results.push(current);
    }
  }
  return results.sort();
}

function fileHash(text) {
  return createHash('sha256').update(text).digest('hex');
}

function compactText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeLoreValue(value, key = '') {
  const rawTextKeys = /^(原文|正文|全文|content|full_text|fullText|rawText)$/i;
  if (typeof value === 'string') {
    if (rawTextKeys.test(key) && value.length > 500) {
      return `[长文本字段 ${key} 已排除直接展示，仅保留来源和结构化摘要]`;
    }
    return compactText(value).slice(0, 1200);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitizeLoreValue(item, key));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = sanitizeLoreValue(childValue, childKey);
    }
    return out;
  }
  return value;
}

function titleFromRecord(record, fallback) {
  if (!record || typeof record !== 'object') return fallback;
  return compactText(
    record.名称 ||
    record.姓名 ||
    record.title ||
    record.name ||
    record.id ||
    record.原名 ||
    fallback,
  ).slice(0, 80) || fallback;
}

function tagsFromRecord(record) {
  if (!record || typeof record !== 'object') return [];
  const values = [
    record.类型,
    record.类别,
    record.性质,
    record.势力,
    record.身份,
    record.地点,
    ...(Array.isArray(record.标签) ? record.标签 : []),
  ].filter(Boolean);
  return Array.from(new Set(values.map((item) => compactText(item)).filter(Boolean))).slice(0, 12);
}

function recordsFromJson(data, relativePath) {
  const category = basename(relativePath, extname(relativePath));
  if (Array.isArray(data)) {
    return data.map((record, index) => ({
      key: record?.id || `${category}_${index + 1}`,
      category,
      title: titleFromRecord(record, `${category} #${index + 1}`),
      record,
    }));
  }
  if (data && typeof data === 'object') {
    const entries = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach((record, index) => {
          entries.push({
            key: `${key}_${record?.id || index + 1}`,
            category: key,
            title: titleFromRecord(record, `${key} #${index + 1}`),
            record,
          });
        });
      } else {
        entries.push({
          key,
          category,
          title: titleFromRecord(value, key),
          record: value,
        });
      }
    }
    return entries;
  }
  return [{
    key: category,
    category,
    title: category,
    record: { value: data },
  }];
}

function recordsFromMarkdown(text, relativePath) {
  const category = basename(relativePath, extname(relativePath));
  const lines = text.split(/\r?\n/);
  const records = [];
  let currentTitle = category;
  let current = [];
  const push = () => {
    const body = compactText(current.join('\n'));
    if (!body) return;
    records.push({
      key: `${category}_${records.length + 1}`,
      category,
      title: currentTitle,
      record: { title: currentTitle, summary: body.slice(0, 1200) },
    });
  };
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      push();
      currentTitle = compactText(heading[1]).slice(0, 80) || category;
      current = [];
    } else {
      current.push(line);
    }
  }
  push();
  return records.length ? records : [{
    key: category,
    category,
    title: category,
    record: { summary: compactText(text).slice(0, 1200) },
  }];
}

function sourceCategory(relativePath) {
  const parts = toPosixPath(relativePath).split('/');
  if (parts[0] === 'data' && parts[1]) return basename(parts[1], extname(parts[1]));
  return basename(relativePath, extname(relativePath));
}

function loreRecordsFromFile(filePath, rootDir) {
  const relativePath = toPosixPath(relative(rootDir, filePath));
  const ext = extname(filePath).toLowerCase();
  const text = readFileSync(filePath, 'utf8');
  const hash = fileHash(text);
  const records = ext === '.json'
    ? recordsFromJson(JSON.parse(text), relativePath)
    : recordsFromMarkdown(text, relativePath);
  return { relativePath, ext, text, hash, records };
}

function ingestLoreCorpus(rootDir = LORE_DIR, corpusId = 'external_world_lore') {
  const files = walkLoreFiles(rootDir);
  let changedCount = 0;
  let skippedCount = 0;
  let chunkCount = 0;
  let status = 'ok';
  let error = null;

  try {
    for (const filePath of files) {
      const stat = statSync(filePath);
      const existing = db.prepare('SELECT id, size_bytes, mtime_ms FROM lore_sources WHERE source_path = ?').get(filePath);
      if (existing && existing.size_bytes === stat.size && existing.mtime_ms === Math.round(stat.mtimeMs)) {
        skippedCount += 1;
        chunkCount += db.prepare('SELECT COUNT(*) AS count FROM lore_chunks WHERE source_id = ?').get(existing.id).count;
        continue;
      }

      const parsed = loreRecordsFromFile(filePath, rootDir);
      const categoryFallback = sourceCategory(parsed.relativePath);
      changedCount += 1;

      withTransaction(() => {
        if (existing) {
          db.prepare('DELETE FROM lore_chunks WHERE source_id = ?').run(existing.id);
          db.prepare(`
            UPDATE lore_sources
            SET corpus_id = ?, relative_path = ?, media_type = ?, size_bytes = ?, mtime_ms = ?,
                content_hash = ?, status = ?, record_count = ?, chunk_count = ?, indexed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            corpusId,
            parsed.relativePath,
            parsed.ext.replace('.', '') || 'text',
            stat.size,
            Math.round(stat.mtimeMs),
            parsed.hash,
            'indexed',
            parsed.records.length,
            parsed.records.length,
            existing.id,
          );
        } else {
          db.prepare(`
            INSERT INTO lore_sources
              (corpus_id, source_path, relative_path, media_type, size_bytes, mtime_ms,
               content_hash, status, record_count, chunk_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            corpusId,
            filePath,
            parsed.relativePath,
            parsed.ext.replace('.', '') || 'text',
            stat.size,
            Math.round(stat.mtimeMs),
            parsed.hash,
            'indexed',
            parsed.records.length,
            parsed.records.length,
          );
        }

        const source = db.prepare('SELECT id FROM lore_sources WHERE source_path = ?').get(filePath);
        const insertChunk = db.prepare(`
          INSERT INTO lore_chunks
            (source_id, corpus_id, chunk_key, title, category, tags_json, safe_preview, search_text, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const record of parsed.records) {
          const safeRecord = sanitizeLoreValue(record.record);
          const title = record.title || titleFromRecord(safeRecord, categoryFallback);
          const category = record.category || categoryFallback;
          const tags = tagsFromRecord(safeRecord);
          const safePreview = compactText(JSON.stringify(safeRecord, null, 0)).slice(0, 180);
          const searchText = compactText([
            title,
            category,
            tags.join(' '),
            JSON.stringify(safeRecord),
          ].join(' ')).slice(0, 4000);
          insertChunk.run(
            source.id,
            corpusId,
            String(record.key || `${category}_${chunkCount + 1}`).slice(0, 160),
            title,
            category,
            JSON.stringify(tags),
            safePreview,
            searchText,
            JSON.stringify({
              sourcePath: parsed.relativePath,
              mediaType: parsed.ext.replace('.', '') || 'text',
              fields: safeRecord && typeof safeRecord === 'object' ? Object.keys(safeRecord).slice(0, 24) : [],
            }),
          );
          chunkCount += 1;
        }
      });
    }
  } catch (err) {
    status = 'error';
    error = err.message;
  }

  db.prepare(`
    INSERT INTO lore_ingest_runs
      (corpus_id, root_dir, source_count, changed_count, skipped_count, chunk_count, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(corpusId, rootDir, files.length, changedCount, skippedCount, chunkCount, status, error);

  if (error) throw httpError(500, error);
  return getLoreStatus();
}

function getLoreStatus() {
  const sourceCount = db.prepare('SELECT COUNT(*) AS count FROM lore_sources').get().count;
  const chunkCount = db.prepare('SELECT COUNT(*) AS count FROM lore_chunks').get().count;
  const categories = db.prepare(`
    SELECT category, COUNT(*) AS count
    FROM lore_chunks
    GROUP BY category
    ORDER BY count DESC, category ASC
    LIMIT 20
  `).all();
  const lastRun = db.prepare(`
    SELECT root_dir AS rootDir, source_count AS sourceCount, changed_count AS changedCount,
           skipped_count AS skippedCount, chunk_count AS chunkCount, status, error, created_at AS createdAt
    FROM lore_ingest_runs
    ORDER BY id DESC
    LIMIT 1
  `).get();
  return {
    rootDir: LORE_DIR,
    exists: existsSync(LORE_DIR),
    indexed: sourceCount > 0,
    sourceCount,
    chunkCount,
    categories,
    lastRun: lastRun || null,
  };
}

function ensureLoreIndexed() {
  if (!existsSync(LORE_DIR)) return;
  const existing = db.prepare('SELECT COUNT(*) AS count FROM lore_sources').get().count;
  if (!existing) ingestLoreCorpus(LORE_DIR);
}

// ============== 向量 embedding（火山方舟）==============

// 调用方舟 multimodal embedding API
// 注意：multimodal endpoint 每次只接受一条 input（content array），
//      所以批量靠循环 + 进度日志；ARK_EMBEDDING_BATCH_SIZE 改成日志粒度
// 返回: { vectors: number[][], dim: number, model: string }
async function embedTexts(texts) {
  if (!EMBEDDING_ENABLED) {
    throw new Error('embedding 未配置：缺少 ARK_EMBEDDING_API_KEY');
  }
  if (!Array.isArray(texts) || texts.length === 0) {
    return { vectors: [], dim: 0, model: ARK_EMBEDDING.endpoint };
  }

  const out = [];
  let detectedDim = 0;
  for (let i = 0; i < texts.length; i++) {
    const text = String(texts[i] || '').slice(0, 4000);
    const body = {
      model: ARK_EMBEDDING.endpoint,
      input: [{ type: 'text', text }],
    };
    // 单次最多重试 2 次（共 3 次尝试），处理方舟瞬时网络抖动
    let res, lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        res = await fetch(ARK_EMBEDDING.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ARK_EMBEDDING.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));  // 300ms / 600ms backoff
        }
      }
    }
    if (!res) {
      throw new Error(`方舟 embedding fetch 失败（3 次重试均失败）: ${lastErr?.message || 'unknown'}`);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`方舟 embedding API 失败 ${res.status}: ${errText.slice(0, 500)}`);
    }
    const json = await res.json();
    // multimodal 接口返回结构：{ data: { embedding: number[] }, ... }（单条），
    // 但也可能是 { data: [{ embedding: number[] }] }（兼容写法）。两种都兜底。
    let vec = null;
    if (Array.isArray(json?.data?.embedding)) {
      vec = json.data.embedding;
    } else if (Array.isArray(json?.data) && Array.isArray(json.data[0]?.embedding)) {
      vec = json.data[0].embedding;
    }
    if (!Array.isArray(vec)) {
      throw new Error(`方舟 multimodal embedding 返回格式异常: ${JSON.stringify(json).slice(0, 300)}`);
    }
    detectedDim = detectedDim || vec.length;
    out.push(vec);
  }

  return { vectors: out, dim: detectedDim, model: ARK_EMBEDDING.endpoint };
}

// 把 Float32Array 序列化成 Buffer 存入 SQLite BLOB
function vectorToBuffer(vec) {
  const f32 = new Float32Array(vec);
  return Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
}
// 反序列化：BLOB → Float32Array
function bufferToVector(buf) {
  if (!buf || !buf.byteLength) return null;
  // SQLite 返回的可能是 Uint8Array 或 Buffer
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Float32Array(ab);
}
// 余弦相似度（两个向量都应已经 normalize 或这里现算 norm）
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 批量给 lore_chunks 补 embedding（缺 embedding 的 chunk 才会被处理）
// 返回 { processed: 数量, total: 总数 }
async function reindexLoreEmbeddings({ force = false } = {}) {
  if (!EMBEDDING_ENABLED) {
    console.warn('[embedding] 跳过 reindex：ARK_EMBEDDING_API_KEY 未配置');
    return { processed: 0, total: 0, skipped: true };
  }
  const sql = force
    ? `SELECT id, title, search_text AS searchText FROM lore_chunks ORDER BY id`
    : `SELECT id, title, search_text AS searchText FROM lore_chunks WHERE embedding IS NULL ORDER BY id`;
  const rows = db.prepare(sql).all();
  if (rows.length === 0) {
    console.log('[embedding] 没有需要 embed 的 chunk');
    return { processed: 0, total: 0 };
  }
  console.log(`[embedding] 开始处理 ${rows.length} 个 chunk（batch=${ARK_EMBEDDING.batchSize}）…`);

  const update = db.prepare(`
    UPDATE lore_chunks
    SET embedding = ?, embedding_dim = ?, embedding_model = ?, embedded_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let processed = 0;
  for (let i = 0; i < rows.length; i += ARK_EMBEDDING.batchSize) {
    const batch = rows.slice(i, i + ARK_EMBEDDING.batchSize);
    // 把 title 拼到 searchText 前面，让标题信息也进 embedding
    const inputs = batch.map((r) => `${r.title}\n${r.searchText}`.slice(0, 4000));
    try {
      const { vectors, dim, model } = await embedTexts(inputs);
      for (let j = 0; j < batch.length; j++) {
        update.run(vectorToBuffer(vectors[j]), dim, model, batch[j].id);
      }
      processed += batch.length;
      console.log(`[embedding] ${processed} / ${rows.length} 完成`);
    } catch (err) {
      console.error(`[embedding] batch i=${i} 失败:`, err.message);
      throw err;
    }
  }
  console.log(`[embedding] 全部完成：${processed} 个 chunk`);
  return { processed, total: rows.length };
}

async function searchLore(query, limit = 6) {
  const q = compactText(query);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 20));
  if (!q) {
    return {
      query: q,
      method: 'recent',
      results: db.prepare(`
        SELECT id, title, category, tags_json AS tagsJson, safe_preview AS safePreview,
               metadata_json AS metadataJson
        FROM lore_chunks
        ORDER BY id DESC
        LIMIT ?
      `).all(safeLimit).map(formatLoreHit),
    };
  }

  // 路径 A：向量召回（embedding 已配置 + DB 里至少一条 chunk 有向量）
  if (EMBEDDING_ENABLED) {
    const embeddedCount = db.prepare('SELECT COUNT(*) AS c FROM lore_chunks WHERE embedding IS NOT NULL').get().c;
    if (embeddedCount > 0) {
      try {
        const t0 = Date.now();
        const { vectors, dim, model } = await embedTexts([q]);
        const queryVec = vectors[0];
        const tEmbed = Date.now() - t0;

        // 拉所有 chunk 的向量,在 JS 端算 cosine top-K
        // (单机 demo 规模 499 chunk × 2048 维大约 4MB 内存,完全扛得住)
        const t1 = Date.now();
        const rows = db.prepare(`
          SELECT id, title, category, tags_json AS tagsJson, safe_preview AS safePreview,
                 metadata_json AS metadataJson, embedding, embedding_dim AS embeddingDim
          FROM lore_chunks
          WHERE embedding IS NOT NULL
        `).all();
        const scored = rows.map((row) => {
          const vec = bufferToVector(row.embedding);
          return { ...row, score: cosineSim(queryVec, vec) };
        });
        scored.sort((a, b) => b.score - a.score || a.id - b.id);
        const tRank = Date.now() - t1;

        return {
          query: q,
          method: 'vector',
          model,
          dim,
          embeddedCount,
          timing: { embed_ms: tEmbed, rank_ms: tRank },
          results: scored.slice(0, safeLimit).map((row) => ({
            ...formatLoreHit(row),
            score: Number(row.score.toFixed(4)),
            method: 'cosine',
          })),
        };
      } catch (err) {
        console.warn('[search] 向量召回失败，回落到 LIKE:', err.message);
        // 继续走 fallback
      }
    }
  }

  // 路径 B（fallback）：关键词 LIKE + 加权打分
  const tokens = q.split(/\s+/).map((token) => token.trim()).filter(Boolean).slice(0, 8);
  const where = tokens.map(() => '(title LIKE ? OR category LIKE ? OR search_text LIKE ?)').join(' OR ');
  const params = tokens.flatMap((token) => {
    const like = `%${token}%`;
    return [like, like, like];
  });
  const rows = db.prepare(`
    SELECT id, title, category, tags_json AS tagsJson, safe_preview AS safePreview,
           metadata_json AS metadataJson, search_text AS searchText
    FROM lore_chunks
    WHERE ${where}
    LIMIT 300
  `).all(...params);

  return {
    query: q,
    method: 'keyword-like',
    fallbackReason: EMBEDDING_ENABLED ? 'embedding 调用失败' : 'ARK_EMBEDDING_API_KEY 未配置',
    results: rows
      .map((row) => ({ ...row, score: scoreLoreRow(row, tokens) }))
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, safeLimit)
      .map((row) => ({ ...formatLoreHit(row), score: row.score, method: 'like' })),
  };
}

function scoreLoreRow(row, tokens) {
  let score = 0;
  for (const token of tokens) {
    if (row.title.includes(token)) score += 100;
    if (row.category.includes(token)) score += 70;
    if (row.searchText.includes(token)) score += 25;
  }
  return score;
}

function formatLoreHit(row) {
  const metadata = JSON.parse(row.metadataJson || '{}');
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tags: JSON.parse(row.tagsJson || '[]'),
    sourcePath: metadata.sourcePath,
    fields: metadata.fields || [],
    safePreview: row.safePreview,
    score: row.score ?? null,
  };
}

function getPlayerState() {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(PLAYER_ID);
  const inventory = db.prepare('SELECT item_name, quantity FROM player_inventory WHERE player_id = ? ORDER BY item_name').all(PLAYER_ID);
  const tags = db.prepare('SELECT tag FROM player_tags WHERE player_id = ? ORDER BY tag').all(PLAYER_ID);
  return {
    id: row.id,
    name: row.name,
    x: row.x,
    y: row.y,
    facing: row.facing,
    hp: row.hp,
    maxHp: row.max_hp,
    inventory: inventory.flatMap((item) => Array(item.quantity).fill(item.item_name)),
    behaviorTags: tags.map((tag) => tag.tag),
    visitCount: row.visit_count,
    updatedAt: row.updated_at,
  };
}

function getWorldState() {
  const row = db.prepare('SELECT * FROM world_state WHERE project_id = ?').get(PROJECT_ID);
  return {
    weather: row.weather,
    timeOfDay: row.time_of_day,
    bloodMoonCountdown: row.blood_moon_countdown,
    caveStatus: row.cave_status,
    recentEvents: JSON.parse(row.recent_events_json || '[]'),
    updatedAt: row.updated_at,
  };
}

function getStructuredSnapshot() {
  return {
    project: db.prepare('SELECT * FROM projects WHERE id = ?').get(PROJECT_ID),
    map: (() => {
      const row = db.prepare('SELECT * FROM maps WHERE id = ?').get(MAP_ID);
      return {
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        cols: row.cols,
        rows: row.rows,
        rawMap: JSON.parse(row.raw_map_json),
      };
    })(),
    npcs: db.prepare('SELECT id, name, role, x, y, sprite_key AS spriteKey, published FROM npcs ORDER BY id').all(),
    player: getPlayerState(),
    worldState: getWorldState(),
    items: db.prepare('SELECT id, name, x, y, type, visible FROM items ORDER BY id').all()
      .map((item) => ({ ...item, visible: Boolean(item.visible) })),
    memory: {
      entries: db.prepare(`
        SELECT event_type AS event, npc_id AS npcId, detail, created_at AS timestamp
        FROM memory_entries
        WHERE player_id = ?
        ORDER BY id
        LIMIT 100
      `).all(PLAYER_ID),
      summary: '',
    },
  };
}

function getStructuredTables() {
  const wanted = [
    'projects',
    'maps',
    'npcs',
    'players',
    'player_inventory',
    'player_tags',
    'world_state',
    'items',
    'dialogue_nodes',
    'memory_entries',
    'dialogue_events',
  ];
  const tables = {};
  for (const name of wanted) {
    const count = db.prepare(`SELECT COUNT(*) AS count FROM ${name}`).get().count;
    const rows = db.prepare(`SELECT * FROM ${name} ORDER BY 1 LIMIT 8`).all();
    tables[name] = { count, rows };
  }
  return { database: 'data/game.sqlite', tables };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function updateStructuredState(snapshot = {}) {
  const p = snapshot.player || {};
  const w = snapshot.worldState || {};
  const incomingItems = normalizeArray(snapshot.items);

  withTransaction(() => {
    db.prepare(`
      UPDATE players
      SET x = ?, y = ?, facing = ?, hp = ?, max_hp = ?, visit_count = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      Number.isFinite(p.x) ? p.x : seed.player.x,
      Number.isFinite(p.y) ? p.y : seed.player.y,
      p.facing || seed.player.facing,
      Number.isFinite(p.hp) ? p.hp : seed.player.hp,
      Number.isFinite(p.maxHp) ? p.maxHp : seed.player.maxHp,
      Number.isFinite(p.visitCount) ? p.visitCount : seed.player.visitCount,
      PLAYER_ID,
    );

    db.prepare('DELETE FROM player_inventory WHERE player_id = ?').run(PLAYER_ID);
    const inventoryCounts = new Map();
    for (const item of normalizeArray(p.inventory)) {
      inventoryCounts.set(item, (inventoryCounts.get(item) || 0) + 1);
    }
    const insertInventory = db.prepare('INSERT INTO player_inventory (player_id, item_name, quantity) VALUES (?, ?, ?)');
    for (const [itemName, quantity] of inventoryCounts) insertInventory.run(PLAYER_ID, itemName, quantity);

    db.prepare('DELETE FROM player_tags WHERE player_id = ?').run(PLAYER_ID);
    const insertTag = db.prepare('INSERT OR IGNORE INTO player_tags (player_id, tag) VALUES (?, ?)');
    for (const tag of normalizeArray(p.behaviorTags)) insertTag.run(PLAYER_ID, tag);

    db.prepare(`
      UPDATE world_state
      SET weather = ?, time_of_day = ?, blood_moon_countdown = ?, cave_status = ?,
          recent_events_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
    `).run(
      w.weather || seed.world.weather,
      w.timeOfDay || seed.world.timeOfDay,
      Number.isFinite(w.bloodMoonCountdown) ? w.bloodMoonCountdown : seed.world.bloodMoonCountdown,
      w.caveStatus || seed.world.caveStatus,
      JSON.stringify(normalizeArray(w.recentEvents).length ? w.recentEvents : seed.world.recentEvents),
      PROJECT_ID,
    );

    const updateItem = db.prepare('UPDATE items SET visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    for (const item of incomingItems) {
      updateItem.run(item.visible ? 1 : 0, item.id);
    }
  });
  return getStructuredSnapshot();
}

function persistMemory(entry = {}) {
  const detail = String(entry.detail || '').trim();
  if (!detail) return null;
  db.prepare(`
    INSERT INTO memory_entries (player_id, event_type, npc_id, detail, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    PLAYER_ID,
    entry.event || 'dialogue',
    entry.npcId || null,
    detail,
    Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
  );
  return { ok: true };
}

function logDialogueEvent({ npcId, generation, source, request, response }) {
  db.prepare(`
    INSERT INTO dialogue_events (player_id, npc_id, generation, source, request_json, response_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    PLAYER_ID,
    npcId,
    generation,
    source,
    JSON.stringify(request),
    JSON.stringify(response),
  );
}

function gen1Dialogue(npcId) {
  const row = db.prepare(`
    SELECT d.id, d.npc_id, d.text, d.actions_json, n.name
    FROM dialogue_nodes d
    JOIN npcs n ON n.id = d.npc_id
    WHERE d.npc_id = ?
    ORDER BY d.priority ASC, d.id ASC
    LIMIT 1
  `).get(npcId);
  if (!row) throw httpError(404, `No dialogue node for npc ${npcId}`);

  const structured = getStructuredSnapshot();
  const response = {
    dialogue: row.text,
    actions: JSON.parse(row.actions_json),
    debugInfo: {
      generation: 'gen1',
      title: '结构化：SQLite dialogue_nodes 真查询',
      content:
`真实后端：data/game.sqlite

SQL：
SELECT d.id, d.npc_id, d.text, d.actions_json, n.name
FROM dialogue_nodes d
JOIN npcs n ON n.id = d.npc_id
WHERE d.npc_id = '${npcId}'
ORDER BY d.priority ASC, d.id ASC
LIMIT 1;

返回行：
${JSON.stringify(row, null, 2)}

当前结构化状态也在库里：
player.hp=${structured.player.hp}
player.inventory=${JSON.stringify(structured.player.inventory)}
player.behavior_tags=${JSON.stringify(structured.player.behaviorTags)}
world.weather=${structured.worldState.weather}

⚠️ 第一代能稳定查表和写状态，但这条 SQL 没有消费这些状态，所以仍然返回固定话术。`,
    },
  };
  logDialogueEvent({
    npcId,
    generation: 'gen1',
    source: 'sqlite:dialogue_nodes',
    request: { npcId },
    response,
  });
  return response;
}

function matchCondition(cond = {}, snapshot) {
  const player = snapshot.player;
  const world = snapshot.worldState;
  if (Object.keys(cond).length === 0) return true;
  if (cond.hasBehaviorTag && !player.behaviorTags.includes(cond.hasBehaviorTag)) return false;
  if (cond.playerHpPct) {
    const pct = player.hp / player.maxHp;
    if (pct < cond.playerHpPct[0] || pct > cond.playerHpPct[1]) return false;
  }
  if (cond.weather && world.weather !== cond.weather) return false;
  if (cond.caveStatus && world.caveStatus !== cond.caveStatus) return false;
  if (cond.minVisitCount && player.visitCount < cond.minVisitCount) return false;
  if (cond.timeOfDay && world.timeOfDay !== cond.timeOfDay) return false;
  if (cond.bloodMoonCountdown !== undefined && world.bloodMoonCountdown !== cond.bloodMoonCountdown) return false;
  return true;
}

function activeConditions(snapshot) {
  const hits = [];
  const pct = snapshot.player.hp / snapshot.player.maxHp;
  if (snapshot.player.behaviorTags.includes('thief')) hits.push('玩家是小偷');
  if (snapshot.player.behaviorTags.includes('helpful')) hits.push('玩家 helpful');
  if (pct < 0.3) hits.push('血量低于 30%');
  if (snapshot.worldState.weather === 'rain') hits.push('正在下雨');
  if (snapshot.worldState.timeOfDay === 'night') hits.push('夜晚时段');
  if (snapshot.worldState.bloodMoonCountdown === 0) hits.push('血月之夜');
  if (snapshot.worldState.caveStatus === 'letter_received') hits.push('收到猫头鹰密信');
  if (snapshot.worldState.caveStatus === 'quest_accepted') hits.push('已接受禁林来信任务');
  if (snapshot.worldState.caveStatus === 'cave_unlocked') hits.push('已获山洞通行许可');
  if (snapshot.player.visitCount >= 3) hits.push('来访 >= 3 次');
  return hits;
}

function gen2Dialogue(npcId, incomingSnapshot) {
  if (incomingSnapshot) updateStructuredState(incomingSnapshot);
  const snapshot = getStructuredSnapshot();
  const assets = getSemiStructuredAssets();
  const templates = assets.dialogueTemplates[npcId] || [];
  const profile = assets.npcProfiles[npcId] || {};
  const skipped = [];

  for (const template of templates) {
    if (matchCondition(template.condition, snapshot)) {
      const response = {
        dialogue: template.text,
        actions: template.actions || [{ label: '（离开）', effect: 'leave' }],
        debugInfo: {
          generation: 'gen2',
          title: '+ 半结构化/文件：content/dialogue_templates.json 真读取',
          content:
`真实后端：读取半结构化资产
文件：content/dialogue_templates.json
NPC profile：content/npc_profiles.json

当前 NPC profile：
${JSON.stringify(profile, null, 2)}

匹配过程：
${skipped.map((item) => `  ✗ ${item}`).join('\n')}${skipped.length ? '\n' : ''}  ✓ ${template.conditionDesc} → 命中

返回模板：
"${template.text}"

当前同时满足：
${activeConditions(snapshot).map((item) => `  • ${item}`).join('\n') || '  （只有默认条件）'}

⚠️ 第二代已经能装 profile、模板数组、动态字段和规则文档；但运行时仍是顺序命中一个模板，不能把多个信号自然融合成一段新对白。`,
        },
      };
      logDialogueEvent({
        npcId,
        generation: 'gen2',
        source: 'json:content/dialogue_templates.json',
        request: { npcId, snapshot },
        response,
      });
      return response;
    }
    skipped.push(template.conditionDesc || JSON.stringify(template.condition));
  }

  throw httpError(404, `No matching template for npc ${npcId}`);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(httpError(413, 'Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(httpError(400, 'Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function safeStaticPath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = normalize(join(__dirname, requested));
  if (!resolved.startsWith(__dirname)) return null;
  return resolved;
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      backend: 'zelda-station-demo',
      structured: 'SQLite data/game.sqlite',
      semiStructured: ['content/npc_profiles.json', 'content/dialogue_templates.json', 'content/world_lore.json'],
      externalLore: getLoreStatus(),
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/game/bootstrap') {
    sendJson(res, 200, {
      structured: getStructuredSnapshot(),
      semiStructured: getSemiStructuredAssets(),
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/storage/structured') {
    sendJson(res, 200, getStructuredTables());
    return;
  }

  if (req.method === 'GET' && pathname === '/api/storage/semi-structured') {
    sendJson(res, 200, getSemiStructuredAssets());
    return;
  }

  if (req.method === 'GET' && pathname === '/api/lore/status') {
    sendJson(res, 200, getLoreStatus());
    return;
  }

  if (req.method === 'POST' && pathname === '/api/lore/ingest') {
    const body = await readBody(req);
    sendJson(res, 200, ingestLoreCorpus(body.rootDir || LORE_DIR));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/lore/search') {
    sendJson(res, 200, await searchLore(url.searchParams.get('q') || '', url.searchParams.get('limit') || 6));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/player/state') {
    const body = await readBody(req);
    sendJson(res, 200, { ok: true, structured: updateStructuredState(body.snapshot) });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/memory') {
    const body = await readBody(req);
    sendJson(res, 200, persistMemory(body.entry));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/dialogue/gen1') {
    const body = await readBody(req);
    if (body.snapshot) updateStructuredState(body.snapshot);
    sendJson(res, 200, gen1Dialogue(body.npcId));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/dialogue/gen2') {
    const body = await readBody(req);
    sendJson(res, 200, gen2Dialogue(body.npcId, body.snapshot));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/reset') {
    resetSeedData();
    sendJson(res, 200, { ok: true, structured: getStructuredSnapshot() });
    return;
  }

  // LLM 代理：浏览器 → 本服务 → DeepSeek，避免把 API key 暴露给前端
  if (req.method === 'POST' && pathname === '/api/llm/chat') {
    if (!LLM_ENABLED) {
      sendJson(res, 503, { error: 'DEEPSEEK_API_KEY 未在服务端配置' });
      return;
    }
    const body = await readBody(req);
    const requestBody = {
      ...body,
      model: body.model || LLM_PROVIDER.model,
    };
    const upstream = await fetch(LLM_PROVIDER.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_PROVIDER.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // 透传响应头 + 状态 + body（SSE 流和非流都生效）
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.writeHead(upstream.status, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    if (upstream.body) {
      for await (const chunk of upstream.body) {
        res.write(chunk);
      }
    }
    res.end();
    return;
  }

  throw httpError(404, `Unknown API route ${pathname}`);
}

function serveStatic(req, res, pathname) {
  const filePath = safeStaticPath(pathname);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Not found');
    return;
  }
  const type = MIME[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': type.includes('text/html') ? 'no-store' : 'no-cache',
  });
  res.end(readFileSync(filePath));
}

migrate();
if (process.argv.includes('--reset')) {
  resetSeedData();
  console.log(`SQLite reset: ${DB_PATH}`);
  process.exit(0);
}
if (process.argv.includes('--ingest-lore')) {
  migrate();
  ensureSeeded();
  const status = ingestLoreCorpus(LORE_DIR);
  console.log(JSON.stringify(status, null, 2));
  if (EMBEDDING_ENABLED) {
    console.log('[embedding] 开始为新 chunk 计算向量…');
    await reindexLoreEmbeddings({ force: false });
  }
  process.exit(0);
}
if (process.argv.includes('--reindex-lore')) {
  migrate();
  if (!EMBEDDING_ENABLED) {
    console.error('ARK_EMBEDDING_API_KEY 未配置，无法 reindex');
    process.exit(1);
  }
  const force = process.argv.includes('--force');
  const result = await reindexLoreEmbeddings({ force });
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
ensureSeeded();
ensureLoreIndexed();
// server 启动时如果有 chunk 还没 embedding，后台异步补齐（不阻塞启动）
if (EMBEDDING_ENABLED) {
  const pending = db.prepare('SELECT COUNT(*) AS count FROM lore_chunks WHERE embedding IS NULL').get().count;
  if (pending > 0) {
    console.log(`[embedding] 启动时检测到 ${pending} 个 chunk 缺向量，后台异步补齐…`);
    reindexLoreEmbeddings({ force: false }).catch((err) => {
      console.error('[embedding] 后台补齐失败:', err.message);
    });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `localhost:${PORT}`}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (err) {
    sendJson(res, err.status || 500, {
      ok: false,
      error: err.message || 'Internal Server Error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`zelda-station-demo backend running at http://localhost:${PORT}/`);
  console.log(`SQLite: ${DB_PATH}`);
});
