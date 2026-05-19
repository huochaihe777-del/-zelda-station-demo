// 创作者模式：动作选择器 × 三层数据范式
// 设计原则：编辑器只读 / 默认伊莱未发布 / 不影响玩家模式

// ============== 创作动作（每个动作下三层都不同） ==============

const CREATIVE_ACTIONS = {

  // ─────────── 动作 1：新增 NPC ───────────
  npc: {
    key: 'npc',
    emoji: '➕',
    title: '新增 NPC',
    subtitle: '吟游诗人·伊莱',
    headline: '🎨 新增 NPC：吟游诗人·伊莱 —— 创作者要交付什么？',
    publishLabel: '📤 发布到驿站',
    publishHandler: () => publishBard(),
    layers: {
      gen1: {
        emoji: '📊', big: '5 张表', small: '12 行 INSERT', tag: 'structured',
        chip: '详情：手填字段、文本、条件 —— 每张表都不能漏（平台层已就位）',
        write: () => `
<details class="editor-table-card" open>
  <summary>npc_types（1 行）</summary>
  <pre><span class="kw">INSERT INTO</span> npc_types (type_id, type_name, default_behavior)
<span class="kw">VALUES</span> (<span class="str">'bard'</span>, <span class="str">'吟游诗人'</span>, <span class="str">'sing_dialogue'</span>);</pre>
</details>
<details class="editor-table-card" open>
  <summary>npcs（1 行）</summary>
  <pre><span class="kw">INSERT INTO</span> npcs (npc_id, npc_type, name, location, dialogue_tree_id)
<span class="kw">VALUES</span> (<span class="str">'bard_001'</span>, <span class="str">'bard'</span>, <span class="str">'流浪诗人·伊莱'</span>, <span class="str">'plain_stable'</span>, <span class="str">'dt_bard_001'</span>);</pre>
</details>
<details class="editor-table-card">
  <summary>dialogue_nodes（4 行）</summary>
  <pre><span class="kw">INSERT INTO</span> dialogue_nodes VALUES
  (<span class="str">'dn_default'</span>, <span class="str">'bard_001'</span>, <span class="kw">NULL</span>,         <span class="str">'旅人啊，愿风指引你的路。'</span>),
  (<span class="str">'dn_thief'</span>,   <span class="str">'bard_001'</span>, <span class="str">'cond_thief'</span>,   <span class="str">'一碗暖汤失了踪…'</span>),
  (<span class="str">'dn_helpful'</span>, <span class="str">'bard_001'</span>, <span class="str">'cond_helpful'</span>, <span class="str">'有人守住血月夜…'</span>),
  (<span class="str">'dn_combo'</span>,   <span class="str">'bard_001'</span>, <span class="str">'cond_combo'</span>,   <span class="str">'他曾偷汤惹人恼…'</span>);</pre>
</details>
<details class="editor-table-card">
  <summary>bard_lines（3 行 · 歌谣库）</summary>
  <pre><span class="kw">INSERT INTO</span> bard_lines VALUES
  (<span class="str">'bl_001'</span>, <span class="str">'bard_001'</span>, <span class="str">'cond_blood_moon'</span>, <span class="str">'血月夜里…'</span>),
  (<span class="str">'bl_002'</span>, <span class="str">'bard_001'</span>, <span class="str">'cond_rain_night'</span>, <span class="str">'雨夜风急…'</span>),
  (<span class="str">'bl_003'</span>, <span class="str">'bard_001'</span>, <span class="str">'cond_visit_3+'</span>,   <span class="str">'故人重来…'</span>);</pre>
</details>
<details class="editor-table-card">
  <summary>conditions（4 行 · 触发条件）</summary>
  <pre><span class="kw">INSERT INTO</span> conditions VALUES
  (<span class="str">'cond_thief'</span>,      <span class="str">"player.tags @> '[thief]'"</span>),
  (<span class="str">'cond_helpful'</span>,    <span class="str">"player.tags @> '[helpful]'"</span>),
  (<span class="str">'cond_combo'</span>,      <span class="str">"player.tags @> '[thief,helpful]'"</span>),
  (<span class="str">'cond_blood_moon'</span>, <span class="str">"world.blood_moon = 0"</span>);</pre>
</details>
<div class="warn">⚠️ 想覆盖 32 种组合 → dialogue_nodes / bard_lines 要扩到 32×3 = 96 条</div>`,
      },
      gen2: {
        emoji: '📄', big: '1 份 JSON', small: '~80 行', tag: 'semi-structured',
        chip: '详情：一份 JSON 文档 —— 角色 + 模板 + 知识源都在一个文件里（平台层已就位）',
        write: () => `<pre><span class="cmt">// bard_001.json</span>
<span class="kw">{</span>
  <span class="k">"id"</span>: <span class="str">"bard_001"</span>,
  <span class="k">"type"</span>: <span class="str">"bard"</span>,
  <span class="k">"name"</span>: <span class="str">"流浪诗人·伊莱"</span>,
  <span class="k">"profile"</span>: <span class="kw">{</span>
    <span class="k">"traits"</span>: [<span class="str">"浪漫"</span>, <span class="str">"爱夸张"</span>],
    <span class="k">"speech_style"</span>: <span class="str">"押韵、夸张"</span>
  <span class="kw">}</span>,
  <span class="k">"knowledge_sources"</span>: [<span class="str">"station_rumors"</span>, <span class="str">"world_events"</span>],
  <span class="k">"templates"</span>: [
    <span class="kw">{</span> <span class="k">"cond"</span>: <span class="kw">{</span> <span class="k">"tag"</span>: <span class="str">"thief"</span> <span class="kw">}</span>,
      <span class="k">"text"</span>: <span class="str">"一碗暖汤失了踪，炉火旁边起了风。"</span> <span class="kw">}</span>,
    <span class="kw">{</span> <span class="k">"cond"</span>: <span class="kw">{</span> <span class="k">"tag"</span>: <span class="str">"helpful"</span> <span class="kw">}</span>,
      <span class="k">"text"</span>: <span class="str">"有人守住血月夜，驿站灯火未曾灭。"</span> <span class="kw">}</span>,
    <span class="kw">{</span> <span class="k">"cond"</span>: <span class="kw">{</span> <span class="k">"tags"</span>: [<span class="str">"thief"</span>,<span class="str">"helpful"</span>] <span class="kw">}</span>,
      <span class="k">"text"</span>: <span class="str">"他曾偷汤惹人恼，也曾执剑护灯照。"</span> <span class="kw">}</span>,
    <span class="kw">{</span> <span class="k">"cond"</span>: <span class="kw">{</span><span class="kw">}</span>, <span class="k">"text"</span>: <span class="str">"旅人啊，路过此地…"</span> <span class="kw">}</span>
  ],
  <span class="k">"quest_templates"</span>: [...]
<span class="kw">}</span></pre>
<div class="warn">⚠️ knowledge_sources 写了但运行时只用 cond 匹配 · 多 tag 同时存在仍只命中第一个</div>`,
      },
      gen3: {
        emoji: '📝', big: '1 份 .md', small: '~50 行', tag: 'llm-friendly asset',
        chip: '详情：一份 markdown SKILL —— 角色能力、知识范围、生成边界（平台层已就位）',
        write: () => `<pre style="color:#ddd;line-height:1.7;">
<span class="md-h"># NPC：流浪诗人（伊莱）</span>

<span class="md-h">## 角色定位</span>
- 记录旅行者事迹的流浪诗人
- 把玩家事件改编成歌谣
- 散播驿站传闻
- 提出"收集故事素材"类支线候选

<span class="md-h">## 性格</span>
- 浪漫、爱夸张，把小事讲成史诗
- 复杂事件下不一边倒夸或贬，用诗化语言表达矛盾

<span class="md-h">## 说话风格</span>
- 押韵、带戏剧感
- 偏爱"炉火/风/月/灯/旅人"等意象

<span class="md-h">## 知识范围</span>
- 可访问：驿站传闻 / 世界事件 / 玩家公开行为 / 其他 NPC 公开评价
- 不可访问：玩家私密状态 / 未公开主线 / 其他 NPC 内心

<span class="md-h">## 对待玩家</span>
- thief + 未归还：歌谣里点名"那碗汤"
- thief + 已归还：用赦免感的诗句
- 受伤 + 雨夜：把这一幕写进诗
</pre>
<div class="ok">✓ 创作者写的全部就这一份 · 运行时由平台从 player/memory/world 装配 Context Pack</div>`,
      },
    },
  },

  // ─────────── 动作 2：扩展世界观 ───────────
  worldview: {
    key: 'worldview',
    emoji: '🌍',
    title: '扩展世界观',
    subtitle: '导入一本小说',
    headline: '🌍 扩展世界观：导入《哈利·波特与魔法石》前 3 章 —— 创作者要交付什么？',
    publishLabel: '📤 导入小说',
    publishHandler: () => alert('🌍《哈利·波特》前 3 章已导入。所有 NPC 都能在对话中引用魔法世界的细节（受"不剧透 ch04 之后"约束）。'),
    layers: {
      gen1: {
        emoji: '📚', big: '10+ 张表', small: '几百条 INSERT', tag: 'manual extraction',
        chip: '详情：把章节/人物/势力/事件/关系/物品/主题 全部手工拆解填表（平台层已就位）',
        write: () => `
<details class="editor-table-card" open>
  <summary>chapters / characters / locations（~10 行）</summary>
  <pre><span class="kw">INSERT INTO</span> chapters VALUES
  (<span class="str">'ch01'</span>, <span class="str">'幸存的男孩'</span>,         1),
  (<span class="str">'ch02'</span>, <span class="str">'消失的玻璃'</span>,         2),
  (<span class="str">'ch03'</span>, <span class="str">'许多猫头鹰从天而降'</span>, 3);

<span class="kw">INSERT INTO</span> characters VALUES
  (<span class="str">'c_harry'</span>,      <span class="str">'哈利·波特'</span>,       <span class="str">'wizard'</span>,  <span class="str">'protagonist'</span>),
  (<span class="str">'c_dudley'</span>,     <span class="str">'达力·德思礼'</span>,     <span class="str">'muggle'</span>,  <span class="str">'antagonist'</span>),
  (<span class="str">'c_vernon'</span>,     <span class="str">'弗农·德思礼'</span>,     <span class="str">'muggle'</span>,  <span class="str">'guardian'</span>),
  (<span class="str">'c_dumbledore'</span>, <span class="str">'阿不思·邓布利多'</span>, <span class="str">'wizard'</span>,  <span class="str">'mentor'</span>),
  (<span class="str">'c_hagrid'</span>,     <span class="str">'鲁伯·海格'</span>,       <span class="str">'half-giant'</span>, <span class="str">'guide'</span>),
  (<span class="str">'c_voldemort'</span>,  <span class="str">'伏地魔'</span>,           <span class="str">'wizard'</span>,  <span class="str">'archenemy'</span>);

<span class="kw">INSERT INTO</span> locations VALUES
  (<span class="str">'l_privet_drive'</span>, <span class="str">'女贞路 4 号'</span>, <span class="str">'muggle'</span>),
  (<span class="str">'l_zoo'</span>,          <span class="str">'伦敦动物园'</span>, <span class="str">'muggle'</span>),
  (<span class="str">'l_godric_hollow'</span>, <span class="str">'戈德里克山谷'</span>, <span class="str">'wizard'</span>);</pre>
</details>
<details class="editor-table-card">
  <summary>events / relations / items / themes / dialogue_excerpts（数百行）</summary>
  <pre><span class="kw">INSERT INTO</span> events VALUES
  (<span class="str">'e1'</span>, <span class="str">'ch01'</span>, <span class="str">'邓布利多熄灭路灯，与麦格教授密谈'</span>),
  (<span class="str">'e2'</span>, <span class="str">'ch01'</span>, <span class="str">'海格骑摩托车把婴儿哈利送到女贞路'</span>),
  (<span class="str">'e3'</span>, <span class="str">'ch02'</span>, <span class="str">'哈利在动物园让蟒蛇玻璃消失'</span>),
  (<span class="str">'e4'</span>, <span class="str">'ch03'</span>, <span class="str">'霍格沃茨的录取信如潮水涌入'</span>),
  ...

<span class="kw">INSERT INTO</span> relations VALUES
  (<span class="str">'c_harry'</span>,     <span class="str">'c_dudley'</span>,    <span class="str">'cousin/bullied'</span>),
  (<span class="str">'c_harry'</span>,     <span class="str">'c_vernon'</span>,    <span class="str">'guardian/hostile'</span>),
  (<span class="str">'c_harry'</span>,     <span class="str">'c_voldemort'</span>, <span class="str">'archenemy'</span>),
  (<span class="str">'c_dumbledore'</span>, <span class="str">'c_voldemort'</span>, <span class="str">'opponent'</span>),
  ...

<span class="kw">INSERT INTO</span> items VALUES
  (<span class="str">'it_scar'</span>,     <span class="str">'闪电形伤疤'</span>, <span class="str">'symbol'</span>),
  (<span class="str">'it_letters'</span>,  <span class="str">'霍格沃茨录取信'</span>, <span class="str">'magic'</span>);

<span class="kw">INSERT INTO</span> dialogue_excerpts VALUES
  (<span class="str">'dq_001'</span>, <span class="str">'c_hagrid'</span>, <span class="str">'哈利，你是一个巫师。'</span>),
  ...</pre>
</details>
<div class="warn">⚠️ 文学性、隐喻、伏笔 —— "伤疤""那个连名字都不能提的人""火车从九又四分之三站台离开"，字段表达不了氛围</div>
<div class="warn">⚠️ 7 本书加起来要重复 7 遍 —— 工作量随章节线性增长</div>`,
      },
      gen2: {
        emoji: '📦', big: '1 份大 JSON', small: '~500 行', tag: 'manual annotation',
        chip: '详情：嵌套 JSON —— 章节树 + 人物卡 + 关系图 + 主题（平台层已就位）',
        write: () => `<pre><span class="cmt">// novel_hp_book1_ch01-03.json</span>
<span class="kw">{</span>
  <span class="k">"title"</span>: <span class="str">"哈利·波特与魔法石"</span>,
  <span class="k">"author_style"</span>: <span class="str">"英式幽默 + 童话冒险 + 隐喻"</span>,
  <span class="k">"chapters"</span>: [
    <span class="kw">{</span>
      <span class="k">"id"</span>: <span class="str">"ch01"</span>, <span class="k">"title"</span>: <span class="str">"幸存的男孩"</span>,
      <span class="k">"summary"</span>: <span class="str">"伏地魔倒下当晚，邓布利多把婴儿哈利送到姨妈家…"</span>,
      <span class="k">"events"</span>: [<span class="str">"路灯被熄"</span>, <span class="str">"麦格化作猫等候"</span>, <span class="str">"海格摩托送婴"</span>],
      <span class="k">"characters_present"</span>: [<span class="str">"c_dumbledore"</span>, <span class="str">"c_mcgonagall"</span>, <span class="str">"c_hagrid"</span>],
      <span class="k">"key_quotes"</span>: [<span class="str">"……他们这里的人……"</span>]
    <span class="kw">}</span>, ...
  ],
  <span class="k">"characters"</span>: [
    <span class="kw">{</span>
      <span class="k">"id"</span>: <span class="str">"c_harry"</span>, <span class="k">"name"</span>: <span class="str">"哈利·波特"</span>,
      <span class="k">"appearance"</span>: <span class="str">"瘦小、黑发、绿眼、闪电形伤疤"</span>,
      <span class="k">"backstory"</span>: <span class="str">"父母被伏地魔杀害，寄居姨妈家"</span>,
      <span class="k">"relations"</span>: [
        <span class="kw">{</span> <span class="k">"with"</span>: <span class="str">"c_dudley"</span>,    <span class="k">"type"</span>: <span class="str">"cousin/bullied"</span> <span class="kw">}</span>,
        <span class="kw">{</span> <span class="k">"with"</span>: <span class="str">"c_voldemort"</span>, <span class="k">"type"</span>: <span class="str">"archenemy"</span> <span class="kw">}</span>
      ],
      <span class="k">"knowledge"</span>: [<span class="str">"自己有奇怪能力"</span>, <span class="str">"不知道父母真相"</span>]
    <span class="kw">}</span>, ...
  ],
  <span class="k">"world_setting"</span>: <span class="kw">{</span>
    <span class="k">"era"</span>: <span class="str">"1980s 英国"</span>,
    <span class="k">"magic_secrecy"</span>: <span class="kw">true</span>,
    <span class="k">"muggle_wizard_boundary"</span>: <span class="str">"严格"</span>
  <span class="kw">}</span>,
  <span class="k">"themes"</span>: [<span class="str">"爱与牺牲"</span>, <span class="str">"选择 vs 命运"</span>, <span class="str">"成长"</span>],
  <span class="k">"narrative_arcs"</span>: [...]
<span class="kw">}</span></pre>
<div class="warn">⚠️ 仍要人工标注 / 半自动抽取</div>
<div class="warn">⚠️ "闪电伤疤""那个连名字都不能提的人""九又四分之三站台" 这种伏笔/隐喻 放不进 schema</div>`,
      },
      gen3: {
        emoji: '📖', big: '1 份 .txt + 5 行约束', small: 'upload + ~10 行 md', tag: 'raw + constraints',
        chip: '详情：原文直接上传 + 一份引用规则（平台层已就位：分块/检索/上下文窗口）',
        write: () => `<pre style="color:#ddd;line-height:1.7;">
<span class="md-h"># 世界观资产：哈利·波特宇宙</span>

<span class="md-h">## 来源</span>
- 上传：<span class="str">novels/hp_book1_ch01-03.txt</span>（原文 ~50KB）
- 平台自动：chunk + embedding + 检索召回

<span class="md-h">## 引用约束</span>
- 不剧透 ch04 之后任何内容（霍格沃茨内部、对角巷、九又四分之三站台等还未出现）
- 不"创造"原作没出现的角色 / 事件 / 咒语
- 保持罗琳英式幽默 + 童话冒险感
- 涉及咒语 / 魔法物品时引用原文措辞
- "伏地魔"的名字在原文中被回避，沿用"那个连名字都不能提的人"

<span class="md-h">## 召回策略</span>
- query 时按相关度召回 top-k 片段进 Context Pack
- token 预算：3000 tokens / 次查询

<span class="md-h">## 其他 NPC 怎么用</span>
- 老板娘可以"听说有个额头有伤疤的男孩"
- 商人可以提"有个巨人骑着摩托车送孩子"
- 但都受"不剧透 ch04 之后"约束 —— 不会冒出"霍格沃茨"
</pre>
<div class="ok">✓ 创作者上传原文 + 写 10 行约束 · 不用拆人物 / 事件 / 关系</div>
<div class="ok">✓ 加一章 = 上传新 .txt · 不用重新建模</div>
<div class="ok">✓ 7 本书都上传后，"那个名字"的禁忌随章节自然解除 —— 平台靠原文判断，不靠手填字段</div>`,
      },
    },
  },

  // ─────────── 动作 3：加支线任务 ───────────
  quest: {
    key: 'quest',
    emoji: '⚔️',
    title: '加支线任务',
    subtitle: '收集旅人故事 3 则',
    headline: '⚔️ 加支线任务：收集旅人故事 3 则 —— 创作者要交付什么？',
    publishLabel: '📤 发布任务',
    publishHandler: () => alert('⚔️ 任务已发布。NPC 在对话中触发对应 effect 时，玩家可接受该任务。'),
    layers: {
      gen1: {
        emoji: '⚙️', big: '3 张表', small: '~20 行 INSERT', tag: 'structured',
        chip: '详情：quest 主表 + quest_steps + quest_rewards（平台层已就位）',
        write: () => `
<details class="editor-table-card" open>
  <summary>quests（1 行）</summary>
  <pre><span class="kw">INSERT INTO</span> quests (id, name, npc_id, type, trigger_id)
<span class="kw">VALUES</span> (<span class="str">'q_collect_stories'</span>, <span class="str">'收集旅人故事'</span>, <span class="str">'bard_001'</span>,
        <span class="str">'collect'</span>, <span class="str">'after_propose'</span>);</pre>
</details>
<details class="editor-table-card" open>
  <summary>quest_steps（3 行）</summary>
  <pre><span class="kw">INSERT INTO</span> quest_steps VALUES
  (<span class="str">'qs_001'</span>, <span class="str">'q_collect_stories'</span>, 1, <span class="str">'找第一位旅人讲述故事'</span>, <span class="str">'rumor_count >= 1'</span>),
  (<span class="str">'qs_002'</span>, <span class="str">'q_collect_stories'</span>, 2, <span class="str">'找第二位旅人'</span>,         <span class="str">'rumor_count >= 2'</span>),
  (<span class="str">'qs_003'</span>, <span class="str">'q_collect_stories'</span>, 3, <span class="str">'回到伊莱处复命'</span>,     <span class="str">'rumor_count >= 3'</span>);</pre>
</details>
<details class="editor-table-card" open>
  <summary>quest_rewards（2 行）</summary>
  <pre><span class="kw">INSERT INTO</span> quest_rewards VALUES
  (<span class="str">'q_collect_stories'</span>, <span class="str">'item'</span>,       <span class="str">'bard_lute'</span>),
  (<span class="str">'q_collect_stories'</span>, <span class="str">'reputation'</span>, <span class="str">'bard:+10'</span>);</pre>
</details>
<div class="warn">⚠️ "故事独特性"无法用字段表达 → 实际验收只能按字符串非空判断</div>`,
      },
      gen2: {
        emoji: '📄', big: '1 份 JSON', small: '~40 行', tag: 'semi-structured',
        chip: '详情：一份 quest.json —— 触发器 / 目标 / 分支 / 验收条件（平台层已就位）',
        write: () => `<pre><span class="cmt">// quest_collect_stories.json</span>
<span class="kw">{</span>
  <span class="k">"id"</span>: <span class="str">"q_collect_stories"</span>,
  <span class="k">"name"</span>: <span class="str">"收集旅人故事"</span>,
  <span class="k">"npc"</span>: <span class="str">"bard_001"</span>,
  <span class="k">"trigger"</span>: <span class="kw">{</span>
    <span class="k">"after_dialogue_effect"</span>: <span class="str">"propose_quest_collect_stories"</span>
  <span class="kw">}</span>,
  <span class="k">"objectives"</span>: [
    <span class="kw">{</span> <span class="k">"type"</span>: <span class="str">"collect"</span>,
      <span class="k">"target"</span>: <span class="str">"rumor"</span>,
      <span class="k">"count"</span>: <span class="num">3</span>,
      <span class="k">"from"</span>: <span class="str">"different_travelers"</span>
    <span class="kw">}</span>
  ],
  <span class="k">"branches"</span>: [
    <span class="kw">{</span> <span class="k">"if"</span>: <span class="str">"all_3_completed"</span>, <span class="k">"reward"</span>: <span class="str">"bard_lute"</span> <span class="kw">}</span>,
    <span class="kw">{</span> <span class="k">"if"</span>: <span class="str">"skipped"</span>,        <span class="k">"reward"</span>: <span class="kw">null</span> <span class="kw">}</span>
  ],
  <span class="k">"validation"</span>: <span class="kw">{</span>
    <span class="k">"rumors_must_differ"</span>: <span class="kw">true</span>,
    <span class="k">"min_quality"</span>: <span class="str">"non_empty"</span>
  <span class="kw">}</span>
<span class="kw">}</span></pre>
<div class="warn">⚠️ "故事独特性"仍靠规则 —— 字符串去重而非语义去重</div>`,
      },
      gen3: {
        emoji: '📝', big: '~15 行 .md', small: '描述 + 验收意图', tag: 'agent-validated',
        chip: '详情：用语言描述任务意图 + 验收原则 —— Agent 自己判断（平台层已就位）',
        write: () => `<pre style="color:#ddd;line-height:1.7;">
<span class="md-h"># Quest：收集旅人故事 3 则</span>

<span class="md-h">## 触发</span>
玩家与伊莱对话时由 SKILL 主动提出
（effect: propose_quest_collect_stories）

<span class="md-h">## 目标</span>
让玩家把 3 个不同旅人的见闻带回来给伊莱

<span class="md-h">## 验收</span>
- 来自 3 个不同 NPC 的公开评价
- 内容必须"足够独特" —— 由 Agent 判定，
  不是字段匹配（避免玩家用 3 个"早安"过关）
- 复述 = 不算

<span class="md-h">## 失败处理</span>
- 玩家直接拒绝 → 任务取消，伊莱不再主动提
- 中途切换 → 保留进度
</pre>
<div class="ok">✓ "故事独特性"由 Agent 语义判断 · 不再被字段表达力限制</div>
<div class="ok">✓ 改一句意图，验收逻辑就跟着变 · 不用改字段 schema</div>`,
      },
    },
  },

};

