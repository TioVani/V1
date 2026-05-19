/**
 * 集中管理 game.js 中的全局状态变量
 * 逐步迁移：每迁移一组变量，从 game.js 中删除对应声明
 */

var playerEffects = {
    stunned: false,
    stunEndTime: 0,
    poisoned: false,
    poisonEndTime: 0,
    poisonDamage: 0,
    poisonTickTime: 0,
    dodging: false,
    dodgeEndTime: 0,

    reset: function() {
        this.stunned = false;
        this.stunEndTime = 0;
        this.poisoned = false;
        this.poisonEndTime = 0;
        this.poisonDamage = 0;
        this.poisonTickTime = 0;
        this.dodging = false;
        this.dodgeEndTime = 0;
    },

    isStunned: function() {
        if (this.stunned && Date.now() >= this.stunEndTime) {
            this.stunned = false;
            return false;
        }
        return this.stunned;
    },

    isPoisoned: function() {
        if (this.poisoned && Date.now() >= this.poisonEndTime) {
            this.poisoned = false;
            return false;
        }
        return this.poisoned;
    },

    isDodging: function() {
        if (this.dodging && Date.now() >= this.dodgeEndTime) {
            this.dodging = false;
            return false;
        }
        return this.dodging;
    }
};

var combatState = {
    monsterSplitCount: 0,
    monsterSplitType: null,
    greedyHpPool: 0,
    greedySkillUnlocked: false,
    comboStarActive: false,
    comboStarStartTime: 0,
    comboStarLastAttackTime: 0,
    comboStarLastRemainingTime: 0,
    comboStarTimer: null,
    starDevourerEscaped: false,
    voidEmperorSpawned: false,
    adWatchCount: 0,
    timeCrystalUnlocked: false,
    delayedHp: null,

    reset: function() {
        this.monsterSplitCount = 0;
        this.monsterSplitType = null;
        this.greedyHpPool = 0;
        this.greedySkillUnlocked = false;
        this.comboStarActive = false;
        this.comboStarStartTime = 0;
        this.comboStarLastAttackTime = 0;
        this.comboStarLastRemainingTime = 0;
        if (this.comboStarTimer) {
            clearInterval(this.comboStarTimer);
        }
        this.comboStarTimer = null;
        this.starDevourerEscaped = false;
        this.voidEmperorSpawned = false;
        this.adWatchCount = 0;
        // timeCrystalUnlocked 不重置（从存档恢复的持久状态）
        this.delayedHp = null;
    }
};

var uiScrollState = {
    backpackScrollY: 0,
    backpackLastTouchY: 0,
    backpackIsDragging: false,
    backpackTab: 'materials',
    shopScrollY: 0,
    shopLastTouchY: 0,
    shopTab: 'materials',
    leaderboardScrollY: 0,
    leaderboardLastTouchY: 0,
    squadScrollY: 0,
    squadLastTouchY: 0,
    stageSelectScrollY: 0,
    stageSelectLastTouchY: 0,
    seasonSelectScrollY: 0,
    seasonSelectLastTouchY: 0,
    seasonSelectIsDragging: false,
    debugScrollOffset: 0,
    menuExpanded: false,

    reset: function() {
        this.backpackScrollY = 0;
        this.backpackLastTouchY = 0;
        this.backpackIsDragging = false;
        this.backpackTab = 'materials';
        this.shopScrollY = 0;
        this.shopLastTouchY = 0;
        this.shopTab = 'materials';
        this.leaderboardScrollY = 0;
        this.leaderboardLastTouchY = 0;
        this.squadScrollY = 0;
        this.squadLastTouchY = 0;
        this.stageSelectScrollY = 0;
        this.stageSelectLastTouchY = 0;
        this.seasonSelectScrollY = 0;
        this.seasonSelectLastTouchY = 0;
        this.seasonSelectIsDragging = false;
        this.debugScrollOffset = 0;
        this.menuExpanded = false;
    }
};

var comboState = {
    count: 0,
    lastComboTime: 0,
    slideAnim: 0,
    slideTriggered: false,
    currentStarInterval: 600,

    reset: function() {
        this.count = 0;
        this.lastComboTime = 0;
        this.slideAnim = 0;
        this.slideTriggered = false;
        this.currentStarInterval = 600;
    }
};

export { playerEffects, combatState, uiScrollState, comboState };
