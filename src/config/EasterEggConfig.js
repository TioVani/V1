/**
 * EasterEggConfig — 传送门彩蛋驱动器注册表
 * 每个 driver 自包含：状态 key + 拦截行为 + 通过行为。
 * 新增传送彩蛋只需在此文件加一条注册项，并在 TeleportConfig 中关联 easterEgg 字段。
 * 新增到达彩蛋只需在此文件加一条 trigger='onArrive' 的注册项，不改 game.js。
 */

export const EASTER_EGG_DRIVERS = {
    // ── 世界的边缘？（world_10 portal_dusk → world_11）────────────
    worldEdge: {
        stateKey: 'worldEdgeChecked',

        // 第一次触发：返回拦截行为
        // deps 包含 { pd, worldMapRenderer }
        onFirstTrigger: function (deps) {
            return {
                type: 'block',
                dialogue: [
                    { speaker: '蝉玉仙', text: '后面的内容以后再来探索吧～' }
                ]
            };
        },

        // 第二次触发（通过时）：返回附加行为
        // deps 包含 { pd }
        // toast 弹出"世界的边缘？"，reward 由 game.js 通用编排层统一发放
        onPass: function (deps) {
            return {
                type: 'pass',
                toast: { title: '世界的边缘？', icon: 'success', duration: 3000 },
                reward: {
                    achievementId: 'world_edge',
                    spiritStones: 150
                }
            };
        }
    },

    // ── 勒就是灵域？？？（首次到达 world_04）────────────
    world04Arrive: {
        trigger: 'onArrive',
        targetWorld: 'world_04',
        stateKey: 'world04ArriveChecked',

        onTrigger: function (deps) {
            return {
                toast: { title: '勒就是灵域？？？', icon: 'success', duration: 3000 },
                reward: {
                    achievementId: 'world_04_arrive',
                    spiritStones: 150
                }
            };
        }
    }
};