import Logger from '../utils/Logger.js';
/**
 * 任务系统 - 独立模块
 *
 * 负责任务的进度更新、每日刷新、奖励领取、红点检测。
 * 包含引导/每日/成就三类任务配置。
 *
 * 通过依赖注入（deps）与外部系统通信，不直接访问全局变量。
 */

// ==================== 任务配置 ====================

export const GUIDE_TASKS = [
    { id: 'guide_click_star', name: '点击星星', description: '点击你的第一颗星星', type: 'click_stars', target: 1, order: 1, rewards: { gold: 25 }, tip: '点击屏幕上的星星可以获得分数！' },
    { id: 'guide_first_game', name: '完成一局', description: '完成你的第一局游戏', type: 'play_games', target: 1, order: 2, rewards: { gold: 50 }, tip: '每局游戏30秒，尽可能多地点星星！' },
    { id: 'guide_first_combo', name: '连击达人', description: '达成20连击', type: 'max_combo', target: 20, order: 3, rewards: { gold: 75, exp: 25 }, tip: '连续快速点击星星可以触发连击，获得分数加成！' },
    { id: 'guide_kill_monster', name: '怪物猎人', description: '击杀第一个怪物', type: 'kill_monsters', target: 1, order: 4, rewards: { gold: 50, healPotion: 1 }, tip: '500分后会出现怪物，点击星星攻击它！' },
    { id: 'guide_switch_mode', name: '模式切换', description: '在设置中切换到下落模式', type: 'switch_mode', target: 1, order: 5, rewards: { gold: 50 }, tip: '下落模式像音游一样，星星从上方落下来！' },
    { id: 'guide_perfect_click', name: '完美点击', description: '在下落模式达成一次完美点击', type: 'perfect_clicks', target: 1, order: 6, rewards: { gold: 50, exp: 15 }, tip: '在判定区域点击星星可以获得双倍分数！' },
    { id: 'guide_super_perfect', name: '超级完美', description: '在下落模式达成一次超级完美点击', type: 'super_perfect_clicks', target: 1, order: 7, rewards: { gold: 75, exp: 25 }, tip: '在中间判定区域点击可以获得四倍分数！' },
    { id: 'guide_kill_boss', name: 'Boss挑战者', description: '击杀第一个Boss', type: 'kill_boss', target: 1, order: 8, rewards: { gold: 150, exp: 50 }, tip: '2000分后会出现Boss，它更强但奖励也更丰厚！' },
    { id: 'guide_use_ice_crystal', name: '冰晶强化', description: '在背包中使用一颗冰晶', type: 'use_ice_crystal', target: 1, order: 9, rewards: { gold: 75, exp: 25 }, tip: '冰晶可以解锁冰星星，提升攻击力！' },
    { id: 'guide_high_score', name: '高分挑战', description: '单局获得2000分', type: 'score', target: 2000, order: 10, rewards: { gold: 100, timePotion: 1 }, tip: '挑战更高分数，解锁更多游戏内容！' }
];

export const DAILY_TASKS = [
    { id: 'daily_click_50', name: '点击新手', description: '点击50颗星星', type: 'click_stars', target: 50, rewards: { gold: 50, exp: 12 } },
    { id: 'daily_score_1000', name: '得分达人', description: '单局获得1000分', type: 'score', target: 1000, rewards: { gold: 75, exp: 20 } },
    { id: 'daily_combo_10', name: '连击新手', description: '达成10连击', type: 'max_combo', target: 10, rewards: { gold: 40, exp: 10 } },
    { id: 'daily_play_3', name: '游戏达人', description: '完成3局游戏', type: 'play_games', target: 3, rewards: { gold: 100, healPotion: 1 } },
    { id: 'daily_perfect_5', name: '完美点击', description: '达成5次完美点击', type: 'perfect_clicks', target: 5, rewards: { gold: 60, timePotion: 1 } },
    { id: 'daily_critical_3', name: '暴击大师', description: '达成3次暴击', type: 'critical_hits', target: 3, rewards: { gold: 50, exp: 15 } }
];

export const ACHIEVEMENT_TASKS = [
    { id: 'ach_click_1000', name: '星星猎手', description: '累计点击1000颗星星', type: 'total_clicks', target: 1000, rewards: { gold: 250, exp: 50 } },
    { id: 'ach_click_10000', name: '星星大师', description: '累计点击10000颗星星', type: 'total_clicks', target: 10000, rewards: { gold: 1000, exp: 200 } },
    { id: 'ach_score_10000', name: '得分王者', description: '单局获得10000分', type: 'score', target: 10000, rewards: { gold: 500, exp: 125 } },
    { id: 'ach_combo_50', name: '连击之神', description: '达成50连击', type: 'max_combo', target: 50, rewards: { gold: 400, exp: 100 } },
    { id: 'ach_combo_100', name: '连击传说', description: '达成100连击', type: 'max_combo', target: 100, rewards: { gold: 1500, exp: 375 } },
    { id: 'ach_play_100', name: '游戏老手', description: '累计完成100局游戏', type: 'total_games', target: 100, rewards: { gold: 750, exp: 150 } },
    { id: 'ach_perfect_100', name: '完美主义', description: '累计达成100次完美点击', type: 'total_perfects', target: 100, rewards: { gold: 400, exp: 88 } },
    { id: 'ach_critical_50', name: '暴击专家', description: '单局达成50次暴击', type: 'critical_hits', target: 50, rewards: { gold: 600, exp: 125 } }
];