// ============== 运行态：9 套草稿（action × layer） ==============
// 每套展示玩家碰到 / 系统消费数据时跑的代码 / 流程

const RUNTIME_VIEWS = {
  // ───── 新增 NPC ─────
  npc: {
    gen1: () => `<pre><span class="q-comment">-- 玩家走到伊莱前 + 按空格 → 查表</span>
<span class="q-kw">SELECT</span> text
  <span class="q-kw">FROM</span>   dialogue_nodes
  <span class="q-kw">WHERE</span>  npc_id = <span class="q-string">'bard_001'</span>
  <span class="q-kw">LIMIT</span>  1;

<span class="q-comment">-- 返回值：永远是固定文本
-- 玩家 HP / 记忆 / 世界状态 全不影响查询</span></pre>`,
    gen2: () => `<pre><span class="q-comment">// 加载 NPC profile，按 cond 顺序匹配</span>
<span class="q-kw">const</span> profile = loadJSON(<span class="q-string">'bard_001.json'</span>);

<span class="q-kw">for</span> (<span class="q-kw">const</span> t <span class="q-kw">of</span> profile.templates) {
  <span class="q-kw">if</span> (matchCondition(t.cond, { player, world })) {
    <span class="q-kw">return</span> t.text;           <span class="q-comment">// ← 命中即停</span>
  }
}

<span class="q-comment">// state 里同时活跃的其他条件被丢弃
// personality 字段虽然存了，运行时不读</span></pre>`,
    gen3: () => `<pre><span class="q-comment">// 1. 装配 Context Pack（系统级）</span>
<span class="q-kw">const</span> system = [
  read(<span class="q-string">'skill_bard.md'</span>),     <span class="q-comment">// 性格 / 风格 / 边界</span>
  format(world_state),       <span class="q-comment">// 雨/夜/血月/事件</span>
  loadConstraints(),         <span class="q-comment">// 不剧透 / 不滥发奖励</span>
].join(<span class="q-string">'\\n\\n'</span>);

<span class="q-kw">const</span> user = [
  format(player_state),      <span class="q-comment">// HP/背包/tags/来访</span>
  recent(memory, <span class="q-num">10</span>),        <span class="q-comment">// 最近 10 条记忆</span>
  npc_public_rumors(),       <span class="q-comment">// 其他 NPC 公开评价</span>
].join(<span class="q-string">'\\n\\n'</span>);

<span class="q-comment">// 2. 一次推理 → JSON</span>
<span class="q-kw">const</span> r = <span class="q-kw">await</span> LLM.complete({ system, user });

<span class="q-comment">// 3. 写回</span>
memory.append(r.memory_note);
<span class="q-comment">// → 玩家所有信号融合 · 输出新记忆</span></pre>`,
  },

  // ───── 扩展世界观 ─────
  worldview: {
    gen1: () => `<pre><span class="q-comment">-- NPC 想引用世界观 → JOIN 拼字符串</span>
<span class="q-kw">SELECT</span> ch.title, c.name, e.summary
  <span class="q-kw">FROM</span>   chapters ch
  <span class="q-kw">JOIN</span>   events e   <span class="q-kw">ON</span> e.chapter_id = ch.id
  <span class="q-kw">JOIN</span>   characters c <span class="q-kw">ON</span> ...
 <span class="q-kw">WHERE</span>  c.id = <span class="q-string">'c_harry'</span>;

<span class="q-comment">-- 只能拿到字段值，氛围 / 隐喻 拼不出
-- 原文"那个连名字都不能提的人" 在这变成
-- 死字段：character_id = 'c_voldemort'</span></pre>`,
    gen2: () => `<pre><span class="q-kw">const</span> novel = loadJSON(<span class="q-string">'hp_book1.json'</span>);

<span class="q-comment">// 按 NPC 的 knowledge_sources 取相关章节 / 人物</span>
<span class="q-kw">const</span> ch = novel.chapters.find(c => c.id === <span class="q-string">'ch01'</span>);
<span class="q-kw">const</span> chars = ch.characters_present.map(id =>
  novel.characters.find(c => c.id === id)
);

<span class="q-comment">// 拼成 NPC 可用片段</span>
<span class="q-kw">const</span> blob = <span class="q-string">\`\${ch.summary} 涉及 \${chars.map(c => c.name).join('、')}…\`</span>;

<span class="q-comment">// 仍是字段拼装 · 留白和伏笔无法体现</span></pre>`,
    gen3: () => `<pre><span class="q-comment">// NPC 想引用世界观 → 用自然语言 query</span>
<span class="q-kw">const</span> query = <span class="q-string">'一个额头有伤疤的男孩'</span>;

<span class="q-comment">// 平台自动 embedding 检索 top-k 片段</span>
<span class="q-kw">const</span> chunks = <span class="q-kw">await</span> retrieve(<span class="q-string">'hp_book1.txt'</span>, query, {
  topK: <span class="q-num">5</span>,
  filter: <span class="q-string">'ch ≤ current_unlocked_chapter'</span>,
});

<span class="q-kw">const</span> system = [
  loadConstraints(<span class="q-string">'hp_constraints.md'</span>),  <span class="q-comment">// 不剧透 ch04+</span>
  ...chunks.map(c => c.text),
].join(<span class="q-string">'\\n\\n'</span>);

<span class="q-kw">const</span> r = <span class="q-kw">await</span> LLM.complete({ system, user });
<span class="q-comment">// → 模型理解氛围、留白、伏笔
// → "那个名字"禁忌随章节解锁自然解除</span></pre>`,
  },

  // ───── 加支线任务 ─────
  quest: {
    gen1: () => `<pre><span class="q-comment">-- 玩家完成第一步 → 累加 progress</span>
<span class="q-kw">UPDATE</span> quest_progress
   <span class="q-kw">SET</span> step_idx = step_idx + 1
 <span class="q-kw">WHERE</span> player_id = $1
   <span class="q-kw">AND</span> quest_id  = <span class="q-string">'q_collect_stories'</span>;

<span class="q-comment">-- 检查 objectives 是否满足</span>
<span class="q-kw">SELECT COUNT(*)</span> <span class="q-kw">FROM</span> rumor_collected
 <span class="q-kw">WHERE</span> quest_id = <span class="q-string">'q_collect_stories'</span> <span class="q-kw">AND</span> player_id = $1;

<span class="q-comment">-- IF count >= 3 → 触发 reward</span>
<span class="q-kw">INSERT INTO</span> inventory (player_id, item)
<span class="q-kw">SELECT</span> $1, value <span class="q-kw">FROM</span> quest_rewards <span class="q-kw">WHERE</span> ...;

<span class="q-comment">-- ✓ 字段判等 · 确定性强
-- ✗ "故事独特性" 无法表达</span></pre>`,
    gen2: () => `<pre><span class="q-kw">const</span> quest = loadJSON(<span class="q-string">'q_collect_stories.json'</span>);

<span class="q-kw">for</span> (<span class="q-kw">const</span> o <span class="q-kw">of</span> quest.objectives) {
  <span class="q-kw">if</span> (o.type === <span class="q-string">'collect'</span>) {
    <span class="q-kw">const</span> collected = playerRumors(o.target);
    <span class="q-kw">if</span> (collected.length &gt;= o.count) {
      <span class="q-comment">// 字符串去重</span>
      <span class="q-kw">const</span> uniq = uniqBy(collected, r => r.text);
      <span class="q-kw">if</span> (uniq.length &gt;= o.count) {
        grantReward(quest.branches[<span class="q-num">0</span>].reward);
      }
    }
  }
}

<span class="q-comment">// ⚠️ "独特性"靠字符串去重
// 玩家可用 3 个"早安"过关</span></pre>`,
    gen3: () => `<pre><span class="q-comment">// 玩家提交 3 个故事 → 交给 Agent 判定独特性</span>
<span class="q-kw">const</span> verdict = <span class="q-kw">await</span> LLM.judge({
  task: read(<span class="q-string">'q_collect_stories.md'</span>),  <span class="q-comment">// 任务意图 + 验收原则</span>
  submissions: playerRumors(),
  question: <span class="q-string">'这 3 个故事是否「足够独特」？'</span>,
});

<span class="q-kw">if</span> (verdict.passed) {
  <span class="q-comment">// 发奖回结构化层（事务 / 库存仍由 SQL 兜底）</span>
  <span class="q-kw">await</span> grantReward(quest.reward);
}

<span class="q-comment">// ✓ 验收逻辑由 LLM 语义判定
// ✓ 改一句"意图.md" = 改验收
// ✓ 但发奖动作仍走结构化层 —— 钱由 SQL 管</span></pre>`,
  },
};

// ============== 复用 game.js 把驿站画到 mini canvas ==============

function renderStationMockup(canvasId, opts = {}) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const pctx = c.getContext('2d');
  pctx.clearRect(0, 0, c.width, c.height);
  pctx.imageSmoothingEnabled = false;

  const scale = c.width / CANVAS_W;
  ctx = pctx;
  pctx.save();
  pctx.scale(scale, scale);
  try {
    // tiles
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
          case 'FLOOR':   drawFloorTile(px, py); break;
          case 'ROAD':    drawRoadTile(px, py, x, y); break;
          case 'DOOR':    drawDoorTile(px, py); break;
          case 'COUNTER': drawCounterTile(px, py); break;
          case 'TABLE':   drawTableTile(px, py); break;
          case 'FIRE':    drawFireTile(px, py); break;
          default:
            pctx.fillStyle = TILES[type]?.color || '#000';
            pctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    // 装饰
    if (opts.decorations !== false) {
      for (const d of DECORATIONS) drawDecoration(d.type, d.x, d.y);
    }
    // NPC
    if (opts.includeNPCs) {
      for (const n of npcs) {
        if (n.id === 'bard' && !opts.includeBard) continue;
        drawSprite(n.sprite, n.x, n.y);
      }
    }
    // 物品
    if (opts.includeItems) {
      for (const it of items) {
        const forceLetter = opts.showLetter && it.id === 'letter';
        if (it.visible || forceLetter) drawSprite(it.sprite, it.x, it.y);
      }
    }
    if (opts.rain) {
      pctx.strokeStyle = 'rgba(120, 190, 255, 0.55)';
      pctx.lineWidth = 1.5;
      for (let i = 0; i < 42; i++) {
        const x = (i * 47) % CANVAS_W;
        const y = (i * 83) % CANVAS_H;
        pctx.beginPath();
        pctx.moveTo(x, y);
        pctx.lineTo(x - 7, y + 18);
        pctx.stroke();
      }
    }
  } finally {
    pctx.restore();
    ctx = mainCtx;
  }
}

// ============== 能力栈（12 项 · 每个 step 状态不同） ==============

const CAPABILITIES = [
  // 结构化层（硬数据 / 不能交给 AI）
  { key: 'sql',      icon: '🗄️', name: '结构化 (MySQL)',   group: 'structured', desc: '账号 / 库存 / 金币 / 任务 / 支付 · 事务 + ACID' },
  { key: 'redis',    icon: '🚀', name: '缓存 (Redis)',     group: 'structured', desc: '会话 / 在线状态 / 限流 / 短期缓存' },
  // 灵活存储层（非结构化 + 半结构化 + 全文检索 + 图关系）
  { key: 's3',       icon: '🖼️', name: '对象存储 (S3)',    group: 'flexible', desc: '贴图 / 音频 / 视频 / 原始文件' },
  { key: 'docstore', icon: '📄', name: '文档存储 (Mongo)', group: 'flexible', desc: '场景 JSON / NPC 档案 / 草稿' },
  { key: 'es',       icon: '🔍', name: '全文搜索 (ES)',    group: 'flexible', desc: '关键词 / 标签 / 可控检索' },
  { key: 'graph',    icon: '🕸️', name: '图数据库 (Neo4j)', group: 'flexible', desc: '关系拓扑 · 角色/地点/事件网络（非 AI 也用）' },
  // 语义理解层（AI 友好 · 叠加层 · 不替代下面）
  { key: 'agent',    icon: '🤖', name: 'Agent (LLM)',     group: 'semantic', desc: '生成 / 推理 / 对话 / 归纳' },
  { key: 'skill',    icon: '📋', name: 'SKILL 指令层',     group: 'semantic', desc: '角色性格 / 知识边界 / 规则' },
  { key: 'memory',   icon: '🧠', name: '记忆引擎',         group: 'semantic', desc: '长期记忆 / 事件归纳' },
  { key: 'vector',   icon: '🧲', name: '向量检索 (Milvus)', group: 'semantic', desc: 'embedding 由模型产生 · AI-native 存储' },
  { key: 'multim',   icon: '👁️', name: '多模态理解',       group: 'semantic', desc: '图像 / 音频 / 视频语义' },
  { key: 'safety',   icon: '🛡️', name: '校验 / 安全 / 治理', group: 'semantic', desc: '幻觉 / 越界 / 一致性' },
];

// 每个 step 下"已激活"的能力 key 列表
const STEP_CAPS = {
  structured: { active: ['sql','redis','s3'],                                                              newKeys: ['sql','redis','s3'] },
  flexible:   { active: ['sql','redis','s3','docstore','es','graph'],                                      newKeys: ['docstore','es','graph'] },
  semantic:   { active: ['sql','redis','s3','docstore','es','graph','agent','skill','memory','vector','multim','safety'], newKeys: ['agent','skill','memory','vector','multim','safety'] },
};

