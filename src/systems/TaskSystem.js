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
    { id: 'guide_click_star', name: '初触灵光', description: '触碰你的第一道灵光', type: 'click_stars', target: 1, order: 1, rewards: { gold: 25 }, tip: '触碰屏幕上的灵光可以获得灵辉值！' },
    { id: 'guide_first_game', name: '初次净化', description: '完成你的第一次灵域净化', type: 'play_games', target: 1, order: 2, rewards: { gold: 50 }, tip: '每局净化30秒，尽可能多地触碰灵光！' },
    { id: 'guide_first_combo', name: '连灵初成', description: '达成20连灵，灵光开始回应你的节奏', type: 'max_combo', target: 20, order: 3, rewards: { gold: 75, exp: 25 }, tip: '连续快速触碰灵光可以触发连灵，获得灵辉值加成！' },
    { id: 'guide_kill_monster', name: '净化初试', description: '净化第一只邪灵', type: 'kill_monsters', target: 1, order: 4, rewards: { gold: 50, healPotion: 1 }, tip: '500灵辉值后会出现邪灵，触碰灵光净化它！' },
    { id: 'guide_perfect_click', name: '精准触碰', description: '在灵光映射模式达成一次精准触碰', type: 'perfect_clicks', target: 1, order: 6, rewards: { gold: 50, exp: 15 }, tip: '在判定区域触碰灵光可以获得双倍灵辉值！' },
    { id: 'guide_super_perfect', name: '灵光合拍', description: '在灵光映射模式达成一次灵光合拍', type: 'super_perfect_clicks', target: 1, order: 7, rewards: { gold: 75, exp: 25 }, tip: '在核心判定区域触碰可以获得四倍灵辉值！' },
    { id: 'guide_kill_boss', name: '守护灵净化', description: '净化第一只守护灵级邪灵', type: 'kill_boss', target: 1, order: 8, rewards: { gold: 150, exp: 50 }, tip: '2000灵辉值后会出现守护灵，它更强但净化奖励也更丰厚！' },
    { id: 'guide_use_ice_crystal', name: '水行灵光·初醒', description: '使用一颗水灵晶唤醒水行灵光', type: 'use_ice_crystal', target: 1, order: 9, rewards: { gold: 75, exp: 25 }, tip: '水灵晶可以唤醒水灵光，提升灵光威力！' },
    { id: 'guide_high_score', name: '灵辉汇聚', description: '单次净化获得2000灵辉值', type: 'score', target: 2000, order: 10, rewards: { gold: 100, timePotion: 1 }, tip: '挑战更高灵辉值，解锁更多灵域内容！' },
    { id: 'guide_find_cat_spirit', name: '找到猫灵', description: '剑魄正在追击猫灵，她身上散发着污染的气息。帮助剑魄找到猫灵的下落。', type: 'event_flag', target: 1, order: 999, rewards: { gold: 100, exp: 30 }, tip: '剑魄已经追上去了，在世界地图上继续探索寻找猫灵的踪迹吧。' }
];

export const DAILY_TASKS = [
    { id: 'daily_click_50', name: '触碰新手', description: '触碰50道灵光', type: 'click_stars', target: 50, rewards: { gold: 50, exp: 12 } },
    { id: 'daily_score_1000', name: '灵辉达人', description: '单次净化获得1000灵辉值', type: 'score', target: 1000, rewards: { gold: 75, exp: 20 } },
    { id: 'daily_combo_10', name: '连灵初试', description: '达成10连灵', type: 'max_combo', target: 10, rewards: { gold: 40, exp: 10 } },
    { id: 'daily_play_3', name: '净化常客', description: '完成3次净化', type: 'play_games', target: 3, rewards: { gold: 100, healPotion: 1 } },
    { id: 'daily_perfect_5', name: '精准触碰', description: '达成5次精准触碰', type: 'perfect_clicks', target: 5, rewards: { gold: 60, timePotion: 1 } },
    { id: 'daily_critical_3', name: '会心初试', description: '达成3次会心一击', type: 'critical_hits', target: 3, rewards: { gold: 50, exp: 15 } }
];

