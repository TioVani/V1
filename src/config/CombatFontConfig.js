/**
 * CombatFontConfig — 局内战斗字体配置（唯一来源）
 *
 * 管理好：所有战斗字体数值集中在此，改一处全局生效
 * 扩展好：新增文字类型只需加一行 token
 * 维护好：AnimationSystem / GameBattleRenderer 只消费，不持有字体数值
 */

function createCombatFontConfig() {

    // 语义 token → { base: 基础px, weight: 'bold'|'normal' }
    var FONTS = {
        // —— 动画文字（AnimationSystem 使用） ——
        damage:      { base: 24, weight: 'normal' },   // 怪物受伤、技能伤害数字
        crit:        { base: 28, weight: 'normal' },   // 暴击/治疗数字（含动态 anim.scale）
        playerDmg:   { base: 9,  weight: 'normal' },   // 玩家受伤数字
        playerDmgBoss:{ base: 12, weight: 'normal' },   // 玩家受伤数字（Boss模式）
        timeDmg:     { base: 18, weight: 'normal' },   // 时间扣减飘字
        quickTap:    { base: 40, weight: 'bold'   },   // 快速点击 ×2/×4
        goldDrop:    { base: 20, weight: 'normal' },   // 灵币掉落
        elemental:   { base: 32, weight: 'bold'   },   // 元素连击文字（汽伤等）
        elementalSub:{ base: 20, weight: 'normal' },   // 元素连击副文字（×2伤害）
        skillEmoji:  { base: 20, weight: 'normal' },   // 技能伤害旁 emoji
        pet:         { base: 16, weight: 'normal' },   // 宠物伤害
        message:     { base: 12, weight: 'normal' },   // 战斗消息
        scorePopup:  { base: 22, weight: 'normal' },   // 分数飘字（小分）
        scoreLarge:  { base: 28, weight: 'normal' },   // 分数飘字（大分）

        // —— 战斗 UI（GameBattleRenderer 使用） ——
        comboNum:    { base: 40, weight: 'bold'   },   // 连击数字
        comboLabel:  { base: 20, weight: 'bold'   },   // COMBO 文字
        comboLevel:  { base: 16, weight: 'normal' },   // Lv./SPEED
        hp:          { base: 14, weight: 'normal' },   // HP: xx/xx
        hpBadge:     { base: 10, weight: 'normal' },   // 护盾/怒气数字
        bossHp:      { base: 12, weight: 'bold'   },   // Boss 血条文字
        dodge:       { base: 13, weight: 'normal' },   // 闪避倒计时
        pause:       { base: 30, weight: 'bold'   },   // 暂停按钮
        itemCount:   { base: 12, weight: 'bold'   },   // 道具数量角标
        victory:     { base: 24, weight: 'bold'   },   // 战斗胜利标题
        reward:      { base: 18, weight: 'normal' },   // 奖励文字
        stun:        { base: 36, weight: 'bold'   },   // 被打断文字
        stunTimer:   { base: 20, weight: 'normal' },   // 无法操作倒计时
        itemIcon:    { base: 24, weight: 'normal' },   // 道具图标
    };

    /**
     * 获取字体字符串
     * @param {string} token  语义 token 名
     * @param {number} scale  屏幕缩放比
     * @param {number} [extraScale] 额外缩放（如 anim.scale）
     * @returns {string} 完整的 ctx.font 字符串
     */
    function getFont(token, scale, extraScale) {
        var f = FONTS[token];
        if (!f) return '16px sans-serif';
        var s = Math.floor(f.base * scale * (extraScale || 1));
        return f.weight + ' ' + s + 'px sans-serif';
    }

    return {
        getFont: getFont,
        FONTS: FONTS
    };
}

export { createCombatFontConfig };