function renderCapabilityStack() {
  const el = document.getElementById('creator-capability-stack');
  if (!el) return;
  const stepCaps = STEP_CAPS[currentProjectStep] || { active: [], newKeys: [] };
  const activeSet = new Set(stepCaps.active);
  const newSet    = new Set(stepCaps.newKeys);

  const renderItem = (c) => {
    const isOn  = activeSet.has(c.key);
    const isNew = newSet.has(c.key);
    let cls = 'cap-item ' + (isOn ? (isNew ? 'cap-new cap-on' : 'cap-on') : 'cap-off');
    const mark = isOn ? '✓' : '·';
    const newBadge = isNew ? '<span class="cap-new-badge">NEW</span>' : '';
    return `
      <li class="${cls}" title="${c.desc || ''}">
        <span class="cap-icon">${c.icon}</span>
        <span class="cap-name">${c.name}</span>
        <span class="cap-mark">${mark}</span>
        ${newBadge}
      </li>`;
  };

  const structItems = CAPABILITIES.filter(c => c.group === 'structured').map(renderItem).join('');
  const flexItems   = CAPABILITIES.filter(c => c.group === 'flexible').map(renderItem).join('');
  const semItems    = CAPABILITIES.filter(c => c.group === 'semantic').map(renderItem).join('');

  el.innerHTML = `
    <div class="cap-header">
      <span class="cap-title">能力栈</span>
      <span class="cap-counter">${stepCaps.active.length} / ${CAPABILITIES.length}</span>
    </div>

    <div class="cap-group cap-group-structured">
      <div class="cap-group-title">🗄️ 结构化层<span class="cap-group-sub">硬状态 · 高频读写 · 永远在跑</span></div>
      <ul class="cap-list">${structItems}</ul>
    </div>

    <div class="cap-group cap-group-flexible">
      <div class="cap-group-title">📦 半结构化 / 文件层<span class="cap-group-sub">JSON 配置 · 原始文件 · 全文检索</span></div>
      <ul class="cap-list">${flexItems}</ul>
    </div>

    <div class="cap-group cap-group-semantic">
      <div class="cap-group-title">⭐ 模型友好存储<span class="cap-group-sub">Vector · Memory · Skill · Agent</span></div>
      <ul class="cap-list">${semItems}</ul>
    </div>

    <div class="cap-footer">
      钱 / 库存 / 进度 / 权限 / 支付 —— <b>永远在结构化层</b><br>
      模型友好层负责<b>"理解、生成、归纳、推理"</b>，不接管硬数据
    </div>
  `;
}

// ============== 项目演进时间线（主框架） ==============

const PROJECT_STEPS = [
  {
    key: 'structured',
    num: 1,
    icon: '🗄️',
    label: '只有结构化层',
    layerChip: '🗄️ MySQL（+ Redis 缓存 / S3 头像 作为基础设施）',
    infraNote: '同一款游戏「塞尔达驿站」—— 看每加一层数据能力，玩家看到的产物会变成什么样。',
    haveTitle: '📂 数据库里有什么',
    seeTitle: '🎮 玩家能玩到什么',
    tables: [
      { name: 'users', count: '1,024 行 · 账号',
        sample: {
          cols: ['id', 'email', 'name'],
          rows: [
            ['u_001', 'link@hyrule.io',  '林克'],
            ['u_002', 'zelda@hyrule.io', '塞尔达'],
            ['…',     '…',                '…'],
          ],
        },
      },
      { name: 'scenes', count: '1 个 · plain_stable',
        sample: {
          cols: ['scene_id', 'name', 'width', 'height'],
          rows: [
            ['plain_stable', '草原驿站', '20', '15'],
          ],
        },
      },
      { name: 'tile_map', count: '20 × 15 = 300 格',
        sample: {
          cols: ['scene_id', 'x', 'y', 'tile'],
          rows: [
            ['plain_stable', '0',  '0',  'TREE'],
            ['plain_stable', '5',  '4',  'FLOOR'],
            ['plain_stable', '10', '10', 'DOOR'],
            ['…', '…', '…', '…'],
          ],
        },
      },
      { name: 'npcs', count: '4 个 · 老板娘 / 商人 / 士兵 / 伊莱',
        sample: {
          cols: ['id', 'name', 'x', 'y'],
          rows: [
            ['hostess',  '驿站老板娘',  '6',  '4'],
            ['merchant', '旅行商人',    '6',  '6'],
            ['soldier',  '驻扎士兵',    '6',  '8'],
            ['bard',     '流浪诗人·伊莱','10', '6'],
          ],
        },
      },
      { name: 'dialogue_nodes', count: '4 条固定对话',
        sample: {
          cols: ['id', 'npc_id', 'cond', 'text'],
          rows: [
            ['dn_default', 'bard', 'NULL',       '旅人啊，愿风指引你的路。'],
            ['dn_thief',   'bard', 'tag=thief',  '一碗暖汤失了踪…'],
            ['dn_helpful', 'bard', 'tag=helpful','有人守住血月夜…'],
            ['…',          '…',    '…',          '…'],
          ],
        },
      },
      { name: 'items', count: '玩家背包 + HP / 金币',
        sample: {
          cols: ['user_id', 'item', 'qty'],
          rows: [
            ['u_001', 'soup',   '1'],
            ['u_001', 'rupee',  '120'],
            ['…',     '…',      '…'],
          ],
        },
      },
      { name: 'redis://session:*', count: '🚀 缓存 · ~3000 活跃 token',
        sample: {
          cols: ['key', 'value', 'TTL'],
          rows: [
            ['session:u_001', '{uid:"u_001"}', '7 天'],
            ['ratelimit:u_002', '3', '60 秒'],
            ['…', '…', '…'],
          ],
        },
      },
      { name: 's3://avatars', count: '🖼️ 玩家头像 · ~1024 张',
        sample: {
          cols: ['key', 'size'],
          rows: [
            ['avatars/u_001.png', '12 KB'],
            ['avatars/u_002.png', '18 KB'],
            ['…', '…'],
          ],
        },
      },
    ],
    can: [
      '✓ 玩家能注册 / 登录 / 走动',
      '✓ NPC 站在固定位置，可触发固定对话',
      '✓ 背包 / HP / 金币（事务、外键、ACID）',
      '✓ 商业化（订阅 / 支付 / 积分）',
    ],
    mockType: 'station',
    mockOpts: { includeNPCs: true, includeBard: false, includeItems: false },
    mockLabel: '规则驱动的驿站：地图、NPC、任务、交易、状态都能稳定运行，但内容扩展主要依赖人工建表和配置',
    cantGroups: [
      { label: '⚠️ 但用来承载"创作内容"和"高频变化的内容配置"时，成本会快速升高', points: [
        '<b>🗂️ 新玩法 / 新字段</b>：需要 <code>ALTER TABLE</code>、数据迁移、兼容旧数据',
        '<b>🌪️ 多状态内容</b>：天气 × 时间 × NPC 状态 × 任务进度，对话和配置容易膨胀',
        '<b>📦 大文件内容</b>：图片 / 音频 / 视频 / PDF / 小说，不适合直接塞进表',
        '<b>💬 语义表达</b>：能存"嘴硬心软"这个字段，但系统不会理解性格，也不会自动生成符合性格的对话',
      ]},
    ],
    keyTakeaway: '<b>结构化层不是"只能做简单游戏"，而是更适合承载确定性运行数据。</b><br>它能让游戏稳定跑起来，但不适合承载高频变化的创作内容、海量素材和语义理解。',
    transition: {
      title: '🔴 结构化层撑不住这些事',
      reasons: [
        '<b>schema 死板</b>：加一种新资产 = <code>ALTER TABLE</code>，迭代成本高',
        '<b>组合爆炸</b>：N 个条件 → 模板要写 N! 行，运维就崩了',
        '<b>大文件代价</b>：图/音/视频塞 BLOB → 表臃肿、备份慢、查询拖累',
      ],
      next: '<b>→ 因此需要：</b> 📦 MongoDB（JSON 文档存灵活字段）+ 🖼️ S3 升级（资产搬出来打标签）+ 🔍 ES（标签 / 关键词检索）',
    },
    nextHint: '加入灵活存储层',
    ready: true,
  },
  {
    key: 'flexible',
    num: 2,
    icon: '📦',
    label: '+ 灵活存储',
    layerChip: '+ 📦 MongoDB · 🖼️ S3 资产化 · 🔍 ES',
    infraNote: '上一层 MySQL / Redis / S3-头像 全部继续在跑，只是再叠加一层"装得更灵活"的存储。',
    haveTitle: '📂 在上一层基础上多了什么',
    seeTitle: '🎮 玩家能玩到什么',
    tables: [
      { name: 'npc_profiles', count: '📦 MongoDB · 角色档案 + 模板分支',
        sample: {
          cols: ['_id', 'profile (JSON)'],
          rows: [
            ['bard_001',    '{ traits:["浪漫","爱夸张"], templates:[{cond:"thief",text:"一碗暖汤失了踪…"}, ...] }'],
            ['hostess_001', '{ traits:["热情","嘴硬心软"], templates:[...] }'],
            ['…', '…'],
          ],
        },
      },
      { name: 's3://assets', count: '🖼️ 12 张贴图 · 8 个音效（不再塞 BLOB）',
        sample: {
          cols: ['key', 'size', 'content_type'],
          rows: [
            ['bard.png',    '28 KB',  'image/png'],
            ['hostess.png', '32 KB',  'image/png'],
            ['rain.wav',    '180 KB', 'audio/wav'],
            ['…', '…', '…'],
          ],
        },
      },
      { name: 'asset_tags', count: '🏷️ wood / stone / grass...',
        sample: {
          cols: ['asset', 'tags'],
          rows: [
            ['bard.png',  '["character","bard","instrument"]'],
            ['wall.png',  '["structure","wood","stable"]'],
            ['soup.png',  '["food","item","warm"]'],
            ['…', '…'],
          ],
        },
      },
      { name: 'quest_drafts', count: '📦 MongoDB · 任务草稿（schema 不稳）',
        sample: {
          cols: ['_id', 'draft (JSON)'],
          rows: [
            ['q_001', '{ name:"找回暖汤", branches:[...], rewards:{...} }'],
            ['q_002', '{ name:"血月守夜", trigger:{weather:"blood_moon"}, ... }'],
            ['…', '…'],
          ],
        },
      },
    ],
    can: [
      '✓ 资产可复用 · 按标签搜（"找所有木质贴图"）',
      '✓ JSON 嵌套灵活 · 加字段不停机',
      '✓ NPC 模板分支（thief / helpful / blood_moon 不同台词）',
      '✓ 大文件归 S3 + CDN 加速',
    ],
    mockType: 'station',
    mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
    mockLabel: '驿站丰满了 —— 资产齐全 · NPC 有条件分支对话',
    cantGroups: [
      { label: '🔀 多信号融合做不到', points: [
        '多 tag 同时存在（thief + 雨 + 受伤） → 模板匹配只命中第一个，其余被丢',
        'NPC 间共享信息要手工写同步逻辑',
      ]},
      { label: '💬 语义理解能力为零', points: [
        '<code>profile.traits</code> 写了"嘴硬心软"，运行时仍只读 <code>cond</code>',
        '想搜"性格类似惠子的 NPC" → MongoDB <code>$text</code> 是关键词不是语义',
      ]},
      { label: '📚 大规模知识装不下', points: [
        '想引用上传的 30 万字小说 → JSON 字段塞不下',
      ]},
    ],
    transition: {
      title: '🔴 灵活存储能装得下，但理解不了',
      reasons: [
        '<b>MongoDB 解决"存得更灵活"，不解决"理解得更好"</b>',
        '<b>模板匹配 = 字段精确比对</b>，"嘴硬心软"这种描述匹配不了',
        '<b>多信号融合</b>（thief + 雨 + 受伤）模板做不到，文案是死的',
      ],
      next: '<b>→ 因此需要：</b> 🤖 Agent（LLM 推理）+ 📝 SKILL（性格 / 边界）+ 🧠 记忆引擎 + 🧲 向量检索（大规模知识）',
    },
    nextHint: '加入 AI 友好的语义层',
    ready: true,
  },
  {
    key: 'semantic',
    num: 3,
    icon: '✨',
    label: '+ 语义层（AI 友好）',
    layerChip: '+ ✨ Agent · SKILL · 记忆 · 向量检索',
    infraNote: '前两层 MySQL / Redis / S3 / MongoDB 一个都没退场——AI 只叠加一层"让数据被理解"，不替代下面任何一层。',
    haveTitle: '📂 在前两层基础上又多了什么',
    seeTitle: '🎮 玩家能玩到什么',
    tables: [
      { name: 'skills/*.md', count: '📝 4 份 SKILL · 角色性格 + 边界 + 知识范围',
        sample: {
          cols: ['file', 'content'],
          rows: [
            ['skills/bard.md',    '# 流浪诗人\n## 性格\n- 浪漫、爱夸张\n## 知识边界\n- 可访问：驿站传闻 / 世界事件\n- 不可访问：玩家私密状态'],
            ['skills/hostess.md', '# 老板娘\n## 性格\n- 嘴硬心软\n…'],
            ['…', '…'],
          ],
        },
      },
      { name: 'memory.jsonl', count: '🧠 per-player 事件流（NPC 真的"记得"）',
        sample: {
          cols: ['player', 'ts', 'event', 'detail'],
          rows: [
            ['u_001', '14:22:01', 'steal',    '偷取了暖暖汤'],
            ['u_001', '14:25:33', 'give',     '归还暖暖汤'],
            ['u_001', '14:30:18', 'dialogue', '和伊莱聊起东边山洞'],
            ['…', '…', '…', '…'],
          ],
        },
      },
      { name: 'hp_chunks (Milvus)', count: '🧲 向量库 · 上传小说 → embedding',
        sample: {
          cols: ['chunk_id', 'text (snippet)', 'embedding'],
          rows: [
            ['hp_ch01_p3', '邓布利多熄灭路灯，与麦格密谈…', '[0.12, -0.83, ...]'],
            ['hp_ch02_p7', '哈利在动物园让蟒蛇玻璃消失…',   '[0.44, -0.21, ...]'],
            ['…', '…', '…'],
          ],
        },
      },
      { name: 'constraints.md', count: '🛑 一致性约束（防 hallucination）',
        sample: {
          cols: ['rule'],
          rows: [
            ['不能剧透 ch04 之后的剧情'],
            ['不能创造原作里没有的设定'],
            ['NPC 不能引用玩家私密状态'],
            ['…'],
          ],
        },
      },
    ],
    can: [
      '✓ Agent 一次推理融合「玩家状态 + 记忆 + 世界 + SKILL」',
      '✓ 复杂复合状态下伊莱说押韵融合诗',
      '✓ NPC 间信息流通（商人能说"老板娘气得不轻"）',
      '✓ 引用上传的世界观（向量召回相关片段）',
      '✓ 一致性校验防止 NPC 编造原作里没有的事',
    ],
    mockType: 'station',
    mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
    mockLabel: '驿站活了 —— 伊莱按经历说押韵诗 · 能引用世界观',
    bubble: {
      speaker: '🎻 伊莱（Agent + SKILL + 记忆 + 向量）',
      text: '"夜雨敲窗，炉火正旺，\n  我听见风在唱你的名字——\n  那碗汤，你已归还，像月归潮。"',
    },
    hardDataCallout: {
      title: '💡 但这一刻，下面这些事仍然在结构化 / 灵活层跑',
      rows: [
        { who: '🗄️ MySQL <code>items</code>',     what: '玩家归还暖暖汤 → 库存 +1（<b>事务</b>）' },
        { who: '🗄️ MySQL <code>users</code>',     what: '账号、金币、登录态' },
        { who: '🚀 Redis',                          what: '在线状态、当前对话上下文缓存' },
        { who: '🖼️ S3',                           what: '伊莱立绘 bard.png · 雨声 rain.wav' },
        { who: '📦 MongoDB <code>npc_profiles</code>', what: '伊莱的性格档案、模板兜底' },
        { who: '✨ Agent + SKILL + 记忆 + 向量',  what: '只负责生成这句押韵诗——<b>不碰钱、不碰库存、不碰状态</b>' },
      ],
      footer: '<b>AI 负责"理解、生成、归纳、推理"；钱 / 库存 / 进度 / 权限——永远在结构化层。</b>',
    },
    verdict: '✅ 三层叠加完整：MySQL 管硬数据 · MongoDB 管灵活配置 · 语义层管理解与生成',
    nextHint: '（再往后是上线运营的故事 —— 监控 / 灰度 / 反馈循环）',
    ready: true,
  },
];