export const ACHIEVEMENT_TASKS = [
    { id: 'ach_click_1000', name: '灵光猎手', description: '累计触碰1000道灵光', type: 'total_clicks', target: 1000, rewards: { gold: 250, exp: 50 } },
    { id: 'ach_click_10000', name: '灵光大成', description: '累计触碰10000道灵光', type: 'total_clicks', target: 10000, rewards: { gold: 1000, exp: 200 } },
    { id: 'ach_score_10000', name: '灵辉王者', description: '单次净化获得10000灵辉值', type: 'score', target: 10000, rewards: { gold: 500, exp: 125 } },
    { id: 'ach_combo_50', name: '连灵归一', description: '达成50连灵', type: 'max_combo', target: 50, rewards: { gold: 400, exp: 100 } },
    { id: 'ach_combo_100', name: '连灵入圣', description: '达成100连灵', type: 'max_combo', target: 100, rewards: { gold: 1500, exp: 375 } },
    { id: 'ach_play_100', name: '灵域常客', description: '累计完成100次净化', type: 'total_games', target: 100, rewards: { gold: 750, exp: 150 } },
    { id: 'ach_perfect_100', name: '灵光合鸣', description: '累计达成100次灵光合拍', type: 'total_perfects', target: 100, rewards: { gold: 400, exp: 88 } },
    { id: 'ach_critical_50', name: '会心名家', description: '单次净化达成50次会心一击', type: 'critical_hits', target: 50, rewards: { gold: 600, exp: 125 } }
];

// ==================== 任务系统工厂函数 ====================

export function createTaskSystem(deps) {
    const { getSaveData, saveData, addCharExp, showToast } = deps;

    // 初始化任务进度数据
    function initTaskProgress() {
        var pd = getSaveData();
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
        var pd = getSaveData();
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
        var pd = getSaveData();
        var prevProgress = pd.taskProgress.guide[prevTask.id];
        return prevProgress && prevProgress.claimed;
    }

    // 更新任务进度
    function updateTaskProgress(taskType, value, isAdditive) {
        if (isAdditive === undefined) isAdditive = true;
        initTaskProgress();
        checkDailyTaskRefresh();
        var pd = getSaveData();

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

    // 事件驱动型任务完成：由外部事件触发，直接标记完成并发放奖励
    function completeEventTask(taskId) {
        initTaskProgress();
        checkDailyTaskRefresh();
        var pd = getSaveData();

        // 查找所有 type === 'event_flag' 的任务
        var allTasks = GUIDE_TASKS.concat(DAILY_TASKS, ACHIEVEMENT_TASKS);
        for (var i = 0; i < allTasks.length; i++) {
            var task = allTasks[i];
            if (task.type === 'event_flag' && task.id === taskId) {
                // 确定任务所属分类
                var category = 'guide';
                if (DAILY_TASKS.indexOf(task) !== -1) category = 'daily';
                if (ACHIEVEMENT_TASKS.indexOf(task) !== -1) category = 'achievements';

                if (!pd.taskProgress[category][task.id]) {
                    pd.taskProgress[category][task.id] = { progress: 0, claimed: false };
                }
                pd.taskProgress[category][task.id].progress = task.target;

                // 自动发放奖励
                if (!pd.taskProgress[category][task.id].claimed) {
                    pd.taskProgress[category][task.id].claimed = true;
                    if (task.rewards) {
                        if (task.rewards.gold) {
                            pd.starSource = (pd.starSource || 0) + task.rewards.gold;
                        }
                        if (task.rewards.exp) {
                            addCharExp(pd.currentCharacterId || 'char_001', task.rewards.exp);
                        }
                    }
                    showToast({ title: task.name + ' 完成！', icon: 'success' });
                }
                saveData();
                return true;
            }
        }
        return false;
    }

    // 更新累计统计
    function updateTaskStats(statType, value, isAdditive) {
        if (isAdditive === undefined) isAdditive = true;
        initTaskProgress();
        var pd = getSaveData();
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
        var pd = getSaveData();

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
        var pd = getSaveData();

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
        var pd = getSaveData();

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
        hasClaimableRewards: hasClaimableRewards,
        completeEventTask: completeEventTask
    };
}
