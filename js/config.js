// 地图与精灵的静态配置

const TILE_SIZE = 32;
const MAP_COLS = 20;
const MAP_ROWS = 15;
const CANVAS_W = TILE_SIZE * MAP_COLS;
const CANVAS_H = TILE_SIZE * MAP_ROWS;

const TILES = {
  GRASS:   { color: '#7CB342', walkable: true,  label: '草地' },
  FLOOR:   { color: '#D7CCC8', walkable: true,  label: '地板' },
  WALL:    { color: '#795548', walkable: false, label: '墙' },
  ROAD:    { color: '#BCAAA4', walkable: true,  label: '路' },
  DOOR:    { color: '#FFC107', walkable: true,  label: '门' },
  TREE:    { color: '#33691E', walkable: false, label: '树' },
  TABLE:   { color: '#8D6E63', walkable: false, label: '桌椅' },
  FIRE:    { color: '#FF7043', walkable: false, label: '火炉' },
  COUNTER: { color: '#A1887F', walkable: false, label: '柜台' },
};

// 地图用字符简写，每行 20 列
//  . = GRASS, T = TREE, W = WALL, F = FLOOR, D = DOOR,
//  R = ROAD,  C = COUNTER, t = TABLE, f = FIRE
const RAW_MAP = [
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
];

const CHAR_TO_TILE = {
  '.': 'GRASS',
  'T': 'TREE',
  'W': 'WALL',
  'F': 'FLOOR',
  'D': 'DOOR',
  'R': 'ROAD',
  'C': 'COUNTER',
  't': 'TABLE',
  'f': 'FIRE',
};

// 解析为二维数组，map[y][x] = tile 类型字符串
const MAP = RAW_MAP.map(row =>
  row.split('').map(ch => CHAR_TO_TILE[ch] || 'GRASS')
);

const SPRITES = {
  player:   { color: '#4CAF50', emoji: '🧝', label: '林克' },
  hostess:  { color: '#FF9800', emoji: '👩', label: '惠子' },
  merchant: { color: '#9C27B0', emoji: '🧔', label: '阿福' },
  soldier:  { color: '#2196F3', emoji: '💂', label: '大壮' },
  bard:     { color: '#E91E63', emoji: '🎻', label: '伊莱' },
  ore:      { color: '#9E9E9E', emoji: '🪨', label: '矿石' },
  soup:     { color: '#FF5722', emoji: '🍲', label: '暖暖汤' },
  letter:   { color: '#F9A825', emoji: '✉️', label: '猫头鹰密信' },
};

// 玩家初始模板，重置时使用
const INITIAL_PLAYER = {
  x: 10,
  y: 12,
  facing: 'up',
  hp: 100,
  maxHp: 100,
  inventory: [],
  behaviorTags: [],
  visitCount: 0,
};

const player = { ...INITIAL_PLAYER, inventory: [], behaviorTags: [] };

const INITIAL_WORLD = {
  weather: 'clear',
  timeOfDay: 'evening',
  bloodMoonCountdown: 2,
  caveStatus: 'unexplored',
  recentEvents: [
    '有旅行者报告东边山洞有异响',
    '平原上最近出现了一只白鬃莱尼尔',
    '驿站门口偶尔会有猫头鹰投递带封蜡的密信',
  ],
};

const worldState = {
  ...INITIAL_WORLD,
  recentEvents: [...INITIAL_WORLD.recentEvents],
};

// avatar_url 演 "CT 片范式"：结构化表里只存 ID + URL，附件（SVG/PNG）落文件系统
const npcs = [
  { id: 'hostess',  name: '驿站老板娘·惠子', x: 6,  y: 4, sprite: SPRITES.hostess,  avatar_url: '/public/avatars/hostess.svg'  },
  { id: 'merchant', name: '旅行商人·阿福',   x: 6,  y: 6, sprite: SPRITES.merchant, avatar_url: '/public/avatars/merchant.svg' },
  { id: 'soldier',  name: '驻扎士兵·大壮',   x: 6,  y: 8, sprite: SPRITES.soldier,  avatar_url: '/public/avatars/soldier.svg'  },
  { id: 'bard',     name: '流浪诗人·伊莱',   x: 10, y: 6, sprite: SPRITES.bard,     avatar_url: '/public/avatars/bard.svg'     },
];