function applyRainQuestCreatorNarrative() {
  const structured = PROJECT_STEPS.find(s => s.key === 'structured');
  if (structured) Object.assign(structured, {
    icon: '🗄️',
    label: '结构化',
    layerChip: 'SQLite / MySQL：project · map · npc · item · player · quest_state',
    infraNote: '同一条演示动线：玩家雨天在驿站门口捡到猫头鹰密信，再找惠子登记、找大壮领取通行许可。',
    haveTitle: '🗄️ 结构化层存什么',
    seeTitle: '🎮 玩家此时能玩到什么',
    tables: [
      { name: 'projects', count: '1 个 · zelda-station-demo',
        sample: { cols: ['project_id', 'name', 'status'], rows: [['zelda_station', '风铃驿站 Demo', 'draft']] },
      },
      { name: 'maps / tile_map', count: '20 × 15 格 · 驿站地图',
        sample: { cols: ['scene_id', 'x', 'y', 'tile'], rows: [['plain_stable', '10', '10', 'DOOR'], ['plain_stable', '11', '11', 'ROAD'], ['…', '…', '…', '…']] },
      },
      { name: 'npcs', count: '3 个 · 惠子 / 阿福 / 大壮',
        sample: { cols: ['id', 'name', 'x', 'y'], rows: [['hostess', '驿站老板娘·惠子', '6', '4'], ['merchant', '旅行商人·阿福', '6', '6'], ['soldier', '驻扎士兵·大壮', '6', '8']] },
      },
      { name: 'items', count: '3 个 · 暖暖汤 / 矿石 / 猫头鹰密信',
        sample: { cols: ['item_id', 'type', 'x', 'y', 'visible'], rows: [['soup', 'stealable', '8', '4', 'true'], ['ore', 'pickable', '10', '11', 'true'], ['letter', 'quest', '11', '11', 'false']] },
      },
      { name: 'world_state', count: '天气 / 时间 / 血月 / 山洞状态',
        sample: { cols: ['weather', 'time', 'cave_status'], rows: [['clear', 'evening', 'unexplored'], ['rain', 'evening', 'letter_received']] },
      },
      { name: 'player_inventory / memory_entries', count: '背包和事件写回',
        sample: { cols: ['event', 'writeback'], rows: [['pickup:letter', 'inventory += 猫头鹰密信'], ['pickup:letter', 'cave_status = letter_received']] },
      },
    ],
    can: [
      '✓ 新建游戏项目、地图、NPC、道具坐标能稳定运行',
      '✓ 天气 / 背包 / 任务进度 / 道具显隐是确定性状态机',
      '✓ 拾取密信会事务式写回：背包 + 任务状态 + 记忆事件',
      '✓ 重置、读档、演示初始态都可控',
    ],
    mockOpts: { includeNPCs: true, includeBard: false, includeItems: false },
    mockLabel: '晴天开场：地图、NPC、背包、天气、任务状态都稳定运行；猫头鹰密信仍隐藏。',
    cantGroups: [
      { label: '⚠️ 但只靠结构化层，创作会很快变重', points: [
        '雨天密信可以落成 flag，但创作者每加一种条件都要改字段 / 改规则',
        '惠子、大壮、商人的多分支台词会膨胀成大量 dialogue_nodes',
        '哈利波特小说、世界观文档、长角色设定不适合直接塞进关系表',
        '表能记住 cave_status，却不理解“禁林、独角兽、通行规矩”之间的语义关系',
      ]},
    ],
    keyTakeaway: '<b>结构化层负责让游戏可玩、可存、可回滚。</b><br>雨天触发、拾取密信、任务状态推进这些硬事实必须在这里兜底，但创作内容不应该全靠建表硬扛。',
    transition: {
      title: '🔴 下一步卡在创作效率 + 规模',
      reasons: [
        '<b>新增任务线</b>：猫头鹰密信、禁林来信、通行许可都要大量配置',
        '<b>新增世界观</b>：小说章节和设定是文件，不是几列字段',
        '<b>新增分支对话</b>：雨天 / 密信 / 登记 / 放行组合会让模板爆炸',
        '<b>规模升级</b>：NPC 从 4 个 → 1000 个、对话模板从约 20 条 → 50 万条时，关系表 unique 索引逼近上限、单表批量加载从毫秒到秒级 —— "读写分离 / 高并发 / 批量操作"的命题在这一层被提出，但还解决不了',
      ],
      next: '<b>→ 因此需要：</b> JSON / 文件层装内容资产 + 文档型 DB（Mongo）和缓存（Redis）扛规模和读写分离。',
    },
    nextHint: '加入半结构化 / 文件层',
  });

  const flexible = PROJECT_STEPS.find(s => s.key === 'flexible');
  if (flexible) Object.assign(flexible, {
    icon: '📦',
    label: '+ 半结构化/文件',
    layerChip: 'JSON / 文件：NPC 档案 · 对话模板 · 世界观文档 · 外部语料',
    infraNote: '结构化层继续管状态；这一层把创作者交付的“内容资产”从表里搬出来。',
    haveTitle: '📦 文件和半结构化资产有什么',
    seeTitle: '🎮 玩家此时能玩到什么',
    tables: [
      { name: 'content/npc_profiles.json', count: '4 个 NPC 档案',
        sample: { cols: ['npc', 'profile'], rows: [['hostess', '热情、嘴硬心软、关心旅行者'], ['soldier', '守规矩、负责通行检查'], ['merchant', '补给、传闻、风险提醒'], ['bard', '吟游诗人，发布后入场']] },
      },
      { name: 'content/dialogue_templates.json', count: '约 20 条条件模板',
        sample: { cols: ['npc', 'condition', 'action'], rows: [['hostess', 'caveStatus = letter_received', 'accept_quest_cave'], ['soldier', 'caveStatus = quest_accepted', 'grant_cave_permit'], ['merchant', 'letter_received', '推荐补给']] },
      },
      { name: 'content/world_lore.json', count: '玩法规则文档',
        sample: { cols: ['rule', 'trigger', 'effect'], rows: [['rain_owl_letter', 'weather = rain && caveStatus = unexplored', '驿站门口出现猫头鹰密信']] },
      },
      { name: 'compiled/*', count: '45 个世界观文件 · 499 个 chunk',
        sample: { cols: ['source', 'use'], rows: [['哈利波特小说编译/compiled', '作为外部世界观喂入'], ['lore_chunks', '增量索引，避免几百章爆内存']] },
      },
      { name: 'public/avatars/*.svg', count: '4 张 NPC 头像 · 文件级附件',
        sample: { cols: ['npc_id (表)', '附件 URL (文件系统)', '加载方式'], rows: [['hostess', '/public/avatars/hostess.svg', '浏览器按 URL 拉 SVG'], ['merchant', '/public/avatars/merchant.svg', '同上'], ['soldier', '/public/avatars/soldier.svg', '同上'], ['bard', '/public/avatars/bard.svg', '同上']] },
      },
      { name: 'storage-inspection', count: '结构化 + 文件混合可观测',
        sample: { cols: ['layer', 'example'], rows: [['structured', 'world_state.cave_status'], ['semi-structured', 'dialogue_templates / world_lore'], ['files', 'compiled corpus + avatars/*.svg']] },
      },
    ],
    can: [
      '✓ 创作者用 JSON 写“雨天出现密信”的规则，不必每次改表',
      '✓ 惠子 / 大壮按 caveStatus 命中不同模板，任务能顺着走',
      '✓ 小说和世界观文件可增量接入，为后续几百章预留扩展方式',
      '✓ <b>附件 + ID 关联范式</b>：NPC 头像放 <code>public/avatars/*.svg</code>，结构化表里只存 <code>npc_id</code> + <code>avatar_url</code>，等价于医疗里"基本信息进表、CT 片进文件、用 patient_id 关联拿出"',
    ],
    mockOpts: { includeNPCs: true, includeBard: false, includeItems: true, showLetter: true, rain: true },
    mockLabel: '雨天后：猫头鹰密信出现在门口；NPC 已有条件模板，能把任务推进到登记 / 放行。',
    cantGroups: [
      { label: '⚠️ 但半结构化层仍只是“装得下”，不是“理解了”', points: [
        '模板只会精确匹配 caveStatus，不会理解禁林、独角兽、魔法部封蜡意味着什么',
        '几百章世界观如果只靠关键词检索，相关但不同词的片段容易漏掉',
        '惠子该如何根据玩家经历改口吻，仍要人工继续补模板',
        'NPC 之间的信息流通仍靠手写同步逻辑',
      ]},
    ],
    transition: {
      title: '🔴 文件层装下了内容，但还不能把内容变成“会思考的 NPC”',
      reasons: [
        '<b>模板匹配</b>只能判断字段，不能综合玩家记忆、世界观和 NPC 性格',
        '<b>关键词搜索</b>找不到语义相近的设定，也不能总结长章节',
        '<b>任务推进</b>仍需要人为枚举每一种对话和动作组合',
        '<b>召回延迟</b>：50 万章节 chunk 全文检索仍要秒级，无向量索引就做不到玩家说"昨天的事"NPC 能秒级回忆相关上下文',
      ],
      next: '<b>→ 因此需要：</b> Vector（向量召回）+ Memory（玩家记忆）+ Skill / Agent，把文件和状态编译成模型能消费的上下文。',
    },
    nextHint: '加入模型友好存储',
  });

  const semantic = PROJECT_STEPS.find(s => s.key === 'semantic');
  if (semantic) Object.assign(semantic, {
    icon: '⭐',
    label: '+ 模型友好存储',
    layerChip: 'Vector · Memory · Skill · Agent：语义召回 + 玩家记忆 + 工具写回',
    infraNote: '前两层不退场：模型只负责理解和生成，最后仍回写结构化任务状态。',
    haveTitle: '⭐ 模型友好存储里有什么',
    seeTitle: '🎮 玩家此时能玩到什么',
    tables: [
      { name: 'skills/hostess.md + skills/soldier.md', count: 'NPC 角色边界',
        sample: { cols: ['skill', 'rule'], rows: [['hostess', '收到密信后先登记任务，不直接放行'], ['soldier', '只有 quest_accepted 才发通行许可']] },
      },
      { name: 'memory_entries', count: '玩家长期事件流',
        sample: { cols: ['event', 'detail'], rows: [['quest_item', '捡到猫头鹰密信'], ['dialogue', '惠子登记禁林来信任务'], ['dialogue', '大壮发放通行许可']] },
      },
      { name: 'lore_chunks / vector index', count: '499 个 chunk · 可继续扩到几百章',
        sample: { cols: ['query', '召回方向'], rows: [['禁林 独角兽 通行 规矩', '禁林、受伤生物、学校规矩相关片段'], ['猫头鹰 密信 封蜡', '来信、传递、魔法世界边界']] },
      },
      { name: '本轮 TopK 召回证据', count: '运行态可见 · 不只说“有向量库”',
        sample: { cols: ['rank', 'chunk', '进 prompt 的用途'], rows: [['#1', '禁林 / 学校规矩相关 chunk', '解释为什么雨夜密信需要登记和通行'], ['#2', '独角兽 / 受伤生物相关 chunk', '给惠子对话增加任务动机'], ['#3', '猫头鹰 / 来信相关 chunk', '说明密信投递方式和魔法边界']] },
      },
      { name: 'agent.tools', count: '查状态 + 生成对白 + 受控写回',
        sample: { cols: ['tool', 'purpose'], rows: [['query_state', '查背包 / 天气 / caveStatus'], ['search_lore', '召回世界观 chunk'], ['apply_effect', 'accept_quest_cave / grant_cave_permit']] },
      },
      { name: 'constraints.md', count: '一致性与防越界',
        sample: { cols: ['rule'], rows: [['不剧透未接入章节'], ['不创造原作里不存在的设定'], ['不绕过结构化状态机直接发奖励']] },
      },
    ],
    can: [
      '✓ 雨天捡信后，NPC 能融合“背包 + 任务状态 + 玩家记忆 + 世界观 chunk”说话',
      '✓ 惠子能把密信解释成任务登记，大壮能根据登记状态发通行许可',
      '✓ 世界观从文件召回，不需要把几百章拆成几十张关系表',
      '✓ 模型输出的动作仍由结构化层校验并写回，演示可信',
    ],
    mockOpts: { includeNPCs: true, includeBard: false, includeItems: true, showLetter: true, rain: true },
    mockLabel: '雨夜任务线：密信触发 → 惠子登记 → 大壮放行；NPC 说法来自记忆、世界观和规则共同装配。',
    bubble: {
      speaker: '驿站老板娘·惠子（Memory + Lore + Agent）',
      text: '"这封蜡不是普通旅信。禁林、受伤的独角兽、雨夜投递，全都对上了。先让我登记，再去找大壮领通行许可。"',
    },
    hardDataCallout: {
      title: '💡 这一刻三层各自负责什么',
      rows: [
        { who: '🗄️ SQLite <code>world_state</code>', what: 'weather = rain，cave_status 从 unexplored → letter_received' },
        { who: '🗄️ SQLite <code>items / inventory</code>', what: '拾取密信后 item.visible = false，背包 +1' },
        { who: '📦 JSON <code>dialogue_templates</code>', what: '惠子登记任务，大壮发许可的兜底模板' },
        { who: '📄 Files <code>compiled/*</code>', what: '外部世界观持续增量索引，几百章也不一次塞进 prompt' },
        { who: '⭐ Vector + Memory + Skill + Agent', what: '召回相关 chunk，融合玩家记忆，生成当前这句对话和候选动作' },
      ],
      footer: '<b>模型友好存储让 NPC 会理解；结构化层保证任务真的可玩、可存、可审计。</b>',
    },
    verdict: '✅ 创作者动线闭环：结构化管硬状态，文件层管创作资产，模型友好存储把世界观与玩家经历装配成可互动任务。',
    nextHint: '回到玩家模式，从晴天重置开始演示雨天密信',
  });
}

applyRainQuestCreatorNarrative();

let currentProjectStep = 'structured';

function renderProjectTimeline() {
  const el = document.getElementById('project-timeline');
  if (!el) return;
  const activeIdx = PROJECT_STEPS.findIndex(s => s.key === currentProjectStep);

  let html = '';
  PROJECT_STEPS.forEach((s, idx) => {
    let cls = 'tl-step';
    if (idx < activeIdx) cls += ' done';
    else if (idx === activeIdx) cls += ' active';
    else cls += ' future';

    html += `<button type="button" class="${cls}" data-step="${s.key}" aria-pressed="${idx === activeIdx}">
      <div class="tl-dot">${s.icon}</div>
      <div class="tl-label">${s.label}</div>
    </button>`;

    if (idx < PROJECT_STEPS.length - 1) {
      const lineCls = (idx < activeIdx) ? 'tl-line done' : 'tl-line';
      html += `<div class="${lineCls}"></div>`;
    }
  });
  el.innerHTML = html;

  el.querySelectorAll('.tl-step').forEach(node => {
    node.addEventListener('click', () => {
      currentProjectStep = node.dataset.step;
      renderProjectPanel();
    });
  });
}

// ===== ABC 三块完整模板（所有 step 共用） =====
function renderEvolutionABC(el, s) {
  const abc = s.evolutionABC;

  // 区块 A：痛点 + 方案
  const blockA = `
    <div class="block-a">
      <div class="block-a-pain">
        <div class="block-a-title">${abc.pain.title}</div>
        <ul>${abc.pain.points.map(p => `<li>🚫 ${p}</li>`).join('')}</ul>
      </div>
      <div class="block-a-fix">
        <div class="block-a-title">${abc.fix.title}</div>
        <ul>${abc.fix.points.map(p => `<li>➕ ${p}</li>`).join('')}</ul>
      </div>
    </div>`;

  // 区块 B：三列对比卡
  const cardsHtml = abc.threeLayer.cards.map(c => `
    <div class="tl-card ${c.focused ? 'tl-focused' : ''}">
      <div class="tl-card-head">
        <span class="tl-card-emoji">${c.icon}</span>
        <span class="tl-card-name">${c.name}</span>
      </div>
      <div class="tl-card-big">${c.big}</div>
      <div class="tl-card-small">${c.small}</div>
    </div>
  `).join('');
  const blockB = `
    <div class="block-b">
      <div class="block-b-title">🛠️ 创作者要交付什么（三层对比）</div>
      <div class="three-layer-cards">${cardsHtml}</div>
    </div>`;

  // 区块 C：mock 画面（场景预览） + 对话气泡（可选）
  const canvasId = `mock-${s.key}`;
  const stationMock = abc.visualMock && abc.visualMock.type === 'station'
    ? `<div class="station-mockup">
         <canvas id="${canvasId}" width="320" height="240"></canvas>
         <div class="station-mockup-label">${abc.visualMock.label || ''}</div>
       </div>`
    : '';

  const sceneLine = (abc.dialogues && abc.dialogues.rows && abc.threeLayer.scene)
    ? `<div class="block-c-scene">${abc.threeLayer.scene}</div>`
    : (stationMock ? '' : '');

  let bubblesHtml = '';
  if (abc.dialogues && abc.dialogues.rows) {
    const bubbles = abc.dialogues.rows.map(r => {
      const cls = r.state === 'focus' ? 'db-focus' : r.state === 'on' ? 'db-on' : 'db-off';
      return `
        <div class="dbubble ${cls}">
          <div class="dbubble-layer">${r.layer}</div>
          <div class="dbubble-text">${r.text.replace(/\n/g, '<br>')}</div>
          <div class="dbubble-tag">${r.tag}</div>
        </div>`;
    }).join('');
    bubblesHtml = `<div class="dialogue-row">${bubbles}</div>`;
  }

  const blockC = `
    <div class="block-c">
      <div class="block-c-title">${abc.dialogues ? '🎤 同一场景，三层下 NPC 会说什么' : '🎮 玩家此时打开游戏看到的'}</div>
      ${sceneLine}
      ${stationMock}
      ${bubblesHtml}
    </div>`;

  // 一句话总结
  const tldr = abc.tldr ? `<div class="step-tldr">${abc.tldr}</div>` : '';

  el.innerHTML = `
    <div class="step-head">
      <div class="step-head-num">STEP ${s.num} / ${PROJECT_STEPS.length}</div>
      <div class="step-head-title">${s.icon} ${s.label}</div>
      <div class="step-head-layer">${s.num === 1 ? '此时用到' : '在上一步基础上 +'}：<span class="layer-chip">${s.layerChip}</span></div>
    </div>
    ${blockA}
    ${blockB}
    ${blockC}
    ${tldr}
  `;

  // mock canvas 绘制（station 类型）
  if (abc.visualMock && abc.visualMock.type === 'station') {
    renderStationMockup(canvasId, abc.visualMock.mockOpts || {});
  }
}

