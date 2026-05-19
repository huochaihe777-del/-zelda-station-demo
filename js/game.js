// 游戏主循环：渲染 + 输入 + 碰撞 + 交互

const canvas = document.getElementById('game-canvas');
let ctx = canvas.getContext('2d');
const mainCtx = ctx; // 用于 mini canvas 绘制后恢复

let prevPlayerOnDoor = false;

function draw() {
  // 地图：先把每个 tile 类型画细致
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const type = MAP[y][x];
      const px = x * TILE_SIZE, py = y * TILE_SIZE;
      switch (type) {
        case 'GRASS':   drawGrassTile(px, py, x, y); break;
        case 'TREE':    drawTreeTile(px, py, x, y); break;
        case 'WALL':
          drawWallTile(px, py, x, y);
          if (WINDOWS_SET.has(`${x},${y}`)) drawWindowOverlay(px, py);
          break;
        case 'FLOOR':   drawFloorTile(px, py, x, y); break;
        case 'ROAD':    drawRoadTile(px, py, x, y); break;
        case 'DOOR':    drawDoorTile(px, py); break;
        case 'COUNTER': drawCounterTile(px, py); break;
        case 'TABLE':   drawTableTile(px, py); break;
        case 'FIRE':    drawFireTile(px, py); break;
        default:
          ctx.fillStyle = TILES[type]?.color || '#000';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // 装饰物图层（在 tile 之上，NPC/物品之下）
  for (const d of DECORATIONS) {
    drawDecoration(d.type, d.x, d.y);
  }

  // 物品
  for (const it of items) {
    if (!isItemAvailable(it)) continue;
    drawSprite(it.sprite, it.x, it.y);
  }

  // NPC（未发布的 bard 不显示）
  for (const npc of npcs) {
    if (npc.id === 'bard' && !bardPublished) continue;
    drawSprite(npc.sprite, npc.x, npc.y);
  }
  // 发布闪光动画（0.6s 之内）
  if (bardPublished && bardPublishedAt) {
    const dt = Date.now() - bardPublishedAt;
    if (dt < 600) {
      const bard = npcs.find(n => n.id === 'bard');
      if (bard) {
        const r = 8 + dt * 0.08;
        const alpha = 1 - dt / 600;
        ctx.strokeStyle = `rgba(255, 235, 59, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bard.x * TILE_SIZE + 16, bard.y * TILE_SIZE + 14, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 235, 59, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(bard.x * TILE_SIZE + 16, bard.y * TILE_SIZE + 14, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      bardPublishedAt = 0;
    }
  }

  // 玩家 + 朝向指示
  drawSprite(SPRITES.player, player.x, player.y, true);
  drawFacingArrow(player.x, player.y, player.facing);

  // 时段 / 天气遮罩
  drawOverlay();

  // 操作提示：站在可交互目标旁时，画一个高亮框
  drawInteractionHint();
}

function drawSprite(sprite, x, y, isPlayer = false) {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;
  const bob = isPlayer ? 0 : Math.sin((Date.now() / 500) + x * 0.7 + y * 1.3) * 1.0;

  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 28, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (sprite.label) {
    case '林克':     drawCharLink(px, py + bob); break;
    case '惠子':     drawCharHostess(px, py + bob); break;
    case '阿福':     drawCharMerchant(px, py + bob); break;
    case '大壮':     drawCharSoldier(px, py + bob); break;
    case '伊莱':     drawCharBard(px, py + bob); break;
    case '矿石':     drawItemOre(px, py); break;
    case '暖暖汤':   drawItemSoup(px, py); break;
    case '猫头鹰密信': drawItemLetter(px, py); break;
    default:
      // fallback：emoji
      ctx.fillStyle = sprite.color;
      ctx.beginPath();
      ctx.arc(px + 16, py + 14 + bob, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '20px -apple-system, "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sprite.emoji || '?', px + 16, py + 15 + bob);
  }
}

// 像素小人：32×32 内绘制，俯视角
function drawCharLink(px, py) {
  // 帽子（绿尖帽）
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(px + 13, py + 4,  6, 2);
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(px + 12, py + 6,  8, 2);
  ctx.fillRect(px + 10, py + 8,  12, 3);
  // 帽檐阴影
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(px + 10, py + 10, 12, 1);
  // 头发（金）
  ctx.fillStyle = '#FFB300';
  ctx.fillRect(px + 10, py + 11, 12, 1);
  ctx.fillRect(px + 9,  py + 12, 2,  3);
  ctx.fillRect(px + 21, py + 12, 2,  3);
  // 脸
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 11, py + 12, 10, 5);
  // 眼睛
  ctx.fillStyle = '#1A237E';
  ctx.fillRect(px + 13, py + 14, 1, 2);
  ctx.fillRect(px + 18, py + 14, 1, 2);
  // 嘴
  ctx.fillStyle = '#C0392B';
  ctx.fillRect(px + 15, py + 16, 2, 1);
  // 衣领（深绿）
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(px + 12, py + 17, 8, 1);
  // 身体（绿衣）
  ctx.fillStyle = '#43A047';
  ctx.fillRect(px + 10, py + 18, 12, 5);
  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(px + 10, py + 18, 12, 1);  // 顶部高光
  // 手臂
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 8,  py + 19, 2, 4);
  ctx.fillRect(px + 22, py + 19, 2, 4);
  // 腰带
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 10, py + 23, 12, 1);
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 15, py + 23, 2, 1);  // 腰带扣
  // 裤
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 11, py + 24, 4, 3);
  ctx.fillRect(px + 17, py + 24, 4, 3);
  // 靴
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 11, py + 27, 4, 1);
  ctx.fillRect(px + 17, py + 27, 4, 1);
}

function drawCharHostess(px, py) {
  // 头巾（橙）
  ctx.fillStyle = '#BF360C';
  ctx.fillRect(px + 11, py + 6,  10, 1);
  ctx.fillStyle = '#E64A19';
  ctx.fillRect(px + 9,  py + 7,  14, 4);
  // 头巾后摆
  ctx.fillStyle = '#BF360C';
  ctx.fillRect(px + 8,  py + 10, 2, 3);
  ctx.fillRect(px + 22, py + 10, 2, 3);
  // 头发（金，露额前刘海）
  ctx.fillStyle = '#FFB300';
  ctx.fillRect(px + 11, py + 11, 10, 1);
  // 脸
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 11, py + 12, 10, 5);
  // 眼睛
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 13, py + 14, 1, 2);
  ctx.fillRect(px + 18, py + 14, 1, 2);
  // 腮红
  ctx.fillStyle = '#F8BBD0';
  ctx.fillRect(px + 12, py + 15, 1, 1);
  ctx.fillRect(px + 19, py + 15, 1, 1);
  // 嘴
  ctx.fillStyle = '#C2185B';
  ctx.fillRect(px + 15, py + 16, 2, 1);
  // 衬衫（白）
  ctx.fillStyle = '#FFF8E1';
  ctx.fillRect(px + 10, py + 18, 12, 2);
  ctx.fillStyle = '#FFECB3';
  ctx.fillRect(px + 10, py + 18, 12, 1);
  // 围裙（橙）
  ctx.fillStyle = '#FB8C00';
  ctx.fillRect(px + 9,  py + 20, 14, 6);
  ctx.fillStyle = '#FFB300';
  ctx.fillRect(px + 9,  py + 20, 14, 1);  // 高光
  // 围裙带
  ctx.fillStyle = '#E65100';
  ctx.fillRect(px + 14, py + 18, 4, 1);
  ctx.fillRect(px + 14, py + 19, 4, 1);
  // 手
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 8,  py + 20, 2, 4);
  ctx.fillRect(px + 22, py + 20, 2, 4);
  // 鞋
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 11, py + 26, 4, 2);
  ctx.fillRect(px + 17, py + 26, 4, 2);
}

function drawCharMerchant(px, py) {
  // 紫色尖帽
  ctx.fillStyle = '#311B92';
  ctx.fillRect(px + 14, py + 3,  4, 2);
  ctx.fillStyle = '#4A148C';
  ctx.fillRect(px + 13, py + 5,  6, 2);
  ctx.fillRect(px + 11, py + 7,  10, 2);
  ctx.fillStyle = '#6A1B9A';
  ctx.fillRect(px + 9,  py + 9,  14, 2);
  // 帽顶高光
  ctx.fillStyle = '#9575CD';
  ctx.fillRect(px + 14, py + 4,  1, 1);
  // 脸
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 11, py + 11, 10, 5);
  // 眼睛
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 13, py + 13, 1, 2);
  ctx.fillRect(px + 18, py + 13, 1, 2);
  // 鼻
  ctx.fillStyle = '#D7A36E';
  ctx.fillRect(px + 15, py + 14, 2, 1);
  // 大胡子
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 12, py + 15, 8, 1);
  ctx.fillRect(px + 13, py + 16, 6, 1);
  // 长袍（紫）
  ctx.fillStyle = '#7B1FA2';
  ctx.fillRect(px + 9,  py + 17, 14, 9);
  ctx.fillStyle = '#9C27B0';
  ctx.fillRect(px + 9,  py + 17, 14, 1);  // 高光
  // 腰带（金）
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 9,  py + 21, 14, 1);
  ctx.fillStyle = '#FFB300';
  ctx.fillRect(px + 9,  py + 22, 14, 1);
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 15, py + 21, 2, 2);  // 腰扣
  // 钱袋（小细节）
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 20, py + 23, 3, 3);
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 21, py + 24, 1, 1);
  // 手
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 8,  py + 19, 2, 4);
  ctx.fillRect(px + 22, py + 19, 2, 4);
  // 鞋
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 11, py + 26, 4, 2);
  ctx.fillRect(px + 17, py + 26, 4, 2);
}

function drawCharSoldier(px, py) {
  // 红顶羽
  ctx.fillStyle = '#B71C1C';
  ctx.fillRect(px + 14, py + 2,  4, 2);
  ctx.fillStyle = '#E53935';
  ctx.fillRect(px + 15, py + 3,  2, 1);
  // 头盔（银）
  ctx.fillStyle = '#9E9E9E';
  ctx.fillRect(px + 10, py + 4,  12, 7);
  ctx.fillStyle = '#BDBDBD';
  ctx.fillRect(px + 10, py + 4,  12, 1);
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 10, py + 10, 12, 1);
  // 面甲（黑）
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 12, py + 7,  8, 3);
  // 眼缝
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 13, py + 8,  2, 1);
  ctx.fillRect(px + 17, py + 8,  2, 1);
  // 脸下露出（少量）
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 13, py + 11, 6, 2);
  // 抿嘴
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 15, py + 12, 2, 1);
  // 颈托
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 11, py + 13, 10, 2);
  // 盔甲（蓝）
  ctx.fillStyle = '#1565C0';
  ctx.fillRect(px + 10, py + 15, 12, 8);
  ctx.fillStyle = '#42A5F5';
  ctx.fillRect(px + 10, py + 15, 12, 1);  // 高光
  // 胸甲条纹
  ctx.fillStyle = '#0D47A1';
  ctx.fillRect(px + 15, py + 15, 2, 8);
  // 铆钉
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 11, py + 16, 1, 1);
  ctx.fillRect(px + 20, py + 16, 1, 1);
  ctx.fillRect(px + 11, py + 21, 1, 1);
  ctx.fillRect(px + 20, py + 21, 1, 1);
  // 腰带
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 10, py + 23, 12, 1);
  // 剑柄（右腰）
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 24, py + 19, 1, 4);
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 25, py + 20, 1, 2);
  // 手（戴铁手套）
  ctx.fillStyle = '#757575';
  ctx.fillRect(px + 8,  py + 19, 2, 4);
  ctx.fillRect(px + 22, py + 19, 2, 4);
  // 腿（灰）
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 11, py + 24, 4, 3);
  ctx.fillRect(px + 17, py + 24, 4, 3);
  // 靴
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 11, py + 27, 4, 1);
  ctx.fillRect(px + 17, py + 27, 4, 1);
}

function drawCharBard(px, py) {
  // 帽羽（金色，斜插）
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 20, py + 2, 1, 5);
  ctx.fillRect(px + 21, py + 3, 1, 4);
  ctx.fillStyle = '#FFA000';
  ctx.fillRect(px + 21, py + 4, 1, 2);
  // 软帽顶
  ctx.fillStyle = '#880E4F';
  ctx.fillRect(px + 11, py + 5,  10, 1);
  ctx.fillStyle = '#AD1457';
  ctx.fillRect(px + 10, py + 6,  12, 3);
  // 帽宽檐
  ctx.fillStyle = '#6A1B9A';
  ctx.fillRect(px + 8,  py + 9,  16, 2);
  ctx.fillStyle = '#AD1457';
  ctx.fillRect(px + 9,  py + 9,  14, 1);
  // 长发（棕色，飘出两侧）
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 9,  py + 11, 2, 6);
  ctx.fillRect(px + 21, py + 11, 2, 6);
  ctx.fillRect(px + 10, py + 11, 12, 1);
  // 脸
  ctx.fillStyle = '#FFE0B2';
  ctx.fillRect(px + 11, py + 12, 10, 5);
  // 眼睛
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 13, py + 14, 1, 2);
  ctx.fillRect(px + 18, py + 14, 1, 2);
  // 鼻
  ctx.fillStyle = '#D7A36E';
  ctx.fillRect(px + 15, py + 15, 2, 1);
  // 嘴（微笑）
  ctx.fillStyle = '#C2185B';
  ctx.fillRect(px + 14, py + 17, 4, 1);
  // 披风（紫红、飘出肩外）
  ctx.fillStyle = '#880E4F';
  ctx.fillRect(px + 8,  py + 18, 16, 2);
  ctx.fillStyle = '#C2185B';
  ctx.fillRect(px + 8,  py + 19, 16, 1);
  // 内衣（金黄）
  ctx.fillStyle = '#FFB300';
  ctx.fillRect(px + 11, py + 20, 10, 4);
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 11, py + 20, 10, 1);
  // 鲁特琴琴身（怀里抱着）
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 9,  py + 21, 8, 5);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 10, py + 22, 6, 3);
  // 琴音孔
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 12, py + 23, 2, 2);
  // 琴弦（金线）
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 10, py + 21, 1, 5);
  ctx.fillRect(px + 13, py + 21, 1, 5);
  // 琴颈（向右上延伸）
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 17, py + 20, 5, 2);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 17, py + 20, 5, 1);
  // 琴头
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 22, py + 19, 2, 3);
  // 腿
  ctx.fillStyle = '#4E342E';
  ctx.fillRect(px + 12, py + 24, 3, 3);
  ctx.fillRect(px + 17, py + 24, 3, 3);
  // 靴
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 12, py + 27, 3, 1);
  ctx.fillRect(px + 17, py + 27, 3, 1);
}

// ============== 装饰物绘制 ==============

function drawDecoration(type, gx, gy) {
  const px = gx * TILE_SIZE, py = gy * TILE_SIZE;
  switch (type) {
    case 'rug':     drawRug(px, py, gx, gy); break;
    case 'lantern': drawLantern(px, py); break;
    case 'sign':    drawSign(px, py); break;
    case 'logpile': drawLogpile(px, py); break;
    case 'crate':   drawCrate(px, py); break;
    case 'bottles': drawBottles(px, py); break;
  }
}

function drawRug(px, py, gx, gy) {
  // 边缘深红
  ctx.fillStyle = '#8E0000';
  ctx.fillRect(px, py + 2, 32, 28);
  // 内层红
  ctx.fillStyle = '#C62828';
  ctx.fillRect(px, py + 4, 32, 24);
  // 金线滚边
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px, py + 2,  32, 1);
  ctx.fillRect(px, py + 29, 32, 1);
  // 内部花纹（按位置哈希）
  const h = ((gx * 7 + gy * 11) % 4 + 4) % 4;
  ctx.fillStyle = '#FFD54F';
  if (h === 0) {
    // 菱形
    ctx.fillRect(px + 15, py + 13, 2, 6);
    ctx.fillRect(px + 13, py + 15, 6, 2);
  } else if (h === 1) {
    // 大十字
    ctx.fillRect(px + 14, py + 15, 4, 2);
    ctx.fillRect(px + 15, py + 12, 2, 8);
  } else if (h === 2) {
    // 点阵
    ctx.fillRect(px + 7,  py + 14, 2, 2);
    ctx.fillRect(px + 23, py + 14, 2, 2);
    ctx.fillRect(px + 15, py + 8,  2, 2);
    ctx.fillRect(px + 15, py + 21, 2, 2);
  } else {
    // 波纹
    ctx.fillRect(px + 8,  py + 15, 4, 1);
    ctx.fillRect(px + 14, py + 14, 4, 1);
    ctx.fillRect(px + 20, py + 15, 4, 1);
  }
}

function drawLantern(px, py) {
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 29, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 柱子
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 15, py + 14, 2, 14);
  // 柱底座
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 13, py + 27, 6, 2);
  // 灯笼外框
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 10, py + 6,  12, 9);
  // 灯笼罩内
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 11, py + 7,  10, 7);
  // 灯顶
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 12, py + 4,  8, 2);
  ctx.fillRect(px + 14, py + 3,  4, 1);
  // 火光（轻微闪动）
  const f = Math.floor(Math.sin(Date.now() / 180) * 1.5);
  ctx.fillStyle = '#FF6F00';
  ctx.fillRect(px + 13, py + 9 + f, 6, 3);
  ctx.fillStyle = '#FFEB3B';
  ctx.fillRect(px + 14, py + 10 + f, 4, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(px + 15, py + 10 + f, 2, 1);
  // 光晕（夜间更亮）
  const lit = (worldState.timeOfDay === 'night' || worldState.bloodMoonCountdown === 0);
  if (lit) {
    const glow = ctx.createRadialGradient(px + 16, py + 11, 4, px + 16, py + 11, 30);
    glow.addColorStop(0, 'rgba(255, 213, 79, 0.55)');
    glow.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px + 16, py + 11, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSign(px, py) {
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 29, 5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 木桩
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 15, py + 17, 2, 12);
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 15, py + 17, 1, 12);
  // 木牌外框
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 6,  py + 5,  20, 14);
  // 木牌正面
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(px + 7,  py + 6,  18, 12);
  // 木纹
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 7,  py + 11, 18, 1);
  // 钉子
  ctx.fillStyle = '#212121';
  ctx.fillRect(px + 8,  py + 7,  1, 1);
  ctx.fillRect(px + 23, py + 7,  1, 1);
  ctx.fillRect(px + 8,  py + 16, 1, 1);
  ctx.fillRect(px + 23, py + 16, 1, 1);
  // 文字"驿站"
  ctx.fillStyle = '#3E2723';
  ctx.font = 'bold 8px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('驿站', px + 16, py + 12);
}

function drawLogpile(px, py) {
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 27, 12, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 底层 3 根
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 3,  py + 19, 9, 5);
  ctx.fillRect(px + 12, py + 19, 9, 5);
  ctx.fillRect(px + 21, py + 19, 8, 5);
  // 端面纹
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 3,  py + 19, 1, 5);
  ctx.fillRect(px + 12, py + 19, 1, 5);
  ctx.fillRect(px + 21, py + 19, 1, 5);
  ctx.fillRect(px + 28, py + 19, 1, 5);
  // 上层 2 根
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 7,  py + 14, 9, 5);
  ctx.fillRect(px + 16, py + 14, 9, 5);
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 7,  py + 14, 1, 5);
  ctx.fillRect(px + 16, py + 14, 1, 5);
  ctx.fillRect(px + 24, py + 14, 1, 5);
  // 年轮（圆心）
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 5,  py + 21, 2, 1);
  ctx.fillRect(px + 14, py + 21, 2, 1);
  ctx.fillRect(px + 23, py + 21, 2, 1);
  ctx.fillRect(px + 9,  py + 16, 2, 1);
  ctx.fillRect(px + 18, py + 16, 2, 1);
}

function drawCrate(px, py) {
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 28, 11, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 箱体
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 5, py + 8,  22, 20);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 6, py + 9,  20, 18);
  // 顶高光
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(px + 6, py + 9,  20, 1);
  // 木板分割
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 5,  py + 16, 22, 1);
  ctx.fillRect(px + 15, py + 8,  1, 20);
  // 钉子
  ctx.fillStyle = '#212121';
  ctx.fillRect(px + 7,  py + 11, 1, 1);
  ctx.fillRect(px + 24, py + 11, 1, 1);
  ctx.fillRect(px + 7,  py + 14, 1, 1);
  ctx.fillRect(px + 24, py + 14, 1, 1);
  ctx.fillRect(px + 7,  py + 19, 1, 1);
  ctx.fillRect(px + 24, py + 19, 1, 1);
  ctx.fillRect(px + 7,  py + 25, 1, 1);
  ctx.fillRect(px + 24, py + 25, 1, 1);
}

function drawBottles(px, py) {
  // 一排小酒瓶（3 个）
  const colors = ['#388E3C', '#FFA000', '#7B1FA2'];
  for (let i = 0; i < 3; i++) {
    const bx = px + 6 + i * 8;
    const by = py + 12;
    // 瓶颈
    ctx.fillStyle = '#212121';
    ctx.fillRect(bx + 2, by,     2, 2);
    // 瓶身
    ctx.fillStyle = colors[i];
    ctx.fillRect(bx + 1, by + 2, 4, 6);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(bx + 1, by + 3, 1, 4);
    // 阴影底
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(bx, by + 7, 6, 1);
  }
  // 木架托
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 4, py + 20, 24, 2);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 4, py + 20, 24, 1);
}

function drawWindowOverlay(px, py) {
  // 窗框外缘
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px + 5, py + 6, 22, 16);
  // 框内底色
  let glassColor;
  if (worldState.bloodMoonCountdown === 0) glassColor = '#E53935';     // 血月红
  else if (worldState.timeOfDay === 'night') glassColor = '#42A5F5';   // 夜里蓝
  else if (worldState.weather === 'rain') glassColor = '#90A4AE';      // 雨灰
  else glassColor = '#81D4FA';                                          // 日蓝
  ctx.fillStyle = glassColor;
  ctx.fillRect(px + 6, py + 7, 20, 14);
  // 玻璃反光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(px + 7, py + 8, 4, 2);
  ctx.fillRect(px + 17, py + 8, 3, 2);
  // 十字木条
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 6,  py + 13, 20, 1);
  ctx.fillRect(px + 15, py + 7,  1,  14);
  // 窗台
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 4, py + 21, 24, 2);
}

function drawItemOre(px, py) {
  // 石头本体（灰色块）
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 9,  py + 16, 14, 8);
  ctx.fillStyle = '#757575';
  ctx.fillRect(px + 9,  py + 16, 14, 1);  // 顶高光
  ctx.fillStyle = '#424242';
  ctx.fillRect(px + 9,  py + 23, 14, 1);  // 底阴影
  // 不规则边缘
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 11, py + 14, 10, 2);
  ctx.fillRect(px + 13, py + 12, 6,  2);
  // 闪光晶体
  ctx.fillStyle = '#FFF59D';
  ctx.fillRect(px + 14, py + 18, 1, 1);
  ctx.fillRect(px + 18, py + 20, 1, 1);
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 14, py + 17, 1, 1);
}

function drawItemSoup(px, py) {
  // 碗外
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 8,  py + 18, 16, 8);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 8,  py + 18, 16, 1);
  // 汤面（橙红）
  ctx.fillStyle = '#FF7043';
  ctx.fillRect(px + 10, py + 19, 12, 4);
  ctx.fillStyle = '#FF8A65';
  ctx.fillRect(px + 10, py + 19, 12, 1);
  // 配菜
  ctx.fillStyle = '#43A047';
  ctx.fillRect(px + 12, py + 20, 1, 1);
  ctx.fillRect(px + 18, py + 21, 1, 1);
  ctx.fillStyle = '#FFEB3B';
  ctx.fillRect(px + 14, py + 21, 1, 1);
  // 热气
  const w = Math.sin(Date.now() / 200);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(px + 12 + w, py + 14, 1, 3);
  ctx.fillRect(px + 16 - w, py + 12, 1, 4);
  ctx.fillRect(px + 20 + w, py + 14, 1, 3);
}

function drawItemLetter(px, py) {
  // 信封
  ctx.fillStyle = '#FFF8E1';
  ctx.fillRect(px + 8, py + 15, 16, 10);
  ctx.fillStyle = '#E0C68C';
  ctx.fillRect(px + 8, py + 15, 16, 1);
  ctx.fillRect(px + 8, py + 24, 16, 1);
  // 折线
  ctx.strokeStyle = '#B0894F';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 8, py + 15);
  ctx.lineTo(px + 16, py + 21);
  ctx.lineTo(px + 24, py + 15);
  ctx.stroke();
  // 封蜡
  ctx.fillStyle = '#B91C1C';
  ctx.fillRect(px + 15, py + 19, 3, 3);
  ctx.fillStyle = '#FDE68A';
  ctx.fillRect(px + 16, py + 19, 1, 1);
}

// ============== 各 tile 绘制 ==============

function drawGrassTile(px, py, gx, gy) {
  // 双色棋盘基底
  const checker = ((gx + gy) % 2 === 0);
  ctx.fillStyle = checker ? '#8BC34A' : '#85BE45';
  ctx.fillRect(px, py, 32, 32);
  // 草簇 - 确定性 hash 位置
  const h = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
  for (let i = 0; i < 3; i++) {
    const ox = ((h >> (i * 4)) & 0x1f) % 26 + 3;
    const oy = ((h >> (i * 5 + 7)) & 0x1f) % 26 + 3;
    // 深绿小草
    ctx.fillStyle = '#558B2F';
    ctx.fillRect(px + ox,     py + oy + 1, 1, 2);
    ctx.fillRect(px + ox + 1, py + oy,     1, 3);
    ctx.fillRect(px + ox + 2, py + oy + 1, 1, 2);
    // 亮色草尖
    ctx.fillStyle = '#AED581';
    ctx.fillRect(px + ox + 1, py + oy, 1, 1);
  }
  // 偶尔有小花
  if ((h & 0x7f) < 8) {
    const fx = px + ((h >> 11) % 24) + 4;
    const fy = py + ((h >> 17) % 24) + 4;
    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(fx + 1, fy + 1, 1, 1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fx,     fy + 1, 1, 1);
    ctx.fillRect(fx + 2, fy + 1, 1, 1);
    ctx.fillRect(fx + 1, fy,     1, 1);
    ctx.fillRect(fx + 1, fy + 2, 1, 1);
  }
}

function drawTreeTile(px, py, gx, gy) {
  drawGrassTile(px, py, gx, gy);
  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 28, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 树干
  ctx.fillStyle = '#4E342E';
  ctx.fillRect(px + 14, py + 18, 4, 8);
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(px + 14, py + 18, 1, 8);
  // 树冠（三圈叠加）
  ctx.fillStyle = '#1B5E20';
  ctx.beginPath();
  ctx.arc(px + 16, py + 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2E7D32';
  ctx.beginPath();
  ctx.arc(px + 16, py + 12, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#43A047';
  ctx.beginPath();
  ctx.arc(px + 13, py + 10, 7, 0, Math.PI * 2);
  ctx.fill();
  // 高光叶
  ctx.fillStyle = '#A5D6A7';
  ctx.fillRect(px + 10, py + 7, 2, 2);
  ctx.fillRect(px + 13, py + 5, 2, 2);
}

function drawWallTile(px, py, gx, gy) {
  // 石砖墙：错位横砖
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px, py, 32, 32);
  const rowOffset = (gy % 2 === 0) ? 0 : 16;
  // 上半排
  ctx.fillStyle = '#795548';
  ctx.fillRect(px,                  py + 1,  16 - 1, 14);
  ctx.fillRect(px + 16,             py + 1,  16 - 1, 14);
  // 下半排（错位）
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(px - rowOffset,       py + 17, 16 - 1, 14);
  ctx.fillRect(px + 16 - rowOffset,  py + 17, 16 - 1, 14);
  if (rowOffset) {
    ctx.fillRect(px + 32 - rowOffset, py + 17, 16 - 1, 14);
  }
  // 高光顶边 & 阴影底边
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(px, py,      32, 1);
  ctx.fillRect(px, py + 16, 32, 1);
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(px, py + 15, 32, 1);
  ctx.fillRect(px, py + 31, 32, 1);
}

function drawFloorTile(px, py) {
  // 木地板
  ctx.fillStyle = '#D7B98F';
  ctx.fillRect(px, py, 32, 32);
  ctx.fillStyle = '#C2A878';
  ctx.fillRect(px, py + 11, 32, 11);
  // 板缝
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(px, py + 10, 32, 1);
  ctx.fillRect(px, py + 21, 32, 1);
  // 木纹
  ctx.fillStyle = 'rgba(110, 78, 50, 0.35)';
  ctx.fillRect(px + 4,  py + 4,  6, 1);
  ctx.fillRect(px + 14, py + 6,  8, 1);
  ctx.fillRect(px + 26, py + 4,  3, 1);
  ctx.fillRect(px + 2,  py + 15, 5, 1);
  ctx.fillRect(px + 12, py + 17, 12, 1);
  ctx.fillRect(px + 6,  py + 26, 7, 1);
  ctx.fillRect(px + 18, py + 27, 9, 1);
}

function drawRoadTile(px, py, gx, gy) {
  ctx.fillStyle = '#BCAAA4';
  ctx.fillRect(px, py, 32, 32);
  // 鹅卵石
  const h = ((gx * 1103515245) ^ (gy * 12345)) >>> 0;
  for (let i = 0; i < 5; i++) {
    const ox = ((h >> (i * 3)) & 0x1f) % 26 + 3;
    const oy = ((h >> (i * 5 + 3)) & 0x1f) % 26 + 3;
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(px + ox, py + oy, 2, 2);
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(px + ox, py + oy, 1, 1);
  }
}

function drawDoorTile(px, py) {
  // 木门框
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px, py, 32, 32);
  // 门板
  ctx.fillStyle = '#FFC107';
  ctx.fillRect(px + 3, py + 1, 26, 30);
  // 板分割
  ctx.fillStyle = '#FFA000';
  ctx.fillRect(px + 15, py + 1, 2, 30);
  ctx.fillRect(px + 3,  py + 14, 26, 1);
  // 木纹
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(px + 6,  py + 4,  6, 1);
  ctx.fillRect(px + 20, py + 6,  6, 1);
  ctx.fillRect(px + 6,  py + 22, 6, 1);
  ctx.fillRect(px + 20, py + 24, 6, 1);
  // 门把手
  ctx.fillStyle = '#5D4037';
  ctx.beginPath();
  ctx.arc(px + 11, py + 18, 1.5, 0, Math.PI * 2);
  ctx.arc(px + 21, py + 18, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCounterTile(px, py) {
  drawFloorTile(px, py);
  // 柜台主体
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(px + 1, py + 4, 30, 26);
  // 台面
  ctx.fillStyle = '#A1887F';
  ctx.fillRect(px + 1, py + 4, 30, 5);
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(px + 1, py + 9, 30, 1);
  // 抽屉缝
  ctx.fillStyle = '#4E342E';
  ctx.fillRect(px + 15, py + 12, 2, 18);
  // 把手
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(px + 7,  py + 18, 4, 2);
  ctx.fillRect(px + 21, py + 18, 4, 2);
}

function drawTableTile(px, py) {
  drawFloorTile(px, py);
  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 27, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 桌面（圆桌）
  ctx.fillStyle = '#6D4C41';
  ctx.beginPath();
  ctx.arc(px + 16, py + 16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.arc(px + 16, py + 14, 9, 0, Math.PI * 2);
  ctx.fill();
  // 高光
  ctx.fillStyle = '#A1887F';
  ctx.beginPath();
  ctx.arc(px + 12, py + 11, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFireTile(px, py) {
  drawFloorTile(px, py);
  // 火炉石围
  ctx.fillStyle = '#424242';
  ctx.fillRect(px + 4, py + 8, 24, 22);
  ctx.fillStyle = '#616161';
  ctx.fillRect(px + 5, py + 9, 22, 4);  // 顶 lip
  // 石头纹理
  ctx.fillStyle = '#212121';
  ctx.fillRect(px + 11, py + 9,  2, 4);
  ctx.fillRect(px + 19, py + 9,  2, 4);
  // 内炉
  ctx.fillStyle = '#1B1B1B';
  ctx.fillRect(px + 7, py + 14, 18, 14);
  // 火苗
  const flick = Math.sin(Date.now() / 90) * 1.5;
  const flick2 = Math.cos(Date.now() / 70) * 1.5;
  ctx.fillStyle = '#D84315';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 22 + flick, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FF7043';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 21 + flick, 5, 6 + flick2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFC107';
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 20 + flick, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF59D';
  ctx.beginPath();
  ctx.arc(px + 16, py + 19 + flick, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // 柴
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(px + 10, py + 26, 12, 2);
  ctx.fillStyle = '#FF5722';
  ctx.fillRect(px + 14, py + 26, 4, 1);
}

function drawFacingArrow(x, y, facing) {
  const cx = x * TILE_SIZE + 16;
  const cy = y * TILE_SIZE + 14;
  ctx.fillStyle = '#ffeb3b';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (facing === 'up') {
    ctx.moveTo(cx,     cy - 14);
    ctx.lineTo(cx - 4, cy - 10);
    ctx.lineTo(cx + 4, cy - 10);
  } else if (facing === 'down') {
    ctx.moveTo(cx,     cy + 14);
    ctx.lineTo(cx - 4, cy + 10);
    ctx.lineTo(cx + 4, cy + 10);
  } else if (facing === 'left') {
    ctx.moveTo(cx - 14, cy);
    ctx.lineTo(cx - 10, cy - 4);
    ctx.lineTo(cx - 10, cy + 4);
  } else if (facing === 'right') {
    ctx.moveTo(cx + 14, cy);
    ctx.lineTo(cx + 10, cy - 4);
    ctx.lineTo(cx + 10, cy + 4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawOverlay() {
  if (worldState.bloodMoonCountdown === 0) {
    // 血月正夜：饱和红 0.32→0.42
    ctx.fillStyle = 'rgba(178, 30, 30, 0.42)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (worldState.timeOfDay === 'night') {
    // 夜：alpha 0.35→0.55，色相更深更冷
    ctx.fillStyle = 'rgba(8, 14, 38, 0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  } else if (worldState.timeOfDay === 'morning') {
    ctx.fillStyle = 'rgba(255, 213, 130, 0.15)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // 血月将至（==1）：弱红警示，给玩家"明天就是血月"的预兆
  if (worldState.bloodMoonCountdown === 1) {
    ctx.fillStyle = 'rgba(178, 30, 30, 0.14)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  if (worldState.weather === 'rain') {
    // 雨：alpha 0.25→0.32，色相更冷
    ctx.fillStyle = 'rgba(60, 90, 140, 0.32)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // 雨丝：60→180 条、1px→1.5px、alpha 0.5→0.75
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.75)';
    ctx.lineWidth = 1.5;
    const t = Date.now() / 60;
    for (let i = 0; i < 180; i++) {
      const rx = (i * 53 + t) % CANVAS_W;
      const ry = (i * 91 + t * 2) % CANVAS_H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 10);
      ctx.stroke();
    }
  }
}

function drawInteractionHint() {
  const target = getInteractionTarget();
  if (!target) return;
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(target.x * TILE_SIZE + 2, target.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  ctx.setLineDash([]);
  // "按空格" 提示
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(target.x * TILE_SIZE, target.y * TILE_SIZE - 18, TILE_SIZE, 16);
  ctx.fillStyle = '#ffeb3b';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('空格', target.x * TILE_SIZE + TILE_SIZE / 2, target.y * TILE_SIZE - 10);
}

function frontOf(actor) {
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[actor.facing];
  return { x: actor.x + d[0], y: actor.y + d[1] };
}

function getInteractionTarget() {
  const f = frontOf(player);
  const npc = npcs.find(n => n.x === f.x && n.y === f.y);
  if (npc && !(npc.id === 'bard' && !bardPublished)) {
    return { type: 'npc', id: npc.id, x: f.x, y: f.y };
  }
  const frontItem = findAvailableItemAt(f.x, f.y);
  if (frontItem) return { type: 'item', id: frontItem.id, x: f.x, y: f.y };
  const currentItem = findAvailableItemAt(player.x, player.y);
  if (currentItem) return { type: 'item', id: currentItem.id, x: player.x, y: player.y };
  return null;
}

function findAvailableItemAt(x, y) {
  return items.find(i => isItemAvailable(i) && i.x === x && i.y === y);
}

function isItemAvailable(item) {
  if (!item.visible) return false;
  if (item.id === 'letter' && worldState.weather !== 'rain') return false;
  return true;
}

function tryMove(dx, dy) {
  if (dialogueState.open) return;
  const facing = dx === -1 ? 'left' : dx === 1 ? 'right' : dy === -1 ? 'up' : 'down';
  player.facing = facing;

  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!isWalkable(nx, ny)) return;

  player.x = nx;
  player.y = ny;
  if (typeof syncBackendState === 'function') syncBackendState('move');

  // 走到门上时累加 visitCount —— 仅在从非门进入门时计数
  const onDoor = MAP[ny][nx] === 'DOOR';
  if (onDoor && !prevPlayerOnDoor) {
    player.visitCount += 1;
    updatePlayerHud();
  }
  prevPlayerOnDoor = onDoor;
}

function interact() {
  if (dialogueState.open) return;
  const target = getInteractionTarget();
  if (!target) return;

  if (target.type === 'npc') {
    openDialogue(target.id);
    return;
  }

  if (target.type === 'item') {
    const item = items.find(i => i.id === target.id);
    if (!item) return;

    if (item.id === 'soup') {
      player.inventory.push('暖暖汤');
      const newThief = !player.behaviorTags.includes('thief');
      if (newThief) player.behaviorTags.push('thief');
      addMemory('steal', null, '偷取了老板娘柜台上的暖暖汤');
      item.visible = false;
      logWriteBack('偷取暖暖汤', [
        { label: 'player.inventory +=', value: '"暖暖汤"' },
        ...(newThief ? [{ label: 'player.behaviorTags +=', value: '"thief"' }] : []),
        { label: 'memory.entries +=', value: '"偷取了老板娘柜台上的暖暖汤"' },
        { label: 'items.soup.visible =', value: 'false' },
      ]);
    } else if (item.id === 'ore') {
      player.inventory.push('矿石');
      addMemory('pickup', null, '在驿站门口捡到了一块矿石');
      item.visible = false;
      logWriteBack('捡取矿石', [
        { label: 'player.inventory +=', value: '"矿石"' },
        { label: 'memory.entries +=', value: '"在驿站门口捡到了一块矿石"' },
        { label: 'items.ore.visible =', value: 'false' },
      ]);
    } else if (item.id === 'letter') {
      player.inventory.push('猫头鹰密信');
      worldState.caveStatus = 'letter_received';
      if (!worldState.recentEvents.includes('猫头鹰送来一封带魔法部封蜡的禁林来信')) {
        worldState.recentEvents.push('猫头鹰送来一封带魔法部封蜡的禁林来信');
      }
      addMemory('quest_item', null, '在驿站门口捡到一封猫头鹰密信，信里提到禁林、独角兽受伤和通行规矩');
      item.visible = false;
      updateWorldHud();
      logWriteBack('拾取猫头鹰密信', [
        { label: 'player.inventory +=', value: '"猫头鹰密信"' },
        { label: 'worldState.caveStatus =', value: '"letter_received"' },
        { label: 'memory.entries +=', value: '"捡到猫头鹰密信，触发禁林来信任务"' },
        { label: 'items.letter.visible =', value: 'false' },
      ]);
    }
    updatePlayerHud();
    if (typeof syncBackendState === 'function') syncBackendState(`pickup:${item.id}`);
  }
}

// 键盘输入
document.addEventListener('keydown', (e) => {
  // 创作者模式下不响应游戏键盘
  if (currentMode === 'creator') return;

  const k = e.key;
  // 对话框打开时：空格/回车跳过打字；其他按键忽略
  if (dialogueState.open) {
    if (k === ' ' || k === 'Enter') {
      e.preventDefault();
      if (dialogueState.typing) skipTyping();
    }
    return;
  }

  if (k === 'ArrowUp'    || k === 'w' || k === 'W') { e.preventDefault(); tryMove(0, -1); }
  else if (k === 'ArrowDown'  || k === 's' || k === 'S') { e.preventDefault(); tryMove(0,  1); }
  else if (k === 'ArrowLeft'  || k === 'a' || k === 'A') { e.preventDefault(); tryMove(-1, 0); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); tryMove( 1, 0); }
  else if (k === ' ')                                    { e.preventDefault(); interact(); }
  else if (k === 'r' || k === 'R')                       { resetGame(); }
  else if (k === 'e' || k === 'E') {
    alert(`🎒 背包：${player.inventory.length ? player.inventory.join('、') : '空'}\n🏷️ 标签：${player.behaviorTags.length ? player.behaviorTags.join('、') : '无'}`);
  }
});

// 渲染循环
function loop() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', () => {
  prevPlayerOnDoor = MAP[player.y][player.x] === 'DOOR';
  loop();
});
