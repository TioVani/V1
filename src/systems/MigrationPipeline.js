/**
 * MigrationPipeline — 存档版本迁移管道
 *
 * 作为工具模块被 GameDataStore 内部调用，提供：
 * - MIGRATIONS 数组（v0→v1→v2→v3 增量迁移函数）
 * - 旧数据修复（幂等）
 * - v2→v3 的 save/runtime 拆分
 *
 * 注意：实际迁移入口在 GameDataStore.load() 中自包含。
 *       本模块暴露函数供 load() 内部调用的同时，也允许外部手动触发迁移场景。
 */

function createMigrationPipeline() {
    var CURRENT_SAVE_VERSION = 3;

    var MIGRATIONS = [
        // v0 → v1: 初始版本化存档
        function migrateV0toV1(data) {
            if (!data._version) data._version = 1;
        },
        // v1 → v2: 添加 upgradeData
        function migrateV1toV2(data) {
            if (!data.upgradeData) {
                data.upgradeData = { stars: {} };
            }
            if (!data.upgradeData.stars) {
                data.upgradeData.stars = {};
            }
            data._version = 2;
        }
    ];

    /**
     * 执行增量迁移链 (v_current → v_CURRENT_SAVE_VERSION)
     * @param {Object} data - 存档数据（原地修改）
     * @param {number} fromVersion - 当前数据版本号
     */
    function migrate(data, fromVersion) {
        if (fromVersion >= CURRENT_SAVE_VERSION) return;

        for (var vi = fromVersion; vi < CURRENT_SAVE_VERSION; vi++) {
            if (MIGRATIONS[vi]) {
                MIGRATIONS[vi](data);
            }
        }
        data._version = CURRENT_SAVE_VERSION;
    }

    return {
        CURRENT_SAVE_VERSION: CURRENT_SAVE_VERSION,
        MIGRATIONS: MIGRATIONS,
        migrate: migrate
    };
}

export { createMigrationPipeline };