function renderProjectStepDetail() {
  const el = document.getElementById('project-step-detail');
  if (!el) return;
  const s = PROJECT_STEPS.find(x => x.key === currentProjectStep);
  if (!s) return;

  // ABC 完整模板分支（Phase 1：仅 npc step）
  if (s.evolutionABC) {
    renderEvolutionABC(el, s);
    return;
  }

  if (!s.ready) {
    el.innerHTML = `
      <div class="step-head">
        <div class="step-head-num">STEP ${s.num} / ${PROJECT_STEPS.length}</div>
        <div class="step-head-title">${s.icon} ${s.label}</div>
        <div class="step-head-layer">需要：<span class="layer-chip">${s.layerChip}</span></div>
      </div>
      <div style="padding: 40px; text-align: center; color: #666;">
        🚧 这一步还没写完
      </div>`;
    return;
  }

  // 右侧 mock 渲染
  const canvasId = `mock-canvas-${s.key}`;
  let mockHtml = '';
  if (s.mockType === 'station') {
    mockHtml = `
      <div class="station-mockup">
        <canvas id="${canvasId}" width="320" height="240"></canvas>
        <div class="station-mockup-label">${s.mockLabel || ''}</div>
      </div>`;
  } else {
    // 默认 "Coming Soon"
    mockHtml = `
      <div class="game-mockup">
        <div class="game-mockup-emoji">${s.mockEmoji || '🚧'}</div>
        <div class="game-mockup-text">${s.mockText || 'Coming Soon'}</div>
      </div>`;
  }

  // 对话气泡（Step 3/4 用）
  const bubbleHtml = s.bubble ? `
    <div class="dialogue-bubble">
      <div class="speaker">${s.bubble.speaker}</div>
      <div class="bubble-text">${s.bubble.text.replace(/\n/g, '<br>')}</div>
    </div>` : '';

  // ✓ 能做 列表 + 表点开看示例
  const tableRowsHtml = s.tables.map(t => {
    if (!t.sample) {
      return `
        <div class="db-table-row no-sample">
          <span class="db-table-name">📋 ${t.name}</span>
          <span class="db-table-count">${t.count}</span>
        </div>`;
    }
    const colsHtml = t.sample.cols.map(c => `<th>${c}</th>`).join('');
    const rowsHtml = t.sample.rows.map(r =>
      `<tr>${r.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`
    ).join('');
    return `
      <details class="db-table-mock">
        <summary class="db-table-row">
          <span class="db-table-name">📋 ${t.name}</span>
          <span class="db-table-count">${t.count} <span class="expand-hint">▸ 点开看</span></span>
        </summary>
        <div class="db-sample">
          <table>
            <thead><tr>${colsHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </details>`;
  }).join('');
  const canHtml = `
    <div class="db-tables">${tableRowsHtml}</div>
    <ul class="step-points">
      ${s.can.map(p => `<li class="pt-can">${p}</li>`).join('')}
    </ul>`;

  // 🚫 不行 列表（支持 cantGroups 分组 / 旧版 cant 平铺）
  let cantHtml = '';
  if (s.cantGroups) {
    const groupsHtml = s.cantGroups.map(g => `
      <div class="cant-group">
        <div class="cant-group-label">${g.label}</div>
        <ul class="step-points">
          ${g.points.map(p => `<li class="pt-cant">${p}</li>`).join('')}
        </ul>
      </div>`).join('');
    cantHtml = `<div class="cant-groups">${groupsHtml}</div>`;
  } else if (s.cant) {
    cantHtml = `
      <ul class="step-points" style="margin-top:10px;">
        ${s.cant.map(p => `<li class="pt-cant">${p}</li>`).join('')}
      </ul>`;
  }

  // 🔴 过渡卡：当前层做不好什么 → 因此需要加什么
  let transitionHtml = '';
  if (s.transition) {
    const t = s.transition;
    transitionHtml = `
      <div class="step-transition">
        <div class="trans-title">${t.title}</div>
        <ul class="trans-reasons">
          ${t.reasons.map(r => `<li>${r}</li>`).join('')}
        </ul>
        <div class="trans-next">${t.next}</div>
      </div>`;
  }

  // ✅ verdict（仅 semantic step 有）
  const verdictHtml = s.verdict
    ? `<div class="step-verdict-banner">${s.verdict}</div>`
    : '';

  // 💡 硬数据 callout（仅 semantic step 有）—— 强调 AI 不替代结构化/灵活层
  let hardDataHtml = '';
  if (s.hardDataCallout) {
    const h = s.hardDataCallout;
    const rowsHtml = h.rows.map(r => `
      <div class="hd-row">
        <span class="hd-who">${r.who}</span>
        <span class="hd-arrow">→</span>
        <span class="hd-what">${r.what}</span>
      </div>`).join('');
    hardDataHtml = `
      <div class="hard-data-callout">
        <div class="hd-title">${h.title}</div>
        <div class="hd-rows">${rowsHtml}</div>
        <div class="hd-footer">${h.footer}</div>
      </div>`;
  }

  // 💡 keyTakeaway —— 这一阶段的核心结论
  const keyTakeawayHtml = s.keyTakeaway
    ? `<div class="step-key-takeaway"><span class="kt-badge">💡 核心结论</span><div class="kt-text">${s.keyTakeaway}</div></div>`
    : '';

  el.innerHTML = `
    <div class="step-head">
      <div class="step-head-num">STEP ${s.num} / ${PROJECT_STEPS.length}</div>
      <div class="step-head-title">${s.icon} ${s.label}</div>
      <div class="step-head-layer">${s.num === 1 ? '主要数据范式' : '在上一层基础上 +'}：<span class="layer-chip">${s.layerChip}</span></div>
      ${s.infraNote ? `<div class="step-head-infra">📌 ${s.infraNote}</div>` : ''}
    </div>

    <div class="step-compare">
      <div class="step-pane have">
        <div class="step-pane-title">${s.haveTitle}</div>
        ${canHtml}
      </div>

      <div class="step-pane see">
        <div class="step-pane-title">${s.seeTitle}</div>
        ${mockHtml}
        ${bubbleHtml}
        ${cantHtml}
      </div>
    </div>

    ${keyTakeawayHtml}
    ${hardDataHtml}
    ${transitionHtml}
    ${verdictHtml}

    <div class="step-next">
      <span class="next-arrow">↓</span>${s.nextHint}
    </div>`;

  // mock 是 canvas 的话，innerHTML 设置后立即绘制
  if (s.mockType === 'station') {
    renderStationMockup(canvasId, s.mockOpts || {});
  }
}

function renderProjectPanel() {
  renderProjectTimeline();
  renderProjectStepDetail();
  renderCapabilityStack();
}

// ============== NPC 演进叙事（仅 npc 动作下使用） ==============

const NPC_EVOLUTION = [
  {
    cls: 'stage-design',
    num: 1,
    icon: '🎭',
    title: '素材准备',
    tech: '设计师交付',
    desc: '写代码前，先要拿到设计师给的东西',
    deliverables: [
      '🖼️ <b>立绘</b> bard.png · 紫红软帽 + 鲁特琴',
      '🎵 <b>语音</b> bard_intro.wav · 伊莱的开场白',
      '📄 <b>角色设定</b> · 名字「伊莱」/ 职业「流浪诗人」/ 位置 (10,6)',
      '📝 <b>性格描述</b>「他把每个旅人的故事都讲成史诗，押韵，爱夸张」',
    ],
    note: '↓ 这些东西落进游戏里，每一层能力下做法不同',
  },
  {
    cls: 'stage-struct',
    num: 2,
    icon: '📊',
    title: '只用结构化层',
    tech: 'MySQL + S3',
    desc: '所有数据进关系表，大文件丢对象存储',
    can: [
      '起名、定位：<code>INSERT INTO npcs VALUES (\'bard_001\', \'伊莱\', 10, 6)</code>',
      '立绘语音传 S3，URL 进字段：<code>portrait_url = \'s3://assets/bard.png\'</code>',
      '说一句固定话：<code>INSERT INTO dialogue_nodes VALUES (..., \'旅人啊，愿风指引你的路。\')</code>',
    ],
    cant: [
      '想根据玩家状态说不同话 → 加 condition 字段，<b>32 种组合 = 96 条记录</b>',
      '设计师写的「性格描述」放哪？塞 personality 字段，<b>运行时查询根本不读它</b>',
      '想让伊莱和其他 NPC 联动（"商人，听说老板娘…"）→ 外键 JOIN 三跳就崩',
    ],
    actual: '伊莱说什么：永远固定\n　　"旅人啊，愿风指引你的路。"',
    verdict: '⚠️ 能起步，但只能做"固定对话 NPC"',
    verdictType: 'warn',
    note: '↓ 加一层能力',
  },
  {
    cls: 'stage-flex',
    num: 3,
    icon: '📦',
    title: '加上灵活存储层',
    tech: '+ MongoDB / JSON',
    desc: 'NPC profile 用 JSON 文档 + 条件模板数组',
    can: [
      'NPC profile 嵌套 JSON · 性格 / 知识源 / 模板 都能存',
      '条件模板：玩家是 thief 命中"一碗暖汤失了踪…"',
      '设计师写的「性格」终于有处放（<code>profile.traits</code>）',
    ],
    cant: [
      '多个条件同时存在（thief + 雨 + 受伤）<b>仍然只命中第一个模板</b>',
      '<code>personality</code> 字段写了，但运行时<b>还是不读</b> —— 只读模板',
      '商人想说"老板娘气得不轻" → NPC 间事件流通<b>仍要手工同步</b>',
    ],
    actual: '伊莱说什么：\n　　thief → "一碗暖汤失了踪，炉火旁边起了风。"\n　　但 thief + 雨 + 受伤 → <b>只说 thief 那一条，雨和伤被丢</b>',
    verdict: '⚠️ 有条件分支了，但多信号融不进，性格也还是死数据',
    verdictType: 'amb',
    note: '↓ 再加一层能力',
  },
  {
    cls: 'stage-agent',
    num: 4,
    icon: '📝',
    title: '加上语义理解层 + Agent',
    tech: '+ SKILL + LLM + 记忆 + 向量检索',
    desc: 'SKILL.md 描述角色 · Agent 推理融合 · 记忆引擎 · 驿站传闻流',
    can: [
      'SKILL.md 写性格 / 口吻 / 知识边界 / 生成规则 —— 设计师的"性格描述"<b>真的被读了</b>',
      'Agent 一次推理把所有条件融合：<b>雨 + 夜 + 血月 + thief + 归还 一起进 prompt</b>',
      '记忆引擎让伊莱"记住玩家"：<code>memory.append(memory_note)</code>',
      '驿站传闻流：商人的 prompt 自动带"老板娘刚才气得不轻"',
    ],
    actual: '伊莱说什么（复杂复合状态下）：\n　　"夜雨敲窗，炉火正旺，\n　　 我听见风在唱你的名字——\n　　 那碗汤，你已归还，像月归潮。\n　　 你加固的防线，在血月前立成诗行。"',
    verdict: '✅ 完美 —— 但前提是上面 3 层都还在（不是替代，是叠加）',
    verdictType: 'ok',
    note: null,
  },
];

function renderNpcEvolution() {
  const el = document.getElementById('creator-evolution');
  if (!el) return;
  el.classList.add('show');

  el.innerHTML = NPC_EVOLUTION.map((s, idx) => {
    const sections = [];

    if (s.deliverables) {
      sections.push(`
        <div class="stage-section">
          <div class="stage-section-title deliv">设计师交付</div>
          <ul class="stage-list">
            ${s.deliverables.map(d => `<li class="deliv-li">${d}</li>`).join('')}
          </ul>
        </div>`);
    }
    if (s.can) {
      sections.push(`
        <div class="stage-section">
          <div class="stage-section-title can">✓ 能做</div>
          <ul class="stage-list">
            ${s.can.map(d => `<li class="can-li">${d}</li>`).join('')}
          </ul>
        </div>`);
    }
    if (s.cant) {
      sections.push(`
        <div class="stage-section">
          <div class="stage-section-title cant">🚫 不够 / 不行</div>
          <ul class="stage-list">
            ${s.cant.map(d => `<li class="cant-li">${d}</li>`).join('')}
          </ul>
        </div>`);
    }
    if (s.actual) {
      sections.push(`
        <div class="stage-section">
          <div class="stage-section-title actual">🎮 在游戏里的表现</div>
          <div class="stage-actual">${s.actual}</div>
        </div>`);
    }
    if (s.verdict) {
      sections.push(`<div class="stage-verdict ${s.verdictType}">${s.verdict}</div>`);
    }

    const card = `
      <div class="stage-card ${s.cls}">
        <div class="stage-header">
          <span class="stage-num">${s.num}</span>
          <span class="stage-icon">${s.icon}</span>
          <span class="stage-title">${s.title}</span>
          <span class="stage-tech">${s.tech}</span>
        </div>
        <div class="stage-desc">${s.desc}</div>
        ${sections.join('')}
      </div>`;

    const arrow = s.note
      ? `<div class="stage-arrow">↓ <span class="stage-arrow-note">${s.note.replace(/^[↓\s]+/, '')}</span></div>`
      : '';

    return card + (idx < NPC_EVOLUTION.length - 1 ? arrow : '');
  }).join('');
}

// ============== 状态 ==============

let currentCreativeAction = 'npc';

// ============== 渲染：动作选择器 ==============

function renderActionSelector() {
  const el = document.getElementById('creator-action-selector');
  if (!el) return;
  el.innerHTML = '';
  Object.values(CREATIVE_ACTIONS).forEach(a => {
    const btn = document.createElement('div');
    btn.className = 'action-btn' + (a.key === currentCreativeAction ? ' active' : '');
    btn.dataset.action = a.key;
    btn.innerHTML =
      `<div class="action-emoji">${a.emoji}</div>` +
      `<div class="action-title">${a.title}</div>` +
      `<div class="action-subtitle">${a.subtitle}</div>`;
    btn.addEventListener('click', () => {
      currentCreativeAction = a.key;
      renderCreatorPanel();
    });
    el.appendChild(btn);
  });
}

// ============== 渲染：三层卡片 ==============

function renderGenCards() {
  const container = document.getElementById('creator-gen-cards');
  if (!container) return;
  const action = CREATIVE_ACTIONS[currentCreativeAction];
  const gens = [
    { key: 'gen1', name: '结构化层' },
    { key: 'gen2', name: '灵活存储层' },
    { key: 'gen3', name: '语义理解层' },
  ];
  container.innerHTML = '';
  gens.forEach(g => {
    const layer = action.layers[g.key];
    const el = document.createElement('div');
    el.className = 'gen-card' + (g.key === currentGeneration ? ' active' : '');
    el.dataset.gen = g.key;
    el.innerHTML =
      `<div class="gen-card-emoji">${layer.emoji}</div>` +
      `<div class="gen-card-name">${g.name}</div>` +
      `<div class="gen-card-big">${layer.big}</div>` +
      `<div class="gen-card-small">${layer.small}</div>` +
      `<div class="gen-card-tag">${layer.tag}</div>`;
    el.addEventListener('click', () => {
      currentGeneration = g.key;
      syncTabActive();
      renderCreatorPanel();
      renderDataflowPanel();
    });
    container.appendChild(el);
  });
}

// ============== mini canvas 预览：伊莱（仅 NPC 动作下显示） ==============

function renderBardMiniPreview() {
  const c = document.getElementById('bard-preview-canvas');
  if (!c) return;
  const pctx = c.getContext('2d');
  pctx.clearRect(0, 0, c.width, c.height);
  pctx.imageSmoothingEnabled = false;
  ctx = pctx;
  pctx.save();
  pctx.scale(4, 4);
  try {
    drawFloorTile(0, 0);
    drawRug(0, 0, 0, 0);
    pctx.fillStyle = 'rgba(0,0,0,0.32)';
    pctx.beginPath();
    pctx.ellipse(16, 28, 8, 2.5, 0, 0, Math.PI * 2);
    pctx.fill();
    drawCharBard(0, 0);
  } finally {
    pctx.restore();
    ctx = mainCtx;
  }
}

// ============== 主渲染入口 ==============

function renderCreatorPanel() {
  const action = CREATIVE_ACTIONS[currentCreativeAction];
  if (!action) return;

  renderActionSelector();
  document.getElementById('creator-headline').textContent = action.headline;

  // npc 动作：走「演进叙事」，隐藏 3 层卡 + 双栏 + cost chip
  const isNpc = (currentCreativeAction === 'npc');
  const evo = document.getElementById('creator-evolution');
  const gens = document.getElementById('creator-gen-cards');
  const chip = document.getElementById('creator-cost-chip');
  const dual = document.getElementById('creator-dual');

  if (isNpc) {
    renderNpcEvolution();
    gens.style.display = 'none';
    chip.style.display = 'none';
    dual.style.display = 'none';
  } else {
    evo.classList.remove('show');
    evo.innerHTML = '';
    gens.style.display = '';
    chip.style.display = '';
    dual.style.display = '';

    const layer = action.layers[currentGeneration];
    renderGenCards();
    chip.textContent = layer.chip;
    document.getElementById('creator-write-body').innerHTML = layer.write();
    const runtimeFn = RUNTIME_VIEWS[currentCreativeAction]?.[currentGeneration];
    document.getElementById('creator-runtime-body').innerHTML =
      runtimeFn ? runtimeFn() : '<div style="color:#666">(暂未编写运行态草稿)</div>';
  }

  // 发布按钮文案 / 行为联动
  const btn = document.getElementById('creator-publish-btn');
  const status = document.getElementById('creator-publish-status');
  if (currentCreativeAction === 'npc' && bardPublished) {
    btn.disabled = true;
    btn.textContent = '✅ 已发布';
    status.textContent = '伊莱已在驿站 —— 切到玩家模式去找他对话。';
  } else {
    btn.disabled = false;
    btn.textContent = action.publishLabel;
    status.textContent = '';
  }

  // 仅 NPC 动作下渲染 mini canvas
  if (currentCreativeAction === 'npc') {
    renderBardMiniPreview();
  }
}

// ============== 4 个预设玩家状态（仅 NPC 动作下生效） ==============

const PREVIEW_STATES = {
  first: { label: '初遇', apply() {
    player.behaviorTags = []; player.inventory = []; player.hp = 100; player.visitCount = 0;
    worldState.weather = 'clear'; worldState.timeOfDay = 'evening'; worldState.bloodMoonCountdown = 2;
    memory.entries = [];
  }},
  thief: { label: '偷过汤', apply() {
    player.behaviorTags = ['thief']; player.inventory = ['暖暖汤']; player.hp = 90; player.visitCount = 1;
    worldState.weather = 'clear'; worldState.timeOfDay = 'evening'; worldState.bloodMoonCountdown = 2;
    memory.entries = [{ timestamp: Date.now(), event: 'steal', npcId: null, detail: '偷取了老板娘柜台上的暖暖汤' }];
  }},
  helpful: { label: 'helpful', apply() {
    player.behaviorTags = ['helpful']; player.inventory = []; player.hp = 80; player.visitCount = 4;
    worldState.weather = 'clear'; worldState.timeOfDay = 'evening'; worldState.bloodMoonCountdown = 1;
    memory.entries = [
      { timestamp: Date.now(), event: 'dialogue', npcId: 'hostess', detail: '把矿石交给了惠子' },
      { timestamp: Date.now(), event: 'dialogue', npcId: 'soldier', detail: '在血月夜帮助驿站加固了防线' },
    ];
  }},
  extreme: { label: '复杂复合', apply() {
    player.behaviorTags = ['helpful']; player.inventory = ['矿石']; player.hp = 35; player.visitCount = 4;
    worldState.weather = 'rain'; worldState.timeOfDay = 'night'; worldState.bloodMoonCountdown = 1;
    worldState.caveStatus = 'quest_accepted';
    memory.entries = [
      '偷取了老板娘柜台上的暖暖汤',
      '归还了偷来的暖暖汤',
      '在血月夜帮老板娘加固了驿站防线',
      '接受了惠子的请求，答应去调查东边山洞',
    ].map(d => ({ timestamp: Date.now(), event: 'dialogue', npcId: null, detail: d }));
  }},
};

let creatorCurrentState = 'first';

async function speakBardPreview() {
  const s = PREVIEW_STATES[creatorCurrentState]; if (!s) return;
  s.apply();
  const nameEl = document.getElementById('preview-dialogue-name');
  const textEl = document.getElementById('preview-dialogue-text');
  nameEl.textContent = '🎻 流浪诗人·伊莱';
  let result;
  if (currentGeneration === 'gen3') {
    textEl.textContent = '思考中…';
    result = await gen3Talk('bard', { onDelta: (p) => { textEl.textContent = p; } });
    textEl.textContent = result.dialogue;
  } else if (currentGeneration === 'gen2') {
    result = gen2Talk('bard'); textEl.textContent = result.dialogue;
  } else {
    result = gen1Talk('bard'); textEl.textContent = result.dialogue;
  }
}

// ============== 发布 NPC（仅 NPC 动作） ==============

function publishBard() {
  bardPublished = true;
  bardPublishedAt = Date.now();
  logWriteBack('🎨 创作者发布 NPC：bard', [
    { label: 'bardPublished =', value: 'true' },
    { label: 'npcs[bard].visible =', value: '(由 SKILL/JSON/表 解析后渲染)' },
    { label: 'memory.entries +=', value: '(玩家下次走过去对话才会触发)' },
  ]);
  setMode('player');
  renderCreatorPanel();
}

