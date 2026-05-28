/**
 * DialogueConfig — 剧情对话脚本 + 场景注册表
 * 所有对话数据集中在此文件，配置即文档。
 * 加对话只加数据，加场景只加注册项，不加代码分支。
 */

// ── 角色立绘资源映射 ──────────────────────────────────
// speakerId → 资源 key（对应 Assets.dialoguePortraits[key]）
export const PORTRAIT_MAP = {
    'char_004': 'portrait_jp',       // 剑魄
    'pet_shadow_cat': 'portrait_ml', // 猫灵
    'char_001': 'portrait_ycx',      // 玉蝉仙
};

// ── 4.1 开场剧情对话（战前）──────────────────────────────
export const PROLOGUE_DIALOGUE = [
    { speaker: '剑魄', speakerId: 'char_004', side: 'left',
      text: '别动！异文明气息、猫形灵体、皮肤上的紫色斑痕……都对上了。' },
    { speaker: '猫灵', speakerId: 'pet_shadow_cat', side: 'right',
      text: '喵？！你、你认错猫了吧？本姑娘只是路过，哪里知道什么污染的事情啊。' },
    { speaker: '剑魄', speakerId: 'char_004', side: 'left',
      text: '…………' },
    { speaker: '猫灵', speakerId: 'pet_shadow_cat', side: 'right',
      text: '喵——！中计了！！' },
    { speaker: '剑魄', speakerId: 'char_004', side: 'left',
      text: '少装糊涂。你刚才碰过的灵，身上都出现了污染的迹象，这到底是怎么一回事！' },
    { speaker: '猫灵', speakerId: 'pet_shadow_cat', side: 'right',
      text: '（身体抽动了一下，紫色斑纹爬的更深了）污染？咳……也许是它们本来就不够干净呢。' },
    { speaker: '剑魄', speakerId: 'char_004', side: 'left',
      text: '（突然注意到你们一行人）怎么还有灵？不管了来得正好，请帮我控制住她，她身上的气息很不对劲。' },
    { speaker: '主角', speakerId: null, side: 'center',
      text: '等一下。。' },
];

// ── 4.3 战斗后对话──────────────────────────────────
export const PROLOGUE_AFTER_BATTLE = [
    { speaker: '剑魄', speakerId: 'char_004', side: 'left',
      text: '嘁，没想到挺有两下子，让她跑了，这下可难办了。' },
];

// ── 4.4 场景注册表 ──────────────────────────────────
export const STORY_SCENES = {
    prologue: {
        id: 'prologue',
        name: '猫灵追逐·开场',

        // 阶段一：战前剧情（全屏对话）
        preBattle: {
            script: PROLOGUE_DIALOGUE,
        },

        // 阶段二：战斗中引导（guide_anim 模式：立绘滑入+气泡）
        inBattle: {
            mode: 'guide_anim',
            guideAnim: {
                characterId: 'char_001',
                slideInFrom: 'left',
                slideOutTo: 'right',
                portraitWidth: 120,
                portraitHeight: 160,
                portraitTargetX: 0.15,
                portraitBottomOffset: 0.05,
                slideInDuration: 400,
                slideOutDuration: 300,
                bubbleOffsetX: -75,
                bubbleOffsetY: -5,
                bubbleMaxWidth: 200,
                bubbleHoldAfterLast: 800,
            },
            triggers: [
                { at: 'battle_start',     delayMs: 800, lines: ['来，先尝试点击一下灵光吧~'], waitFor: 'first_star_click' },
                { at: 'first_star_click',  delayMs: 0,   lines: ['就是这样！！'],               waitFor: null },
            ],
        },

        // 阶段三：战斗后剧情（全屏对话）
        postBattle: {
            script: PROLOGUE_AFTER_BATTLE,
            onCompleteAction: { type: 'create_task', taskId: 'guide_find_cat_spirit' },
        },
    },
};