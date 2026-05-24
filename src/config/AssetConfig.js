/**
 * AssetConfig — 图片 + 音频资源路径配置（纯数据）
 */

// 图片资源配置（按用途分组，id 与 Assets 属性名对应）
export var IMAGE_GROUPS = {
    core: [
        { id: 'backgroundImage',          src: 'assets/images/background/background.png' },
        { id: 'titleBgImage',             src: 'assets/images/background/title_bg.jpg' },
        { id: 'normalStarImage',          src: 'assets/images/ui/ST.png' },
        { id: 'iceStarImage',             src: 'assets/images/ui/IST.png' },
        { id: 'fireStarImage',            src: 'assets/images/ui/FST.png' },
    ],
    menu: [
        { id: 'backpackImage',            src: 'assets/images/ui/BPK.png' },
        { id: 'menuButtonImage',          src: 'assets/images/ui/WS.png' },
        { id: 'menuButtonImageCollapsed', src: 'assets/images/ui/WSC.png' },
        { id: 'settingsIcon',             src: 'assets/images/ui/GEAR.png' },
        { id: 'goldIcon',                 src: 'assets/images/ui/GL.png' },
        { id: 'starSourceIcon',           src: 'assets/images/ui/SST.png' },
        { id: 'backIcon',                 src: 'assets/images/ui/BK.png' },
        { id: 'taskIcon',                 src: 'assets/images/ui/TKS.png' },
        { id: 'leaderboardIcon',          src: 'assets/images/ui/TOP.png' },
        { id: 'seasonIcon',               src: 'assets/images/ui/CS.png' },
        { id: 'shopIcon',                 src: 'assets/images/ui/SP.png' },
        { id: 'towerIcon',                src: 'assets/images/ui/IFT.png' },
        { id: 'bossImage',                src: 'assets/images/ui/BOSS.png' },
    ],
    character: [
        { id: 'char_starter',             src: 'assets/images/character/XXSZ_HF.png' },
        { id: 'char_warrior',             src: 'assets/images/character/XXZS_HF.png' },
        { id: 'char_warriorPortrait',     src: 'assets/images/character/XXZS.png' },
    ],
    battle: [
        { id: 'fightBgImage',             src: 'assets/images/battle/Fight_03_BG.jpg' },
    ],
    worldmap: [
        { id: 'worldMapBg01',             src: 'assets/images/worldmap/world_01.jpg' },
        { id: 'worldMapBg02',             src: 'assets/images/worldmap/world_02.jpg' },
    ],
    beauty: [
        // 由 AssetManager 根据 BEAUTY_CONFIG 自动生成
    ],
};

// 美颜帧配置
export var BEAUTY_CONFIG = {
    basePath: 'assets/images/beauty/GC_',
    frameCount: 16,
    padLength: 4,
    extension: '.png',
};

// 音频资源配置
export var AUDIO_CONFIG = {
    sfx: [
        { id: 'click',        src: 'assets/audio/click.mp3' },
        { id: 'menuClick',    src: 'assets/audio/menu_S.wav' },
        { id: 'towerClick',   src: 'assets/audio/tower_click.mp3' },
        { id: 'backpack',     src: 'assets/audio/backpack_click.mp3' },
        { id: 'monsterHit',   src: 'assets/audio/monster_hit.mp3' },
        { id: 'monsterDodge', src: 'assets/audio/monster_dodge.mp3' },
        { id: 'meteor',       src: 'assets/audio/meteor.mp3' },
        { id: 'meteorIce',    src: 'assets/audio/meteor_ice.mp3' },
        { id: 'meteorImpact', src: 'assets/audio/meteor_impact.mp3' },
        { id: 'dodgeHeal',    src: 'assets/audio/dodge_heal.mp3' },
        { id: 'petAttack',    src: 'assets/audio/pet_attack.mp3' },
    ],
    bgm: [
        { id: 'mainMenu',     src: 'assets/audio/01MainMenu.ogg', loop: true },
        { id: 'uiEnter',      src: 'assets/audio/UI_Enter.ogg', loop: false },
        { id: 'uiEnter2',     src: 'assets/audio/UI_Enter2.ogg', loop: false },
    ],
};

// 角色图片映射：id → characterImages 的 key
export var CHARACTER_MAP = {
    char_starter: 'starter',
    char_warrior: 'warrior',
    char_warriorPortrait: 'warriorPortrait',
};