// ============== V2：同一创作任务 × 三阶段数据栈并排对比 ==============

const V2_SCENES = {
  project: {
    key: 'project',
    icon: '🏗️',
    name: '新建游戏项目',
    subtitle: '从零搭一个驿站',
    contextTitle: '设计师交付的素材',
    tags: ['map', 'tiles', 'npcs', 'core_loop'],
    delivery: [
      { k: '🗺️ 地图',  v: '20×15 = 300 格 tile · plain_stable 场景' },
      { k: '👥 NPC',   v: '老板娘 · 商人 · 士兵 · 流浪诗人 4 个角色' },
      { k: '🎒 系统',  v: '账号 / 背包 / HP / 金币 / 任务' },
      { k: '📍 美术',  v: '贴图 · 音效 · 装饰物' },
    ],
    playerState: '想让玩家"打开游戏 → 走进驿站 → 跟 NPC 互动"',
    speakerPos: { tx: 6, ty: 4 },
    stages: {
      structured: {
        gameLook: '能跑的最小驿站',
        mockOpts: { includeNPCs: true, includeBard: false, includeItems: false },
        mockCaption: '地图能走 · 4 NPC 站着 · 对话固定',
        npcReply: { speaker: '👩 老板娘', text: '"欢迎光临驿站。"' },
        creatorEffort: {
          big: '10+ 张表', small: '几百行 INSERT',
          bullets: [
            '建表：<code>scenes / tile_map / npcs / dialogue_nodes / items / users / quests …</code>',
            'tile_map 一张 = 300 行 INSERT（20×15 网格）',
            '加一种 NPC 行为 = <code>ALTER TABLE</code> + 改外键 + 数据迁移',
          ],
        },
        verdict: '稳 · 但内容扩展靠改表 · 多状态组合配置爆炸',
      },
      flexible: {
        gameLook: '素材丰满的驿站',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: '资产齐全 · NPC 模板有分支',
        npcReply: { speaker: '👩 老板娘', text: '"雨夜里你又来了，先去暖暖手吧。"' },
        creatorEffort: {
          big: '+ 1 份 JSON / NPC', small: '~80 行 / 角色',
          bullets: [
            '场景 tile 转 <code>mongo.scene_doc</code>（JSON 灵活描述）',
            '每个 NPC 一份 <code>npc_profile.json</code>（性格 + 模板分支）',
            '资产搬到 <code>S3</code> + <code>mongo.asset_tags</code> 按 tag 检索',
          ],
        },
        verdict: '画面丰满 · 内容可配 · 但多信号融不了 · 性格字段不读',
      },
      semantic: {
        gameLook: '活的驿站',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: 'NPC 按经历说话 · 信息在 NPC 间流通',
        npcReply: { speaker: '👩 老板娘', text: '"刚才商人还念叨你呢——上回那笔账，他可没忘。"' },
        creatorEffort: {
          big: '+ 1 份 .md / NPC', small: '~50 行 / 角色',
          bullets: [
            '每个 NPC 一份 <code>skills/*.md</code>（性格 + 知识边界）',
            'memory / vector / graph 由平台自动维护',
            '改一句 .md = 改 NPC 行为，不用 <code>ALTER TABLE</code>',
          ],
        },
        verdict: '同样一张地图 · NPC 真正活了 · 推理写回结构化层兜底',
      },
    },
  },

  npc: {
    key: 'npc',
    icon: '🎻',
    name: '新增 NPC',
    subtitle: '吟游诗人·伊莱',
    contextTitle: '设计师交付的素材',
    tags: ['character', 'bard', 'instrument'],
    delivery: [
      { k: '🖼️ 立绘', v: 'bard.png · 紫红软帽 + 鲁特琴' },
      { k: '🎵 语音', v: 'bard_intro.wav' },
      { k: '📄 设定', v: '流浪诗人 / 押韵 / 浪漫爱夸张' },
      { k: '📍 位置', v: '(10, 6)' },
    ],
    playerState: '玩家 = thief（偷过汤未还）+ 受伤 + 夜雨 · 第 3 次造访',
    speakerPos: { tx: 10, ty: 6 },
    stages: {
      structured: {
        gameLook: '伊莱进场，只说一句固定话',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: false },
        mockCaption: '玩家走过去 → 触发固定对话节点',
        npcReply: { speaker: '🎻 伊莱', text: '"旅人啊，愿风指引你的路。"' },
        creatorEffort: {
          big: '5 张表', small: '~12 行 INSERT',
          bullets: [
            '建表：<code>npc_types / npcs / dialogue_nodes / bard_lines / conditions</code>',
            '想覆盖 32 种状态组合（thief × 天气 × 时段）→ <code>INSERT</code> 96 条',
            '加新条件 → <code>ALTER TABLE</code> + 写新 SQL',
          ],
        },
        verdict: '能加进去 · 但组合爆炸到 96 条 INSERT',
      },
      flexible: {
        gameLook: '伊莱按 thief tag 说带条件的话',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: '按 thief tag 命中 npc_profile 模板',
        npcReply: { speaker: '🎻 伊莱', text: '"一碗暖汤失了踪，炉火旁边起了风。"' },
        creatorEffort: {
          big: '1 份 JSON', small: '~80 行',
          bullets: [
            '一份 <code>bard_001.json</code>：角色 + 性格 + 模板分支 + 知识源',
            '加新条件 → 在 <code>templates[]</code> 里加一项 cond',
            '性格 <code>traits</code> 字段写了，但运行时不读',
          ],
        },
        verdict: '加字段不停机 · 但匹配只命中一条 · 性格字段不读',
      },
      semantic: {
        gameLook: '伊莱听见你的脚步、看见你的伤口、记得那碗汤',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: '所有信号融合 → Agent 一次推理',
        npcReply: { speaker: '🎻 伊莱', text: '"夜雨敲窗，炉火正旺——\n那碗汤，你已归还，像月归潮。"' },
        creatorEffort: {
          big: '3 类模型友好产物', small: '每 NPC ~50 行',
          bullets: [
            '<code>npc_profile.md</code> — 性格 / 人设 / 说话风格（静态）',
            '<code>memory.jsonl + vector</code> — 历史事件 + 相似剧情召回（动态）',
            '<code>skills/*.md</code> — 行为边界 + 工具调用说明（边界）',
          ],
        },
        verdict: '创作成本最低 · 表达最丰富 · 不碰硬数据',
      },
    },
  },

  worldview: {
    key: 'worldview',
    icon: '🌍',
    name: '扩展世界观',
    subtitle: '导入《哈利波特》前 3 章',
    contextTitle: '上传材料',
    tags: ['novel', 'lore', 'magic_world'],
    delivery: [
      { k: '📖 原文', v: 'hp_book1_ch01-03.txt · ~30 万字' },
      { k: '📝 设定', v: '英式幽默 + 童话冒险 + 隐喻' },
      { k: '🛑 约束', v: '不剧透 ch04+ · 不创造原作没有的设定' },
    ],
    playerState: '玩家问"听说霍格沃茨有个传奇" · NPC 想引用世界观',
    speakerPos: { tx: 10, ty: 6 },
    stages: {
      structured: {
        gameLook: 'NPC 说话像在念字段表',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: false },
        mockCaption: '多表 JOIN 拼字符串',
        npcReply: { speaker: '🎻 伊莱', text: '"哈利·波特 · 巫师 · protagonist。来自 c_voldemort 的 archenemy。"' },
        creatorEffort: {
          big: '10+ 张表', small: '几百条 INSERT',
          bullets: [
            '建表：<code>chapters / characters / locations / events / relations / items / themes</code>',
            '手工拆解全本小说 → 字段化',
            '7 本书要重做 7 遍 · 工作量随章节线性增长',
          ],
        },
        verdict: '只能拿字段值 · 氛围 / 隐喻 / 留白拼不出',
      },
      flexible: {
        gameLook: 'NPC 能拼出大段背景描述，但是死的',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: 'JSON 字段拼装',
        npcReply: { speaker: '🎻 伊莱', text: '"ch01 涉及哈利、邓布利多、海格。事件：路灯被熄、麦格化作猫、海格摩托送婴。"' },
        creatorEffort: {
          big: '1 份大 JSON', small: '~500 行',
          bullets: [
            '一份 <code>novel_hp_book1.json</code>：章节树 + 人物卡 + 关系图 + 主题',
            '原文 .txt 留档到 <code>S3</code>',
            '关键引用做 <code>ES</code> 索引',
          ],
        },
        verdict: 'JSON 字段拼装 · 留白和伏笔表达不出 · 30 万字塞不进 prompt',
      },
      semantic: {
        gameLook: 'NPC 真正"读过"哈利波特，用诗化语言转述',
        mockOpts: { includeNPCs: true, includeBard: true, includeItems: true },
        mockCaption: '向量召回 + 自然语言生成',
        npcReply: { speaker: '🎻 伊莱', text: '"前几日，有个从更远地方来的旅人，说起一个额头有伤疤的男孩——\n风，把这种故事吹到很多驿站去了。"' },
        creatorEffort: {
          big: '0 份手工拆解', small: '上传原文 + 1 份 .md',
          bullets: [
            '上传 <code>hp_book1.txt</code> 原文（平台自动 embedding 切片）',
            '写一份 <code>constraints.md</code>：不剧透 ch04+ / 不创造新设定',
            '新加一章 = 上传新 .txt，无需重做',
          ],
        },
        verdict: '创作成本最低 · 改一段约束 = 改全局表达',
      },
    },
  },
};

// V2 三场景 × 三阶段的具体表 / 文档 / 资源（含字段 + 样例行，可点开看）
const V2_TABLES = {
  project: {
    structured: [
      { name: 'users', count: '1,024 行 · 账号',
        sample: { cols: ['id','email','name'],
          rows: [
            ['u_001','link@hyrule.io','林克'],
            ['u_002','zelda@hyrule.io','塞尔达'],
            ['…','…','…'],
          ] } },
      { name: 'scenes', count: '1 个 · plain_stable',
        sample: { cols: ['scene_id','name','width','height'],
          rows: [['plain_stable','草原驿站','20','15']] } },
      { name: 'tile_map', count: '20 × 15 = 300 格',
        sample: { cols: ['scene_id','x','y','tile'],
          rows: [
            ['plain_stable','0','0','TREE'],
            ['plain_stable','5','4','FLOOR'],
            ['plain_stable','10','10','DOOR'],
            ['…','…','…','…'],
          ] } },
      { name: 'npcs', count: '4 个 · 老板娘 / 商人 / 士兵 / 伊莱',
        sample: { cols: ['id','name','x','y'],
          rows: [
            ['hostess','驿站老板娘','6','4'],
            ['merchant','旅行商人','6','6'],
            ['soldier','驻扎士兵','6','8'],
            ['bard','流浪诗人·伊莱','10','6'],
          ] } },
      { name: 'dialogue_nodes', count: '4 条固定对话',
        sample: { cols: ['id','npc_id','cond','text'],
          rows: [
            ['dn_default','bard','NULL','旅人啊，愿风指引你的路。'],
            ['dn_thief','bard','tag=thief','一碗暖汤失了踪…'],
            ['…','…','…','…'],
          ] } },
      { name: 'items', count: '玩家背包 + HP / 金币',
        sample: { cols: ['user_id','item','qty'],
          rows: [
            ['u_001','soup','1'],
            ['u_001','rupee','120'],
          ] } },
      { name: 'redis://session:*', count: '🚀 缓存 · ~3000 活跃 token',
        sample: { cols: ['key','value','TTL'],
          rows: [
            ['session:u_001','{uid:"u_001"}','7 天'],
            ['…','…','…'],
          ] } },
      { name: 's3://avatars', count: '🖼️ 玩家头像 · ~1024 张',
        sample: { cols: ['key','size'],
          rows: [
            ['avatars/u_001.png','12 KB'],
            ['…','…'],
          ] } },
    ],
    flexible: [
      { name: 'mongo.npc_profiles', count: '4 文档 · 每 NPC 一份 JSON',
        sample: { cols: ['_id','profile (JSON 节选)'],
          rows: [
            ['hostess_001','{ traits:["热情","八卦"], templates:[...] }'],
            ['bard_001','{ traits:["浪漫","爱夸张"], speech_style:"押韵" }'],
            ['…','…'],
          ] } },
      { name: 's3.assets', count: '🖼️ 12 张贴图 · 🎵 8 个音效',
        sample: { cols: ['key','size','content_type'],
          rows: [
            ['bard.png','28 KB','image/png'],
            ['rain.wav','180 KB','audio/wav'],
            ['…','…','…'],
          ] } },
      { name: 'mongo.asset_tags', count: '标签索引 · 木质 / 户外 / …',
        sample: { cols: ['asset','tags'],
          rows: [
            ['bard.png','["character","bard","instrument"]'],
            ['wall.png','["structure","wood","stable"]'],
            ['…','…'],
          ] } },
      { name: 'mongo.quest_drafts', count: '任务草稿 · schema 不稳',
        sample: { cols: ['_id','draft (JSON)'],
          rows: [
            ['q_001','{ name:"找回暖汤", branches:[...] }'],
            ['…','…'],
          ] } },
    ],
    semantic: [
      { name: 'skills/*.md', count: '📝 4 份 SKILL · 每 NPC 一份',
        sample: { cols: ['file','content (节选)'],
          rows: [
            ['skills/bard.md','# 流浪诗人\n## 性格\n- 浪漫\n- 爱夸张\n## 知识边界\n…'],
            ['skills/hostess.md','# 老板娘\n## 性格\n- 嘴硬心软\n…'],
            ['…','…'],
          ] } },
      { name: 'memory.jsonl', count: '🧠 per-player 事件流',
        sample: { cols: ['player','ts','event','detail'],
          rows: [
            ['u_001','14:22:01','steal','偷取了暖暖汤'],
            ['u_001','14:25:33','give','归还暖暖汤'],
            ['…','…','…','…'],
          ] } },
      { name: 'vector.public_rumors', count: '📢 NPC 间公开传闻流 · embedding',
        sample: { cols: ['rumor_id','speaker','text','embedding'],
          rows: [
            ['r_001','merchant','老板娘气得不轻','[0.12, -0.83, ...]'],
            ['r_002','soldier','昨夜有响动','[0.44, -0.21, ...]'],
            ['…','…','…','…'],
          ] } },
      { name: 'constraints.md', count: '🛑 一致性约束',
        sample: { cols: ['rule'],
          rows: [
            ['NPC 不能引用玩家私密状态'],
            ['不滥发奖励 · 物品发放仍走 SQL 事务'],
            ['…'],
          ] } },
    ],
  },

  npc: {
    structured: [
      { name: 'npc_types', count: '1 行 · 新增 bard 类型',
        sample: { cols: ['type_id','type_name','default_behavior'],
          rows: [['bard','吟游诗人','sing_dialogue']] } },
      { name: 'npcs', count: '1 行 · 伊莱',
        sample: { cols: ['npc_id','npc_type','name','location'],
          rows: [['bard_001','bard','流浪诗人·伊莱','plain_stable']] } },
      { name: 'dialogue_nodes', count: '4 行 · 4 种条件话术',
        sample: { cols: ['id','cond','text'],
          rows: [
            ['dn_default','NULL','旅人啊，愿风指引你的路。'],
            ['dn_thief','tag=thief','一碗暖汤失了踪…'],
            ['dn_helpful','tag=helpful','有人守住血月夜…'],
            ['dn_combo','thief+helpful','他曾偷汤惹人恼…'],
          ] } },
      { name: 'bard_lines', count: '3 行 · 歌谣库',
        sample: { cols: ['bl_id','cond','text'],
          rows: [
            ['bl_001','blood_moon=0','血月夜里…'],
            ['bl_002','rain+night','雨夜风急…'],
            ['bl_003','visit>=3','故人重来…'],
          ] } },
      { name: 'conditions', count: '4 行 · 触发表达式',
        sample: { cols: ['cond_id','expr'],
          rows: [
            ['cond_thief',"player.tags @> '[thief]'"],
            ['cond_helpful',"player.tags @> '[helpful]'"],
            ['cond_blood_moon','world.blood_moon = 0'],
          ] } },
    ],
    flexible: [
      { name: 'mongo.npc_profiles', count: '1 文档 · bard_001 (~80 行 JSON)',
        sample: { cols: ['_id','profile (JSON 节选)'],
          rows: [
            ['bard_001','{ traits:["浪漫","爱夸张"], speech_style:"押韵", templates:[{cond:"thief",text:"..."}], knowledge_sources:["station_rumors"] }'],
          ] } },
      { name: 's3.assets', count: '2 个文件',
        sample: { cols: ['key','size'],
          rows: [
            ['assets/bard.png','28 KB'],
            ['assets/bard_intro.wav','180 KB'],
          ] } },
      { name: 'es.npc_idx', count: '伊莱 1 个文档 · 性格关键词',
        sample: { cols: ['npc_id','tags','traits_text'],
          rows: [
            ['bard_001','["character","bard"]','浪漫 爱夸张 押韵'],
          ] } },
    ],
    semantic: [
      { name: 'skills/bard.md', count: '1 份 markdown (~50 行)',
        sample: { cols: ['file','content (节选)'],
          rows: [
            ['skills/bard.md','# 流浪诗人\n## 性格\n- 浪漫、爱夸张\n## 知识边界\n- 可访问：驿站传闻\n- 不可访问：玩家私密状态\n## 对待玩家\n- thief + 未还：歌谣点名\n- 受伤+雨夜：写入诗'],
          ] } },
      { name: 'memory.jsonl', count: 'per-player 事件流',
        sample: { cols: ['player','ts','event','detail'],
          rows: [
            ['u_001','14:22','steal','偷取了暖暖汤'],
            ['u_001','14:25','give','归还暖暖汤'],
            ['u_001','14:30','dialogue','聊起东边山洞'],
          ] } },
      { name: 'vector.public_rumors', count: 'NPC 间传闻流（embedding）',
        sample: { cols: ['rumor_id','speaker','text','embedding'],
          rows: [
            ['r_001','merchant','老板娘气得不轻','[0.12, -0.83, ...]'],
            ['r_002','soldier','昨夜有响动','[0.44, -0.21, ...]'],
          ] } },
    ],
  },

  worldview: {
    structured: [
      { name: 'chapters', count: '3 行 · ch01-ch03',
        sample: { cols: ['id','title','order'],
          rows: [
            ['ch01','幸存的男孩','1'],
            ['ch02','消失的玻璃','2'],
            ['ch03','许多猫头鹰从天而降','3'],
          ] } },
      { name: 'characters', count: '6 行 · 主要角色',
        sample: { cols: ['id','name','type','role'],
          rows: [
            ['c_harry','哈利·波特','wizard','protagonist'],
            ['c_dumbledore','阿不思·邓布利多','wizard','mentor'],
            ['c_voldemort','伏地魔','wizard','archenemy'],
            ['…','…','…','…'],
          ] } },
      { name: 'events', count: '数十行 · 章节事件',
        sample: { cols: ['id','chapter_id','summary'],
          rows: [
            ['e1','ch01','邓布利多熄灭路灯，与麦格教授密谈'],
            ['e2','ch01','海格骑摩托车把婴儿哈利送到女贞路'],
            ['e3','ch02','哈利在动物园让蟒蛇玻璃消失'],
            ['…','…','…'],
          ] } },
      { name: 'relations', count: '关系网',
        sample: { cols: ['from','to','type'],
          rows: [
            ['c_harry','c_voldemort','archenemy'],
            ['c_harry','c_dudley','cousin/bullied'],
            ['c_dumbledore','c_voldemort','opponent'],
          ] } },
      { name: 'items / themes / locations / dialogue_excerpts', count: '~30 行 · 7 张辅助表',
        sample: { cols: ['table','rows'],
          rows: [
            ['items','闪电形伤疤 / 霍格沃茨录取信 / 隐形斗篷 …'],
            ['themes','勇气 / 友谊 / 选择'],
            ['locations','女贞路 / 戈德里克山谷 / 霍格沃茨'],
          ] } },
    ],
    flexible: [
      { name: 'mongo.novel_anno', count: '1 大 JSON · ~500 行',
        sample: { cols: ['_id','doc (JSON 节选)'],
          rows: [
            ['hp_book1','{ title:"哈利·波特与魔法石", chapters:[{ id:"ch01", summary:"…", events:[…], characters_present:[…] }], characters:[…], relations:[…] }'],
          ] } },
      { name: 's3.novels', count: '1 个文件 · 原文留档',
        sample: { cols: ['key','size'],
          rows: [['novels/hp_book1.txt','~300 KB']] } },
      { name: 'es.novel_quotes', count: '关键引用索引',
        sample: { cols: ['quote_id','speaker','text'],
          rows: [
            ['q_001','海格','哈利，你是一个巫师。'],
            ['q_002','邓布利多','幸福可以在最黑暗的时刻被找到…'],
          ] } },
    ],
    semantic: [
      { name: 'vector.hp_chunks', count: '~100 个 chunk · 切分 + embedding',
        sample: { cols: ['chunk_id','text (节选)','embedding'],
          rows: [
            ['hp_ch01_p3','邓布利多熄灭路灯…','[0.12, -0.83, ...]'],
            ['hp_ch02_p7','哈利让蟒蛇玻璃消失…','[0.44, -0.21, ...]'],
            ['…','…','…'],
          ] } },
      { name: 'constraints.md', count: '1 份约束 (~10 行)',
        sample: { cols: ['rule'],
          rows: [
            ['不剧透 ch04 之后的剧情'],
            ['不创造原作里没有的设定'],
            ['NPC 不能引用玩家私密状态'],
          ] } },
      { name: 'skills/bard.md', count: '复用 · 诗化转述风格',
        sample: { cols: ['file','content (节选)'],
          rows: [
            ['skills/bard.md','## 引用世界观风格\n- 不直接说人名（"那个连名字都不能提的人"）\n- 用意象代替直白叙述'],
          ] } },
    ],
  },
};

