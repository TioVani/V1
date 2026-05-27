/**
 * AssetConfig — 图片 + 音频资源路径配置（纯数据）
 */

// 图片资源配置（按用途分组，id 与 Assets 属性名对应）
export var IMAGE_GROUPS = {
    core: [
        { id: 'backgroundImage',          src: 'assets/images/background/background.png' },
        { id: 'titleBgImage',             src: 'assets/images/background/title_bg.jpg' },
        { id: 'normalStarImage',          src: 'assets/images/LG.png' },
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
        { id: 'idleIcon',                 src: 'assets/images/ui/IDLE.png' },
        { id: 'bossImage',                src: 'assets/images/ui/BOSS.png' },
        { id: 'chestImage',               src: 'assets/images/ui/PTBX.png' },
    ],
    character: [
        { id: 'char_starter',             src: 'assets/images/character/YCX_HF.png' },
        { id: 'char_warrior',             src: 'assets/images/character/XXZS_HF.png' },
        { id: 'char_warriorPortrait',     src: 'assets/images/character/XXZS.png' },
        { id: 'char_starterPortrait',     src: 'assets/images/character/YCX_Portrait.png' },
        { id: 'char_worldMapPlayer',       src: 'assets/images/ui/PLAYER_ALPHA.png' },
    ],
    battle: [
        { id: 'fightBgImage',             src: 'assets/images/battle/Fight_03_BG.jpg' },
    ],
    worldmap: [
        { id: 'worldMapBg01',             src: 'assets/images/worldmap/world_01.jpg' },
        { id: 'worldMapBg02',             src: 'assets/images/worldmap/world_02.jpg' },
        { id: 'worldMapBg03',             src: 'assets/images/worldmap/world_03.jpg' },
        { id: 'worldMapBg05',             src: 'assets/images/worldmap/world_05.jpg' },
        { id: 'worldMapBg06',             src: 'assets/images/worldmap/world_06.jpg' },
        { id: 'worldMapBg07',             src: 'assets/images/worldmap/world_07.jpg' },
        { id: 'worldMapBg08',             src: 'assets/images/worldmap/world_08.jpg' },
        { id: 'worldMapBg10',             src: 'assets/images/worldmap/world_10.jpg' },
        { id: 'worldMapBg13',             src: 'assets/images/worldmap/world_13.jpg' },
        { id: 'worldMapBg14',             src: 'assets/images/worldmap/world_14.jpg' },
        { id: 'worldMapBg15',             src: 'assets/images/worldmap/world_15.jpg' },
        { id: 'worldMapBg16',             src: 'assets/images/worldmap/world_16.jpg' },
        { id: 'worldMapBg17',             src: 'assets/images/worldmap/cyber_egypt_nether_1_20260526_110114.png' },
    ],
    beauty: [
        // 由 AssetManager 根据 BEAUTY_CONFIG 自动生成
    ],
    effects: [
        { id: 'bluelightImg', src: 'assets/images/tmp/Bluelight.png' },
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
        { id: 'uiSkip',       src: 'assets/audio/UI_Skip.ogg' },
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
        { id: 'mainMenu',     src: 'assets/audio/music/01MainMenu.ogg', loop: true },
        { id: 'shuhanTheme',  src: "assets/audio/music/02Shuhan's Theme.ogg", loop: true },
        { id: 'battle01',     src: 'assets/audio/music/031Battle_Girlyourenotlikeme.ogg', loop: true },
        { id: 'battle02',     src: 'assets/audio/music/031Battle_Rockbreaker.ogg', loop: true },
        { id: 'battle03',     src: 'assets/audio/music/031Battle_SSDD.ogg', loop: true },
        { id: 'towerExplore', src: 'assets/audio/music/05Towerordungeon.ogg', loop: true },
        { id: 'uiEnter',      src: 'assets/audio/UI_Enter.ogg', loop: false },
        { id: 'uiEnter2',     src: 'assets/audio/UI_Enter2.ogg', loop: false },
        { id: 'uiEnter3',     src: 'assets/audio/UI_Enter3.ogg', loop: false },
        { id: 'characterStep', src: 'assets/audio/Character_Step.ogg', loop: false },
        { id: 'uiSkip',       src: 'assets/audio/UI_Skip.ogg', loop: false },
        { id: 'voLing001',    src: 'assets/audio/vo/vo_ling_001.ogg', loop: false },
        { id: 'voLing002',    src: 'assets/audio/vo/vo_ling_002.ogg', loop: false },
        { id: 'voLing003',    src: 'assets/audio/vo/vo_ling_003.ogg', loop: false },
        { id: 'battleTeleport', src: 'assets/audio/battle/Battle_Teleport.ogg', loop: false },
        { id: 'battleCombo',     src: 'assets/audio/battle/Battle_Combo.ogg',     loop: false },
        { id: 'battleCritical',  src: 'assets/audio/battle/Battle_Critical.ogg',  loop: false },
        { id: 'battleHit',       src: 'assets/audio/battle/Battle_Hit.ogg',       loop: false },
        { id: 'battleQuick1',   src: 'assets/audio/battle/Battle_Quick_1.ogg', loop: false },
        { id: 'battleQuick2',   src: 'assets/audio/battle/Battle_Quick_2.ogg', loop: false },
        { id: 'battleQuick3',   src: 'assets/audio/battle/Battle_Quick_3.ogg', loop: false },
        { id: 'battleQuick4',   src: 'assets/audio/battle/Battle_Quick_4.ogg', loop: false },
        { id: 'battleQuick5',   src: 'assets/audio/battle/Battle_Quick_5.ogg', loop: false },
        { id: 'battleQuick6',   src: 'assets/audio/battle/Battle_Quick_6.ogg', loop: false },
        { id: 'battleHitEnemy1', src: 'assets/audio/battle/Battle_HitEnemy_1.ogg', loop: false },
        { id: 'battleHitEnemy2', src: 'assets/audio/battle/Battle_HitEnemy_2.ogg', loop: false },
        { id: 'battleHitEnemy3', src: 'assets/audio/battle/Battle_HitEnemy_3.ogg', loop: false },
        { id: 'battleHitEnemy4', src: 'assets/audio/battle/Battle_HitEnemy_4.ogg', loop: false },
        { id: 'battleHitEnemy5', src: 'assets/audio/battle/Battle_HitEnemy_5.ogg', loop: false },
        { id: 'battleFail',     src: 'assets/audio/battle/Battle_Fail.ogg',     loop: false },
        { id: 'battleSuccess', src: 'assets/audio/battle/Battle_Success.ogg', loop: false },
        { id: 'battleNormal',   src: 'assets/audio/battle/Battle_Normal.ogg',   loop: false },
        { id: 'treasureBox',    src: 'assets/audio/Treasure_box.ogg',            loop: false },
        { id: 'treasureMisc',   src: 'assets/audio/Treasure_misc.ogg',            loop: false },
    ],
};

// 角色图片映射：id → characterImages 的 key
export var CHARACTER_MAP = {
    char_starter: 'starter',
    char_starterPortrait: 'starterPortrait',
    char_warrior: 'warrior',
    char_warriorPortrait: 'warriorPortrait',
};