const INITIAL_ITEMS = [
  { id: 'soup', name: '暖暖汤', x: 8, y: 4, sprite: SPRITES.soup, type: 'stealable', visible: true },
  { id: 'ore',  name: '矿石',   x: 10, y: 11, sprite: SPRITES.ore,  type: 'pickable',  visible: true },
  { id: 'letter', name: '猫头鹰密信', x: 11, y: 11, sprite: SPRITES.letter, type: 'quest', visible: false },
];

const items = INITIAL_ITEMS.map(it => ({ ...it }));

// 装饰物（不阻挡通行，只是视觉层）
// 顺序：在 tile 之后、NPC 之前绘制
const DECORATIONS = [
  // 中央红色花纹地毯 5×3，跳过圆桌位置 (7,6)
  { type: 'rug', x: 5, y: 5 }, { type: 'rug', x: 6, y: 5 }, { type: 'rug', x: 7, y: 5 }, { type: 'rug', x: 8, y: 5 }, { type: 'rug', x: 9, y: 5 },
  { type: 'rug', x: 5, y: 6 }, { type: 'rug', x: 6, y: 6 },                              { type: 'rug', x: 8, y: 6 }, { type: 'rug', x: 9, y: 6 },
  { type: 'rug', x: 5, y: 7 }, { type: 'rug', x: 6, y: 7 }, { type: 'rug', x: 7, y: 7 }, { type: 'rug', x: 8, y: 7 }, { type: 'rug', x: 9, y: 7 },
  // 门口柱灯
  { type: 'lantern', x: 8,  y: 11 },
  { type: 'lantern', x: 12, y: 11 },
  // 招牌
  { type: 'sign',    x: 13, y: 11 },
  // 火炉旁的木柴堆
  { type: 'logpile', x: 8, y: 8 },
  // 角落木箱
  { type: 'crate', x: 4,  y: 3 },
  { type: 'crate', x: 11, y: 3 },
  { type: 'crate', x: 11, y: 9 },
  // 柜台后面的酒瓶架
  { type: 'bottles', x: 8, y: 5 },
];

// 窗户（叠加在墙 tile 上）
const WINDOWS = [
  { x: 5, y: 2 }, { x: 9, y: 2 },
  { x: 2, y: 5 }, { x: 2, y: 8 },
  { x: 12, y: 5 }, { x: 12, y: 8 },
];

const WINDOWS_SET = new Set(WINDOWS.map(w => `${w.x},${w.y}`));

let currentGeneration = 'gen3'; // 'gen1' | 'gen2' | 'gen3'

// 模式：player（玩家）/ creator（创作者）
let currentMode = 'player';

// 伊莱是否已被"创作者发布"。默认 false —— 主地图看不到、不可交互
let bardPublished = false;
// 用于发布闪光动画
let bardPublishedAt = 0;

// 工具：取某 tile 的类型对象
function getTile(x, y) {
  if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) {
    return TILES.WALL;
  }
  return TILES[MAP[y][x]];
}

function isWalkable(x, y) {
  if (!getTile(x, y).walkable) return false;
  if (npcs.some(n => n.x === x && n.y === y && !(n.id === 'bard' && !bardPublished))) return false;
  // 物品本身不阻挡通行
  return true;
}

// 一步重置（用于重置按钮）
function resetWorld() {
  Object.assign(player, INITIAL_PLAYER);
  player.inventory = [];
  player.behaviorTags = [];

  Object.assign(worldState, INITIAL_WORLD);
  worldState.recentEvents = [...INITIAL_WORLD.recentEvents];

  for (let i = 0; i < items.length; i++) {
    items[i] = { ...INITIAL_ITEMS[i] };
  }

  memory.entries = [];
  memory.summary = '';
}