// ==================== 任务系统工厂函数 ====================

export function createTaskSystem(deps) {
    const { getPlayerData, saveData, addCharExp, showToast } = deps;

    // 初始化任务进度数据
    function initTaskProgress() {
        var pd = getPlayerData();
        if (!pd.taskProgress) {
            pd.taskProgress = {
                guide: {},
                daily: {},
                achievements: {},
                lastDailyRefresh: 0,
                stats: {
                    totalClicks: 0, totalGames: 0, totalPerfects: 0,
                    totalCriticals: 0, totalScore: 0, maxCombo: 0,
                    monstersKilled: 0, itemsUsed: 0, backpackOpened: 0,
                    shopOpened: 0, modeSwitched: 0, rewardsClaimed: 0
                }
            };
        }
        if (!pd.taskProgress.guide) pd.taskProgress.guide = {};
        if (!pd.taskProgress.daily) pd.taskProgress.daily = {};
        if (!pd.taskProgress.achievements) pd.taskProgress.achievements = {};
        if (!pd.taskProgress.stats) {
            pd.taskProgress.stats = {
                totalClicks: 0, totalGames: 0, totalPerfects: 0,
                totalCriticals: 0, totalScore: 0, maxCombo: 0,
                monstersKilled: 0, itemsUsed: 0, backpackOpened: 0,
                shopOpened: 0, modeSwitched: 0, rewardsClaimed: 0
            };
        }
    }

    // 检查并刷新每日任务
    function checkDailyTaskRefresh() {
        initTaskProgress();
        var pd = getPlayerData();
        var now = new Date();
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (pd.taskProgress.lastDailyRefresh < todayStart) {
            pd.taskProgress.daily = {};
            pd.taskProgress.lastDailyRefresh = todayStart;
            Logger.info('每日任务已刷新');
            saveData();
        }
    }

    // 检查引导任务是否已解锁
    function isGuideTaskUnlocked(order) {
        if (order <= 1) return true;
        var prevTask = GUIDE_TASKS.find(function(t) { return t.order === order - 1; });
        if (!prevTask) return true;
        var pd = getPlayerData();
        var prevProgress = pd.taskProgress.guide[prevTask.id];
        return prevProgress && prevProgress.claimed;
    }

    // 更新任务进度
    function updateTaskProgress(taskType, value, isAdditive) {
        if (isAdditive === undefined) isAdditive = true;
        initTaskProgress();
        checkDailyTaskRefresh();
        var pd = getPlayerData();

        // 更新引导任务
        GUIDE_TASKS.forEach(function(task) {
            if (task.type === taskType) {
                var taskOrder = task.order;
                var canUpdate = taskOrder === 1 || isGuideTaskUnlocked(taskOrder);
                if (canUpdate) {
                    if (!pd.taskProgress.guide[task.id]) {
                        pd.taskProgress.guide[task.id] = { progress: 0, claimed: false };
                    }
                    if (isAdditive) {
                        pd.taskProgress.guide[task.id].progress += value;
                    } else {
                        pd.taskProgress.guide[task.id].progress = Math.max(pd.taskProgress.guide[task.id].progress, value);
                    }
                }
            }
        });

        // 更新每日任务
        DAILY_TASKS.forEach(function(task) {
            if (task.type === taskType) {
                if (!pd.taskProgress.daily[task.id]) {
                    pd.taskProgress.daily[task.id] = { progress: 0, claimed: false };
                }
                if (isAdditive) {
                    pd.taskProgress.daily[task.id].progress += value;
                } else {
                    pd.taskProgress.daily[task.id].progress = Math.max(pd.taskProgress.daily[task.id].progress, value);
                }
            }
        });

        // 更新成就任务
        ACHIEVEMENT_TASKS.forEach(function(task) {
            if (task.type === taskType) {
                if (!pd.taskProgress.achievements[task.id]) {
                    pd.taskProgress.achievements[task.id] = { progress: 0, claimed: false };
                }
                if (isAdditive) {
                    pd.taskProgress.achievements[task.id].progress += value;
                } else {
                    pd.taskProgress.achievements[task.id].progress = Math.max(pd.taskProgress.achievements[task.id].progress, value);
                }
            }
        });

        saveData();
    }

    // 更新累计统计
    function updateTaskStats(statType, value, isAdditive) {
        if (isAdditive === undefined) isAdditive = true;
        initTaskProgress();
        var pd = getPlayerData();
        if (isAdditive) {
            pd.taskProgress.stats[statType] = (pd.taskProgress.stats[statType] || 0) + value;
        } else {
            pd.taskProgress.stats[statType] = Math.max(pd.taskProgress.stats[statType] || 0, value);
        }
        saveData();
    }

    // 领取任务奖励
    function claimTaskReward(taskId, taskType) {
        if (!taskType) taskType = 'daily';
        initTaskProgress();
        var pd = getPlayerData();

        var taskList, progressKey;
        if (taskType === 'guide') {
            taskList = GUIDE_TASKS;
            progressKey = 'guide';
        } else if (taskType === 'achievements') {
            taskList = ACHIEVEMENT_TASKS;
            progressKey = 'achievements';
        } else {
            taskList = DAILY_TASKS;
            progressKey = 'daily';
        }

        var task = taskList.find(function(t) { return t.id === taskId; });

        if (!task) {
            showToast({ title: '任务不存在', icon: 'none' });
            return false;
        }

        var progress = pd.taskProgress[progressKey][taskId];
        if (!progress) {
            showToast({ title: '任务未开始', icon: 'none' });
            return false;
        }
        if (progress.claimed) {
            showToast({ title: '奖励已领取', icon: 'none' });
            return false;
        }
        if (progress.progress < task.target) {
            showToast({ title: '任务未完成', icon: 'none' });
            return false;
        }

        // 发放奖励
        var rewards = task.rewards;
        if (rewards.gold) {
            pd.gold += rewards.gold;
        }
        if (rewards.exp) {
            if (pd.currentCharacterId) {
                addCharExp(pd.currentCharacterId, rewards.exp);
            }
        }
        if (rewards.healPotion) {
            pd.items.healPotion.quantity += rewards.healPotion;
        }
        if (rewards.timePotion) {
            pd.items.timePotion.quantity += rewards.timePotion;
        }

        // 标记已领取
        pd.taskProgress[progressKey][taskId].claimed = true;

        // 更新领取奖励统计
        updateTaskStats('rewardsClaimed', 1);
        updateTaskProgress('claim_reward', 1);

        saveData();
        showToast({ title: '奖励已领取！', icon: 'success' });
        Logger.info('领取任务奖励: ' + task.name, rewards);
        return true;
    }

    // 获取任务列表（含进度）
    function getTasksWithProgress(taskType) {
        if (!taskType) taskType = 'daily';
        initTaskProgress();
        checkDailyTaskRefresh();
        var pd = getPlayerData();

        var taskList, progressKey;
        if (taskType === 'guide') {
            taskList = GUIDE_TASKS;
            progressKey = 'guide';
        } else if (taskType === 'achievements') {
            taskList = ACHIEVEMENT_TASKS;
            progressKey = 'achievements';
        } else {
            taskList = DAILY_TASKS;
            progressKey = 'daily';
        }

        var tasks = taskList.map(function(task) {
            var progress = pd.taskProgress[progressKey][task.id] || { progress: 0, claimed: false };
            var isUnlocked = taskType !== 'guide' || task.order === 1 || isGuideTaskUnlocked(task.order);
            return Object.assign({}, task, {
                currentProgress: progress.progress,
                claimed: progress.claimed,
                completed: progress.progress >= task.target,
                unlocked: isUnlocked
            });
        });

        // 引导任务：隐藏已领取的任务
        if (taskType === 'guide') {
            return tasks.filter(function(task) { return !task.claimed; });
        }

        return tasks;
    }

    // 检查是否有可领取的任务奖励
    function hasClaimableRewards() {
        initTaskProgress();
        var pd = getPlayerData();

        // 引导任务
        for (let i = 0; i < GUIDE_TASKS.length; i++) {
            var task = GUIDE_TASKS[i];
            var progress = pd.taskProgress.guide[task.id];
            var isUnlocked = task.order === 1 || isGuideTaskUnlocked(task.order);
            if (isUnlocked && progress && progress.progress >= task.target && !progress.claimed) {
                return true;
            }
        }

        // 每日任务
        for (let i = 0; i < DAILY_TASKS.length; i++) {
            var task = DAILY_TASKS[i];
            var progress = pd.taskProgress.daily[task.id];
            if (progress && progress.progress >= task.target && !progress.claimed) {
                return true;
            }
        }

        // 成就任务
        for (let i = 0; i < ACHIEVEMENT_TASKS.length; i++) {
            var task = ACHIEVEMENT_TASKS[i];
            var progress = pd.taskProgress.achievements[task.id];
            if (progress && progress.progress >= task.target && !progress.claimed) {
                return true;
            }
        }

        return false;
    }

    // 公开接口
    return {
        // 配置（供渲染等外部使用）
        GUIDE_TASKS: GUIDE_TASKS,
        DAILY_TASKS: DAILY_TASKS,
        ACHIEVEMENT_TASKS: ACHIEVEMENT_TASKS,

        // 方法
        initTaskProgress: initTaskProgress,
        checkDailyTaskRefresh: checkDailyTaskRefresh,
        updateTaskProgress: updateTaskProgress,
        updateTaskStats: updateTaskStats,
        claimTaskReward: claimTaskReward,
        getTasksWithProgress: getTasksWithProgress,
        hasClaimableRewards: hasClaimableRewards
    };
}
