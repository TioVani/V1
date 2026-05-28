/**
 * NpcDialogueConfig — 大地图NPC对话驱动器注册表
 * 每个 driver 自包含：状态初始化 + 对话生成 + 选择响应。
 * 新增NPC对话只需在此文件加一条注册项，不改 game.js。
 */

var NPC_DIALOGUE_DRIVERS = {
    cat_spirit: {
        initState: function () {
            return {
                visitCount: 0,
                choice1: null,
                choice2: null,
                gaveReward: false,
                resolved: false
            };
        },

        getScript: function (state) {
            var v = state.visitCount;

            if (state.resolved) {
                if (state.gaveReward) {
                    return [{ text: '喵~（猫灵冲你眨了眨眼）' }];
                }
                return [{ text: '……' }];
            }

            if (v === 0) {
                return [{
                    text: '喵。',
                    choices: [
                        { label: '你好~', key: 'hello' },
                        { label: '喵喵喵？', key: 'meow' }
                    ]
                }];
            }

            if (v === 1) {
                return [{
                    text: '喵喵喵？',
                    choices: [
                        { label: '你好~', key: 'hello' },
                        { label: '喵喵喵？', key: 'meow' }
                    ]
                }];
            }

            var c1 = state.choice1;
            var c2 = state.choice2;
            var thirdLine;
            if (c1 === 'hello' && c2 === 'hello') {
                thirdLine = '喵喵喵。';
            } else if (c1 === 'meow' && c2 === 'meow') {
                thirdLine = '干嘛三番五次套近乎？';
            } else {
                thirdLine = '喵三喵四喵喵喵？';
            }

            return [{
                text: thirdLine,
                choices: [
                    { label: '没啥。', key: 'nothing' },
                    { label: '看看你有没有受伤。', key: 'care' }
                ]
            }];
        },

        onChoice: function (pd, stateId, state, choiceKey) {
            var v = state.visitCount;

            if (v === 0) {
                state.choice1 = choiceKey;
                state.visitCount = 1;
            } else if (v === 1) {
                state.choice2 = choiceKey;
                state.visitCount = 2;
            } else if (v === 2) {
                if (choiceKey === 'care') {
                    if (!pd.unlockedStarTypes) pd.unlockedStarTypes = [];
                    if (pd.unlockedStarTypes.indexOf('dodge') === -1) {
                        pd.unlockedStarTypes.push('dodge');
                    }
                    state.gaveReward = true;
                    state.visitCount = 3;
                    state.resolved = true;
                    return { toast: '获得闪避灵光！你已解锁闪避灵光。' };
                }
                state.visitCount = 3;
                state.resolved = true;
            }

            return null;
        }
    }
};

export { NPC_DIALOGUE_DRIVERS };