let currentV2Scene = 'project';
let prevV2Scene = null;  // 用于场景切换 diff

// 会议闭环：必选 / 建议 / 可选 平台能力清单
const V2_PLATFORM_CAPS = [
  { tier: '必选', tierClass: 'tier-required', desc: '任何游戏平台都需要', items: [
    { name: 'MySQL / Redis', desc: '硬状态 · 事务 · 权限 · 会话' },
    { name: 'S3', desc: '图片 / 音频 / 文档等原始文件' },
    { name: 'MongoDB', desc: '场景 / NPC / 草稿 / 中间态等灵活文档' },
    { name: 'ES / 标签', desc: '关键词和素材检索' },
    { name: 'Markdown / JSON', desc: '模型友好的上下文组织' },
  ]},
  { tier: '建议', tierClass: 'tier-recommended', desc: 'AI-native 场景需要', items: [
    { name: 'Vector / Memory', desc: '语义召回 · NPC 记忆 · 相似剧情' },
    { name: 'LLM Agent', desc: '推理 · 工具调用 · 鉴别诊断' },
  ]},
  { tier: '可选', tierClass: 'tier-optional', desc: '复杂场景才需要', items: [
    { name: 'Graph DB', desc: '复杂角色关系 / 阵营 / 事件传播' },
    { name: 'Hive / ETL', desc: '离线批量加工和分析' },
    { name: '多模态理解', desc: '图像 / 音频 / 视频语义' },
  ]},
];

function renderCreatorV2() {
  renderV2Scenes();
  renderV2Context();
  renderV2Compare();
  renderV2PlatformCaps();
}

function renderV2PlatformCaps() {
  const el = document.getElementById('v2-platform-caps');
  if (!el) return;
  const tiersHtml = V2_PLATFORM_CAPS.map(t => {
    const itemsHtml = t.items.map(it =>
      `<div class="v2-cap-row"><span class="v2-cap-name">${it.name}</span><span class="v2-cap-desc">${it.desc}</span></div>`
    ).join('');
    return `
      <div class="v2-cap-tier ${t.tierClass}">
        <div class="v2-cap-tier-head">
          <span class="v2-cap-tier-name">${t.tier}</span>
          <span class="v2-cap-tier-desc">${t.desc}</span>
        </div>
        <div class="v2-cap-list">${itemsHtml}</div>
      </div>`;
  }).join('');
  el.innerHTML = `
    <div class="v2-platform-title">🏗️ 平台能力清单 · 推演结论</div>
    <div class="v2-platform-sub">基于以上三阶段对比，推演出我们平台需要做的能力</div>
    <div class="v2-platform-grid">${tiersHtml}</div>
  `;
}

function renderV2Scenes() {
  const el = document.getElementById('v2-scenes');
  if (!el) return;
  el.innerHTML = Object.values(V2_SCENES).map(s => {
    const active = s.key === currentV2Scene ? ' active' : '';
    return `
      <button class="v2-scene-card${active}" data-scene="${s.key}">
        <span class="v2-scene-icon">${s.icon}</span>
        <span class="v2-scene-info">
          <span class="v2-scene-name">${s.name}</span>
          <span class="v2-scene-sub">${s.subtitle}</span>
        </span>
      </button>`;
  }).join('');
  el.querySelectorAll('.v2-scene-card').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.scene !== currentV2Scene) {
        prevV2Scene = currentV2Scene;
        currentV2Scene = btn.dataset.scene;
        renderCreatorV2();
      }
      btn.blur();
    });
  });

  // 切换 diff banner
  const diffEl = document.getElementById('v2-diff-banner');
  if (diffEl) {
    if (prevV2Scene && prevV2Scene !== currentV2Scene) {
      const prev = V2_SCENES[prevV2Scene];
      const curr = V2_SCENES[currentV2Scene];
      const prevTables = V2_TABLES[prevV2Scene] || {};
      const currTables = V2_TABLES[currentV2Scene] || {};
      const diffByStage = ['structured','flexible','semantic'].map(k => {
        const prevNames = new Set((prevTables[k] || []).map(t => t.name));
        const added = (currTables[k] || []).filter(t => !prevNames.has(t.name)).map(t => t.name);
        return { key: k, added };
      });
      const totalAdded = diffByStage.reduce((sum, d) => sum + d.added.length, 0);
      diffEl.innerHTML = `
        <div class="v2-diff-inner">
          <span class="v2-diff-arrow">${prev.icon} ${prev.name} → ${curr.icon} ${curr.name}</span>
          <span class="v2-diff-summary">相比上一场景，<b>新增 ${totalAdded} 个表 / 文档</b>（已在下方标 <span class="v2-tbl-new">+ NEW</span>）</span>
        </div>`;
      diffEl.classList.add('visible');
    } else {
      diffEl.innerHTML = '';
      diffEl.classList.remove('visible');
    }
  }
}

function renderV2Context() {
  const el = document.getElementById('v2-context');
  if (!el) return;
  const s = V2_SCENES[currentV2Scene];
  const tagsHtml = s.tags.map(t => `<span class="v2-tag">${t}</span>`).join('');
  const deliveryHtml = s.delivery.map(d =>
    `<div class="v2-delivery-row"><span class="v2-d-k">${d.k}</span><span class="v2-d-v">${d.v}</span></div>`
  ).join('');
  el.innerHTML = `
    <div class="v2-ctx-head">
      <span class="v2-ctx-icon">${s.icon}</span>
      <span class="v2-ctx-title">${s.name} · ${s.subtitle}</span>
      <span class="v2-ctx-tags">${tagsHtml}</span>
    </div>
    <div class="v2-ctx-body">
      <div class="v2-ctx-section">
        <div class="v2-ctx-section-title">${s.contextTitle}</div>
        <div class="v2-delivery">${deliveryHtml}</div>
      </div>
      <div class="v2-ctx-section">
        <div class="v2-ctx-section-title">📍 当前玩家状态 / 调用上下文</div>
        <div class="v2-player-state">${s.playerState}</div>
      </div>
    </div>
  `;
}

function renderV2Compare() {
  const el = document.getElementById('v2-compare');
  if (!el) return;
  const s = V2_SCENES[currentV2Scene];
  const stages = [
    { key: 'structured', num: 1, label: '阶段 1 · 结构化存储 / MySQL + Redis', cls: 'v2-stage-1',
      architecture: [
        { kind: 'pain', title: '👥 团队对齐成本（大家一顿怼）', items: [
          '加 <code>personality</code> 字段要拉策划 / 后端 / 客户端三方开会对齐',
          '32 种组合状态 → 字段方案反复改 3 版才落地',
          '<code>ALTER TABLE</code> 上线要停服 · 一次改表 = 一次大讨论',
        ]},
        { kind: 'arch', title: '📐 架构形态：单实例 MySQL + Redis 缓存', items: [
          '高并发读 → 撑不住 → 加 <b>Redis</b> 缓存挡一层',
          '写仍走<b>主库单点</b> · 是 QPS 瓶颈',
        ]},
      ],
      prosCons: {
        prosLabel: '✅ 适合',
        consLabel: '⚠️ 不适合',
        pros: [
          '账号 / 库存 / 金币 / 任务 / 支付',
          '权限 / 状态机 / 会话',
          '高并发硬状态读写',
          '需要事务和强一致性的场景',
        ],
        cons: [
          '频繁变化的内容配置（每周加新字段）',
          '海量素材 / 大文件（图 / 音 / 视频 / PDF）',
          '语义理解（"嘴硬心软"无法字段化）',
          '组合状态多维爆炸的内容',
        ],
        nextSolves: [
          { icon: '📦', text: 'schema 不固定 → <b>MongoDB</b> JSON 文档' },
          { icon: '🖼️', text: '大文件解耦 → <b>S3</b> + CDN' },
          { icon: '🔍', text: '标签 / 关键词检索 → <b>ES</b>' },
        ],
        nextLabel: '⬇️ 引入半结构化层，解决',
      },
    },
    { key: 'flexible',   num: 2, label: '阶段 2 · 半结构化存储 / MongoDB + S3 + ES', cls: 'v2-stage-2',
      architecture: [
        { kind: 'arch', title: '📐 架构形态：MongoDB Replica Set（1 主 N 从）+ S3', items: [
          '<b>写</b>：所有 insert / update 走 primary',
          '<b>读</b>：从 N 个 secondary 分流 → <b>QPS × N</b>',
          '解决阶段 1 单点 QPS 瓶颈',
        ]},
        { kind: 'code', title: '💾 海量批量操作（阶段 1 做不到）', lines: [
          'db.assets.insertMany([ /* 100,000 条素材 */ ])',
          'db.scenes.bulkWrite([ /* 批量场景配置 */ ])',
          's3.uploadMultipart(big_video_file)',
        ]},
        { kind: 'compare', title: '📂 附件加载 4 种方案对比', rows: [
          { tag: '❌', name: 'MySQL BLOB',              text: '表膨胀 / 备份慢 / 无 CDN' },
          { tag: '⚠️', name: 'MySQL + NFS',             text: '文件分离 · 但 NFS 单点 / 读取慢' },
          { tag: '✅', name: 'S3 + CDN',                text: '边缘加速 / 高可用 / 多副本' },
          { tag: '✨', name: 'S3 + Mongo 元数据 + ES',  text: '可按标签 / 关键词 / 类型搜资产' },
        ]},
      ],
      prosCons: {
        prosLabel: '✅ 适合',
        consLabel: '⚠️ 不适合',
        pros: [
          '<b>字段不固定</b>：每个文档长得不一样，不必为新属性改表',
          '场景配置 / NPC 档案 / 草稿等灵活文档',
          '素材文件（图 / 音 / 视频 / PDF）',
          '标签 / 关键词 / 全文检索',
          '批量导入 / 离线加工',
        ],
        cons: [
          '理解"嘴硬心软"等抽象描述',
          '生成符合性格的对话',
          '维护世界观一致性',
          '多信号融合（thief + 雨 + 受伤 → 模板只命中一条）',
          'NPC 长期记忆 / 共享信息',
        ],
        nextSolves: [
          { icon: '🤖', text: '多信号融合 → <b>Agent</b> 一次推理' },
          { icon: '🧲', text: '语义相似 → <b>向量检索</b>' },
          { icon: '🧠', text: '长期记忆 / 归纳 → <b>Memory</b>' },
          { icon: '🕸️', text: '关系网 → <b>图数据库</b>' },
        ],
        nextLabel: '⬇️ 引入模型友好层，解决',
      },
    },
    { key: 'semantic',   num: 3, label: '阶段 3 · 模型友好存储 / Vector + Memory + Agent', cls: 'v2-stage-3',
      architecture: [
        { kind: 'arch', title: '📐 架构形态：向量库 + Memory + Agent + LLM', items: [
          '<b>Vector DB</b>（Milvus / pgvector）· embedding 索引',
          '<b>Memory</b>（事件流 + 归纳）· per-player 长期记忆',
          '<b>Agent</b> · 一次推理融合多源（state + memory + skill + retrieval）',
        ]},
        { kind: 'code', title: '🔮 典型操作', lines: [
          "vector.search('一个额头有伤疤的男孩', topK=5)",
          'agent.invoke({ system: skill+memory, user: player_state })',
          'memory.append({ player, event, ts })',
        ]},
      ],
      prosCons: {
        prosLabel: '✅ 适合',
        consLabel: '🚫 不替代',
        pros: [
          '语义召回 / 自然语言 query',
          'NPC 长期记忆 / 角色经历',
          '动态对话 / 剧情生成',
          'Agent 工具调用 / 多信号融合',
          '上传原文即可（无需手工拆解结构）',
        ],
        cons: [
          '<b>不替代 MySQL</b> 的交易 / 库存 / 权限',
          '<b>不替代 S3</b> 的原始文件存储',
          '<b>不替代 MongoDB</b> 的场景配置 / NPC 档案',
          '推理成本（token / 延迟）高于 SQL 查询',
        ],
        nextSolves: [
          { icon: '🗄️', text: '硬数据（账号/库存/支付）→ 仍在 <b>MySQL</b>' },
          { icon: '📦', text: '场景配置 / 资产 / 文档 → 仍在 <b>MongoDB / S3 / ES</b>' },
          { icon: '✨', text: '理解 / 归纳 / 推理 → 这一层' },
        ],
        nextLabel: '✅ 三层叠加 · 一个都没退场',
      },
    },
  ];
  // speakerPos: tile 坐标 → 百分比定位（地图 20x15）
  const sp = s.speakerPos || { tx: 10, ty: 6 };
  const bubbleLeft = ((sp.tx + 0.5) / 20 * 100).toFixed(1);
  const bubbleTop  = (sp.ty / 15 * 100).toFixed(1);

  // 计算场景切换 diff：当前场景独有的表（跟上一个场景对比）
  let diffByStage = null;
  if (prevV2Scene && prevV2Scene !== currentV2Scene) {
    const currTables = V2_TABLES[currentV2Scene] || {};
    const prevTables = V2_TABLES[prevV2Scene] || {};
    diffByStage = {};
    ['structured','flexible','semantic'].forEach(k => {
      const prevNames = new Set((prevTables[k] || []).map(t => t.name));
      diffByStage[k] = (currTables[k] || []).filter(t => !prevNames.has(t.name)).map(t => t.name);
    });
  }

  el.innerHTML = stages.map((st, idx) => {
    const data = s.stages[st.key];
    const ce = data.creatorEffort;
    const bulletsHtml = ce.bullets.map(b => `<li>${b}</li>`).join('');
    const canvasId = `v2-mock-${st.key}`;

    // 推导"继承"：本阶段前面所有阶段的工作量都仍在跑
    let inheritedHtml = '';
    if (idx > 0) {
      const inheritedRows = stages.slice(0, idx).map(prev => {
        const prevCe = s.stages[prev.key].creatorEffort;
        return `
          <div class="v2-inh-row">
            <span class="v2-inh-tag ${prev.cls}">${prev.label.split('·')[0].trim()}</span>
            <span class="v2-inh-effort">${prevCe.big.replace(/^\+\s*/, '')} <span class="v2-inh-dim">· ${prevCe.small}</span></span>
          </div>`;
      }).join('');
      inheritedHtml = `
        <div class="v2-effort-inherited">
          <div class="v2-effort-section-title">⬇️ 继承（仍在跑）</div>
          ${inheritedRows}
        </div>`;
    }

    // 具体表 / 文档 / 资源（点开看示例）
    const tables = (V2_TABLES[currentV2Scene] && V2_TABLES[currentV2Scene][st.key]) || [];
    const stageDiffSet = diffByStage ? new Set(diffByStage[st.key] || []) : null;
    const tablesListHtml = tables.map(t => {
      const isDiff = stageDiffSet && stageDiffSet.has(t.name);
      const diffBadge = isDiff ? '<span class="v2-tbl-new">+ NEW</span>' : '';
      if (!t.sample) {
        return `<div class="db-table-row no-sample${isDiff ? ' tbl-diff' : ''}">
          <span class="db-table-name">📋 ${t.name}${diffBadge}</span>
          <span class="db-table-count">${t.count}</span>
        </div>`;
      }
      const colsHtml = t.sample.cols.map(c => `<th>${c}</th>`).join('');
      const rowsHtml = t.sample.rows.map(r =>
        `<tr>${r.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`
      ).join('');
      return `<details class="db-table-mock${isDiff ? ' tbl-diff' : ''}">
        <summary class="db-table-row">
          <span class="db-table-name">📋 ${t.name}${diffBadge}</span>
          <span class="db-table-count">${t.count} <span class="expand-hint">▸ 点开看</span></span>
        </summary>
        <div class="db-sample">
          <table>
            <thead><tr>${colsHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </details>`;
    }).join('');
    const tablesHtml = tables.length ? `
      <div class="v2-tables">
        <div class="v2-tables-label">📊 具体要建什么（点开看示例）</div>
        <div class="v2-tables-list">${tablesListHtml}</div>
      </div>` : '';

    return `
      <div class="v2-pane ${st.cls}">
        <div class="v2-pane-head">
          <div class="v2-pane-num">${st.label}</div>
        </div>
        <div class="v2-pane-body">
          <div class="v2-game-block">
            <div class="v2-block-label">🎮 玩家看到的游戏样子<span class="v2-output-tag">${data.gameLook}</span></div>
            <div class="v2-mock">
              <canvas id="${canvasId}" width="320" height="240"></canvas>
              <div class="v2-bubble" style="left:${bubbleLeft}%; top:${bubbleTop}%;">
                <div class="v2-bubble-speaker">${data.npcReply.speaker}</div>
                <div class="v2-bubble-text">${data.npcReply.text.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="v2-mock-caption">${data.mockCaption}</div>
            </div>
          </div>
          <div class="v2-effort-block">
            <div class="v2-block-label">📝 创作者要做什么</div>
            ${inheritedHtml}
            <div class="v2-effort-new">
              <div class="v2-effort-section-title v2-effort-new-title">${idx === 0 ? '🆕 从零开始' : '🆕 本层新增'}</div>
              <div class="v2-effort-head">
                <span class="v2-effort-big">${ce.big}</span>
                <span class="v2-effort-small">${ce.small}</span>
              </div>
              <ul class="v2-effort-list">${bulletsHtml}</ul>
              ${tablesHtml}
            </div>
          </div>

          ${(st.architecture || []).map(sec => {
            if (sec.kind === 'pain') {
              return `<div class="v2-arch-section v2-arch-pain">
                <div class="v2-arch-title">${sec.title}</div>
                <ul class="v2-arch-items">${sec.items.map(i => `<li>${i}</li>`).join('')}</ul>
              </div>`;
            }
            if (sec.kind === 'arch') {
              return `<div class="v2-arch-section v2-arch-arch">
                <div class="v2-arch-title">${sec.title}</div>
                <ul class="v2-arch-items">${sec.items.map(i => `<li>${i}</li>`).join('')}</ul>
              </div>`;
            }
            if (sec.kind === 'code') {
              return `<div class="v2-arch-section v2-arch-code">
                <div class="v2-arch-title">${sec.title}</div>
                <pre class="v2-code-block">${sec.lines.join('\n')}</pre>
              </div>`;
            }
            if (sec.kind === 'compare') {
              return `<div class="v2-arch-section v2-arch-compare">
                <div class="v2-arch-title">${sec.title}</div>
                <div class="v2-cmp-rows">${sec.rows.map(r =>
                  `<div class="v2-cmp-row"><span class="v2-cmp-tag">${r.tag}</span><span class="v2-cmp-name">${r.name}</span><span class="v2-cmp-text">${r.text}</span></div>`
                ).join('')}</div>
              </div>`;
            }
            return '';
          }).join('')}

          <div class="v2-proscons">
            <div class="v2-pc-grid">
              <div class="v2-pros">
                <div class="v2-pc-title v2-pros-title">${st.prosCons.prosLabel || '✅ 适合'}</div>
                <ul>${st.prosCons.pros.map(p => `<li>${p}</li>`).join('')}</ul>
              </div>
              <div class="v2-cons">
                <div class="v2-pc-title v2-cons-title">${st.prosCons.consLabel || '⚠️ 不适合'}</div>
                <ul>${st.prosCons.cons.map(c => `<li>${c}</li>`).join('')}</ul>
              </div>
            </div>
            <div class="v2-next-solves">
              <div class="v2-next-label">${st.prosCons.nextLabel}</div>
              <div class="v2-next-list">${
                st.prosCons.nextSolves.map(n =>
                  `<div class="v2-next-row"><span class="v2-next-icon">${n.icon}</span><span class="v2-next-text">${n.text}</span></div>`
                ).join('')
              }</div>
            </div>
          </div>

        </div>
      </div>`;
  }).join('');

  // innerHTML 替换后立即绘制三个 canvas
  stages.forEach(st => {
    const opts = s.stages[st.key].mockOpts || {};
    renderStationMockup(`v2-mock-${st.key}`, opts);
  });
}

// ============== V3：任务驱动 + 三代切换 + 证据展开 ==============

const V3_GENERATIONS = [
  {
    key: 'gen1', num: 1, cls: 'v3-gen-1',
    label: '结构化事实层',
    tech: 'MySQL + Redis',
    bigStatement: '让游戏跑起来',
    coreConclusion: '把游戏中需要稳定运行的事实落表：地图、坐标、NPC、任务、物品、玩家状态',
    answers: [
      { q: '归属', a: '这个 NPC 属于哪个地图 / 哪个项目' },
      { q: '状态', a: '玩家任务进行到哪一步' },
      { q: '位置', a: 'NPC / 物品在哪个坐标' },
      { q: '事务', a: '背包增减、任务奖励、商店交易是否一致' },
    ],
    solves: ['游戏运行 · 状态机', '事务 / 强一致 / ACID', '精确查询 · 外键 JOIN', '高并发读写'],
    notSolves: ['角色设定长文本', '对白风格 / 性格表达', '美术素材 / 大文件', '世界观语义理解', 'NPC 长期记忆'],
    nextNeeds: '所以加层 2 — <b>S3</b> 存素材，<b>MongoDB</b> 存动态配置，<b>ES</b> 做全文检索',
    evidence: [
      { label: '表结构', text: 'scenes / tile_map / npcs / items / quests / users · 5+ 张表' },
      { label: 'SQL', text: 'INSERT 96 条覆盖 32 种组合 · ALTER TABLE 加新字段要停服' },
      { label: 'Redis 缓存', text: '热点 NPC 状态 / 会话 / 排行榜 · 抗高并发读' },
      { label: '性能瓶颈', text: '写仍走主库单点 · 文件塞 BLOB 表膨胀' },
    ],
  },
  {
    key: 'gen2', num: 2, cls: 'v3-gen-2',
    label: '资产与半结构化层',
    tech: 'MongoDB + S3 + ES',
    bigStatement: '让资产装得下、搜得到、改得动',
    coreConclusion: '把创作资产装起来：角色设定、对白、素材、地图描述、世界观文档、标签',
    answers: [
      { q: '原件', a: 'NPC 头像、地图 tile、道具图标在哪里' },
      { q: '描述', a: '角色设定、对白、场景文本怎么存' },
      { q: '检索', a: '怎么按"老板娘 / 驿站 / 护送任务"找到内容' },
      { q: '扩展', a: '新增字段时能不能不改主表' },
    ],
    solves: ['大文件 / 海量素材（S3 + CDN）', '动态字段 / 灵活 schema', '全文 / 标签检索（ES）', '批量处理 · insertMany 10 万条', '读写分离 · QPS × N（Replica Set）'],
    notSolves: ['强事务一致性', '实时状态机', 'AI 语义理解', 'NPC 长期记忆 / 推理'],
    nextNeeds: '所以加层 3 — <b>Vector</b> 做语义召回，<b>Memory</b> 记录玩家经历，<b>Agent</b> 调用工具生成互动',
    evidence: [
      { label: 's3://assets', text: '头像 / 地图 tile / 音效 / 视频 · 大文件留档 + CDN 边缘加速' },
      { label: 'mongo.npc_profiles', text: '角色设定 + 模板分支（每个 NPC 文档长得不一样）' },
      { label: 'mongo.scene_docs', text: '场景灵活描述 · 加字段不停机' },
      { label: 'es.asset_tags', text: '按"木质 + 户外"组合标签搜资产' },
      { label: '关键事实', text: '"新增 15 个资产文件，不需要 ALTER TABLE"' },
    ],
  },
  {
    key: 'gen3', num: 3, cls: 'v3-gen-3',
    label: '模型友好层',
    tech: 'Vector + Memory + Agent',
    bigStatement: '让 NPC 懂上下文，能理解、记忆、生成',
    coreConclusion: '把前两层数据编译成 AI 可消费上下文：NPC 记忆、世界观、剧情状态、玩家偏好',
    answers: [
      { q: '语义', a: 'NPC 知道自己是谁、驿站发生过什么' },
      { q: '记忆', a: '老板娘记得玩家上次赊账' },
      { q: '推理', a: '士兵根据玩家等级调整任务' },
      { q: '调用', a: 'Agent 能查背包、查任务、生成对白' },
    ],
    solves: ['语义问答 / 自然语言 query', 'NPC 个性化互动', '剧情生成 / 押韵融合诗', '长期记忆 / 角色经历', 'Agent 工具调用 / 多信号融合'],
    notSolves: ['事实主存（不替代 MySQL）', '事务一致性（钱 / 库存 / 权限）', '素材原件保存（不替代 S3）', '毫秒级状态更新'],
    nextNeeds: '<b>回到层 1 / 层 2</b> — 模型输出不能直接当事实源；回写必须经过结构化状态机或资产层',
    evidence: [
      { label: 'vector.npc_lore', text: 'NPC 设定 / 世界观 chunk · embedding 索引 · 语义相似召回' },
      { label: 'memory.player_events', text: '玩家行为时间线 · per-player 长期记忆' },
      { label: 'graph.world_entities', text: '角色 / 势力 / 关系网 · 复杂世界观' },
      { label: 'agent.tools', text: 'query_inventory / check_quest / send_message · 工具调用' },
      { label: 'skills/bard.md', text: '性格 / 风格 / 知识边界 / 安全规则' },
    ],
  },
];

const V3_MATRIX = {
  dims: ['核心问题', '主数据', '技术', '优势', '不适合', '典型调用'],
  byGen: {
    gen1: ['游戏能不能稳定运行', '地图 / NPC / 任务 / 背包 / 状态', 'MySQL / Redis', '强一致 · 事务 · 低延迟', '大文件 · 动态字段 · 语义理解', '查 NPC 坐标 · 扣背包物品'],
    gen2: ['资产能不能装得下、搜得到', '角色设定 / 对白 / 美术 / 文档 / 标签', 'Mongo / S3 / ES / Hive', '灵活 schema · 文件管理 · 批量', '强事务 · 状态机', '找 NPC 头像 · 查对白文档'],
    gen3: ['AI 能不能理解和生成', '记忆 / 语义 chunk / 世界观图谱', 'Vector / Memory / Agent / Graph', '语义理解 · 个性化 · 生成', '事实主存 · 事务 · 原件', '生成 NPC 对话 · 回忆历史'],
  },
};

const V3_TASK_PLATFORM = [
  { tier: '必选', tierClass: 'tier-required', desc: '任何游戏平台都需要', items: [
    { name: 'MySQL / PG',      use: '地图、NPC、任务、背包、状态' },
    { name: 'Redis',           use: '热点状态、会话、排行榜、读写加速' },
    { name: 'S3 / 对象存储',   use: '图片、地图素材、音频、视频' },
    { name: 'Mongo / JSON',    use: 'NPC 设定、场景描述、动态配置' },
    { name: 'ES / 全文索引',   use: '搜索对白、资产、文档' },
  ]},
  { tier: '建议', tierClass: 'tier-recommended', desc: 'AI-native 创作需要', items: [
    { name: 'Vector',                  use: '世界观、NPC 设定、剧情语义召回' },
    { name: 'Memory',                  use: '玩家历史、NPC 长期记忆' },
    { name: 'Agent / Skill',           use: '查状态、生成对白、触发任务' },
    { name: 'Markdown / JSON 规范',    use: '给模型稳定消费的上下文格式' },
  ]},
  { tier: '可选', tierClass: 'tier-optional', desc: '复杂项目需要', items: [
    { name: 'Graph',          use: '世界观实体、势力、关系网' },
    { name: 'Hive / ETL',     use: '海量日志、行为分析、训练数据' },
    { name: '多模态解析',     use: '图片、音频、视频内容理解' },
    { name: '版本 / 血缘',    use: '创作资产版本管理、回滚、审计' },
  ]},
];

let currentV3Scene = 'project';
let currentV3Gen = 'gen1';

function renderCreatorV3() {
  renderV3Scenes();
  renderV3RawInput();
  renderV3GenTabs();
  renderV3GenDetail();
  renderV3Matrix();
  renderV3Platform();
}

function renderV3Scenes() {
  const el = document.getElementById('v3-scenes');
  if (!el) return;
  el.innerHTML = Object.values(V2_SCENES).map(s => {
    const active = s.key === currentV3Scene ? ' active' : '';
    return `
      <button class="v3-scene-card${active}" data-scene="${s.key}">
        <span class="v3-scene-icon">${s.icon}</span>
        <span class="v3-scene-info">
          <span class="v3-scene-name">${s.name}</span>
          <span class="v3-scene-sub">${s.subtitle}</span>
        </span>
      </button>`;
  }).join('');
  el.querySelectorAll('.v3-scene-card').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.scene !== currentV3Scene) {
        currentV3Scene = b.dataset.scene;
        renderCreatorV3();
      }
      b.blur();
    });
  });
}

function renderV3RawInput() {
  const el = document.getElementById('v3-raw-input');
  if (!el) return;
  const s = V2_SCENES[currentV3Scene];
  const deliveryHtml = s.delivery.map(d => `
    <div class="v3-input-row">
      <span class="v3-input-k">${d.k}</span>
      <span class="v3-input-v">${d.v}</span>
    </div>`).join('');
  el.innerHTML = `
    <div class="v3-input-need">
      <div class="v3-input-label">💬 创作者需求</div>
      <div class="v3-input-text">${s.playerState}</div>
    </div>
    <div class="v3-input-grid-wrap">
      <div class="v3-input-label">📦 拆出来的原始要素</div>
      <div class="v3-input-grid">${deliveryHtml}</div>
    </div>
  `;
}

function renderV3GenTabs() {
  const el = document.getElementById('v3-gen-tabs');
  if (!el) return;
  el.innerHTML = V3_GENERATIONS.map(g => {
    const active = g.key === currentV3Gen ? ' active' : '';
    return `
      <button class="v3-gen-tab ${g.cls}${active}" data-gen="${g.key}">
        <span class="v3-tab-num">第 ${g.num} 代</span>
        <span class="v3-tab-label">${g.label}</span>
        <span class="v3-tab-tech">${g.tech}</span>
      </button>`;
  }).join('');
  el.querySelectorAll('.v3-gen-tab').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.gen !== currentV3Gen) {
        currentV3Gen = b.dataset.gen;
        renderV3GenTabs();
        renderV3GenDetail();
      }
      b.blur();
    });
  });
}

function renderV3GenDetail() {
  const el = document.getElementById('v3-gen-detail');
  if (!el) return;
  const g = V3_GENERATIONS.find(x => x.key === currentV3Gen);
  const answersHtml = g.answers.map(a => `
    <div class="v3-answer-row">
      <span class="v3-answer-q">${a.q}</span>
      <span class="v3-answer-arrow">→</span>
      <span class="v3-answer-a">${a.a}</span>
    </div>`).join('');
  const solvesHtml = g.solves.map(s => `<li>${s}</li>`).join('');
  const notSolvesHtml = g.notSolves.map(s => `<li>${s}</li>`).join('');
  const evidenceHtml = g.evidence.map(e =>
    `<div class="v3-ev-row"><span class="v3-ev-label">${e.label}</span><span class="v3-ev-text">${e.text}</span></div>`
  ).join('');
  el.innerHTML = `
    <div class="v3-detail ${g.cls}">
      <div class="v3-big-statement">${g.bigStatement}</div>
      <div class="v3-core-conclusion">${g.coreConclusion}</div>

      <div class="v3-answers">
        <div class="v3-detail-title">📋 它回答的 4 个问题</div>
        <div class="v3-answers-list">${answersHtml}</div>
      </div>

      <div class="v3-solves-grid">
        <div class="v3-solves">
          <div class="v3-detail-title v3-solves-title">✅ 解决</div>
          <ul>${solvesHtml}</ul>
        </div>
        <div class="v3-notsolves">
          <div class="v3-detail-title v3-notsolves-title">⚠️ 不解决</div>
          <ul>${notSolvesHtml}</ul>
        </div>
      </div>

      <div class="v3-next-needs">${g.nextNeeds}</div>

      <details class="v3-evidence">
        <summary class="v3-evidence-summary">📎 技术证据（点开看）</summary>
        <div class="v3-evidence-list">${evidenceHtml}</div>
      </details>
    </div>`;
}

function renderV3Matrix() {
  const el = document.getElementById('v3-matrix');
  if (!el) return;
  const rowsHtml = V3_MATRIX.dims.map((dim, idx) => `
    <tr>
      <th class="v3-mx-dim">${dim}</th>
      <td class="v3-gen-1">${V3_MATRIX.byGen.gen1[idx]}</td>
      <td class="v3-gen-2">${V3_MATRIX.byGen.gen2[idx]}</td>
      <td class="v3-gen-3">${V3_MATRIX.byGen.gen3[idx]}</td>
    </tr>`).join('');
  el.innerHTML = `
    <table class="v3-matrix-table">
      <thead>
        <tr>
          <th></th>
          <th class="v3-gen-1">第一代 · 结构化</th>
          <th class="v3-gen-2">第二代 · 半结构化</th>
          <th class="v3-gen-3">第三代 · 模型友好</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

function renderV3Platform() {
  const el = document.getElementById('v3-platform');
  if (!el) return;
  el.innerHTML = V3_TASK_PLATFORM.map(t => {
    const itemsHtml = t.items.map(it => `
      <div class="v3-cap-row">
        <span class="v3-cap-name">${it.name}</span>
        <span class="v3-cap-use">${it.use}</span>
      </div>`).join('');
    return `
      <div class="v3-cap-tier ${t.tierClass}">
        <div class="v3-cap-tier-head">
          <span class="v3-cap-tier-name">${t.tier}</span>
          <span class="v3-cap-tier-desc">${t.desc}</span>
        </div>
        <div class="v3-cap-list">${itemsHtml}</div>
      </div>`;
  }).join('');
}

// ============== 事件 ==============

document.addEventListener('DOMContentLoaded', () => {
  // 状态 chip
  document.querySelectorAll('#preview-state-chips .state-chip').forEach(b => {
    b.addEventListener('click', () => {
      creatorCurrentState = b.dataset.state;
      document.querySelectorAll('#preview-state-chips .state-chip')
        .forEach(x => x.classList.toggle('active', x.dataset.state === creatorCurrentState));
      b.blur();
    });
  });

  document.getElementById('preview-speak-btn').addEventListener('click', () => speakBardPreview());

  // 发布按钮（行为按当前动作分发）
  document.getElementById('creator-publish-btn').addEventListener('click', () => {
    const a = CREATIVE_ACTIONS[currentCreativeAction];
    if (a && typeof a.publishHandler === 'function') a.publishHandler();
  });

  if (currentMode === 'creator') {
    renderProjectPanel();
    renderCreatorPanel();
  }
  if (currentMode === 'creator-v2') {
    renderCreatorV2();
  }
  if (currentMode === 'creator-v3') {
    renderCreatorV3();
  }
});
