/**
 * TeleportConfig — 传送点坐标配置表
 *
 * type 说明:
 *   start      — 玩家出生点（首次进入世界时的落点）
 *   teleport   — 同世界内楼层切换，踩到即走
 *   portal     — 跨世界传送门，点击交互
 *   triggerLine — 跨越边界线自动切换世界
 *
 * 字段说明 (缩写对照):
 *   world  = 所在世界       tx/ty = 同世界目标坐标  tf = 目标楼层
 *   x/y    = 传送点位置     sx/sy = 落点坐标覆盖(null=使用目标世界portal位置)
 *   to     = 目标世界       exp   = 需要探索度      msg  = 锁定提示
 *   dr     = discoverRadius ir    = interactRadius  pr   = priority
 *   x1/y1/x2/y2 = 触发线两端坐标 (仅triggerLine)
 */

var TRANSFER_TABLE = [

    // ═══ 玩家出生点 (start) ═══
    //        id                  世界      x    y

    // ═══ 同世界楼层传送 (teleport) ═══
    //        id             世界        x    y    →x   →y  →楼层  发现  交互  优先

    // ═══ 触发线 (triggerLine) ═══
    //        id             世界      x1   y1   x2   y2  →世界

    // ═══ 跨世界传送门 (portal) ═══
    //        id                世界      x     y   落x  落y  →世界       探索  提示                      发现  交互  优先
    { id:'start_world_01', world:'world_01', x:215, y:750 },
    { id:'start_world_02', world:'world_02', x:116, y:746 },
    { id:'start_world_03', world:'world_03', x:70, y:384 },
    { id:'start_world_04', world:'world_04', x:70, y:384 },
    { id:'start_world_05', world:'world_05', x:1270, y:734 },
    { id:'start_world_06', world:'world_06', x:70, y:384 },
    { id:'start_world_07', world:'world_07', x:70, y:384 },
    { id:'start_world_08', world:'world_08', x:70, y:384 },
    { id:'start_world_09', world:'world_09', x:70, y:384 },
    { id:'start_world_10', world:'world_10', x:70, y:384 },
    { id:'start_world_11', world:'world_11', x:70, y:384 },
    { id:'start_world_12', world:'world_12', x:70, y:384 },
    { id:'start_world_13', world:'world_13', x:704, y:680 },
    { id:'start_world_14', world:'world_14', x:704, y:680 },
    { id:'start_world_15', world:'world_15', x:704, y:680 },
    { id:'start_world_16', world:'world_16', x:704, y:680 },
    { id:'stairs_01_up', world:'world_01', x:377, y:561, tx:222, ty:317, tf:2, dr:40, ir:25, pr:70 },
    { id:'stairs_01_down', world:'world_01', x:222, y:317, tx:377, ty:561, tf:1, dr:40, ir:25, pr:70 },
    { id:'portal_01_02', world:'world_01', x:1274, y:80, sx:null, sy:null, to:'world_02', exp:0, msg:null, dr:120, ir:60, pr:90 },
    { id:'portal_return', world:'world_02', x:116, y:746, sx:null, sy:null, to:'world_01', exp:0, msg:null, dr:120, ir:60, pr:90 },
    { id:'portal_shuhan', world:'world_02', x:12, y:379, sx:null, sy:null, to:'world_03', exp:0, msg:'通往蜀汉的传送门', dr:100, ir:50, pr:90 },
    { id:'portal_world05', world:'world_02', x:660, y:33, sx:null, sy:null, to:'world_05', exp:0, msg:null, dr:120, ir:60, pr:90 },
    { id:'portal_w02_w17', world:'world_02', x:1314, y:353, sx:null, sy:null, to:'world_17', exp:0, msg:null, dr:120, ir:60, pr:90 },
    { id:'portal_return_egypt', world:'world_03', x:114, y:754, sx:null, sy:null, to:'world_02', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_market', world:'world_03', x:1338, y:384, sx:null, sy:null, to:'world_04', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_alley', world:'world_04', x:70, y:384, sx:null, sy:null, to:'world_03', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_temple', world:'world_04', x:1338, y:384, sx:742, sy:50, to:'world_05', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_market_w05', world:'world_05', x:70, y:384, sx:null, sy:null, to:'world_04', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_secret', world:'world_05', x:1338, y:384, sx:null, sy:null, to:'world_06', exp:0.5, msg:'神庙深处似乎隐藏着什么，探索更多再说……', dr:100, ir:50, pr:89 },
    { id:'portal_return_w02', world:'world_05', x:1284, y:748, sx:null, sy:null, to:'world_02', exp:0, msg:null, dr:120, ir:60, pr:90 },
    { id:'portal_w05_w10', world:'world_05', x:269, y:335, sx:null, sy:null, to:'world_10', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_temple_w06', world:'world_06', x:70, y:384, sx:null, sy:null, to:'world_05', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_ruins', world:'world_06', x:1338, y:384, sx:null, sy:null, to:'world_07', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_secret_w07', world:'world_07', x:70, y:384, sx:null, sy:null, to:'world_06', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_palace', world:'world_07', x:1338, y:384, sx:null, sy:null, to:'world_08', exp:0.5, msg:'古迹深处通往皇城，需要更多探索……', dr:100, ir:50, pr:89 },
    { id:'portal_ruins_w08', world:'world_08', x:70, y:384, sx:null, sy:null, to:'world_07', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_garden', world:'world_08', x:1338, y:384, sx:null, sy:null, to:'world_03', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_palace_w09', world:'world_09', x:70, y:384, sx:null, sy:null, to:'world_08', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_tunnel', world:'world_09', x:1338, y:384, sx:null, sy:null, to:'world_10', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_garden_w10', world:'world_10', x:70, y:384, sx:null, sy:null, to:'world_03', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_dusk', world:'world_10', x:1338, y:384, sx:null, sy:null, to:'world_11', exp:0.5, msg:'密道尽头似乎通向某个特殊的地方……', dr:100, ir:50, pr:89 },
    { id:'portal_tunnel_w11', world:'world_11', x:70, y:384, sx:null, sy:null, to:'world_10', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_dawn', world:'world_11', x:1338, y:384, sx:null, sy:null, to:'world_12', exp:0, msg:null, dr:100, ir:50, pr:89 },
    { id:'portal_dusk_w12', world:'world_12', x:70, y:384, sx:null, sy:null, to:'world_11', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_tower', world:'world_12', x:1338, y:384, sx:null, sy:null, to:'world_13', exp:0.6, msg:'晨曦尽头是无尽塔，需要更多准备……', dr:100, ir:50, pr:89 },
    { id:'portal_dawn_w13', world:'world_13', x:704, y:680, sx:null, sy:null, to:'world_12', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_floor2', world:'world_13', x:704, y:88, sx:null, sy:null, to:'world_14', exp:0.8, msg:'击败本层守护者才能继续攀登', dr:100, ir:50, pr:89 },
    { id:'portal_floor1', world:'world_14', x:704, y:680, sx:null, sy:null, to:'world_13', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_floor3', world:'world_14', x:704, y:88, sx:null, sy:null, to:'world_15', exp:0.8, msg:'击败本层守护者才能继续攀登', dr:100, ir:50, pr:89 },
    { id:'portal_floor2_w15', world:'world_15', x:704, y:680, sx:null, sy:null, to:'world_14', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'portal_floor4', world:'world_15', x:704, y:88, sx:null, sy:null, to:'world_16', exp:0.8, msg:'击败本层守护者才能继续攀登', dr:100, ir:50, pr:89 },
    { id:'portal_floor3_w16', world:'world_16', x:704, y:680, sx:null, sy:null, to:'world_15', exp:0, msg:null, dr:100, ir:50, pr:90 },
    { id:'start_world_17', world:'world_17', x:704, y:384 },
    { id:'portal_w17_w02', world:'world_17', x:704, y:384, sx:null, sy:null, to:'world_02', exp:0, msg:null, dr:120, ir:60, pr:90 },
];

function buildTransferDataForWorld(worldId) {
    var entities = [];
    var triggerLines = [];

    var playerStart = null;

    for (var i = 0; i < TRANSFER_TABLE.length; i++) {
        var row = TRANSFER_TABLE[i];
        if (row.world !== worldId) continue;

        if (row.id.indexOf('start_') === 0) {
            // start: 玩家出生点
            playerStart = { x: row.x, y: row.y };
        } else if (row.tf !== undefined) {
            // teleport: 同世界楼层切换
            entities.push({
                id: row.id,
                type: 'teleport',
                x: row.x, y: row.y,
                targetX: row.tx, targetY: row.ty,
                targetFloor: row.tf,
                discoverRadius: row.dr,
                interactRadius: row.ir,
                priority: row.pr,
                once: false
            });
        } else if (row.x1 !== undefined) {
            // triggerLine: 触发线
            triggerLines.push({
                x1: row.x1, y1: row.y1,
                x2: row.x2, y2: row.y2,
                targetWorld: row.to
            });
        } else {
            // portal: 跨世界传送门
            var entity = {
                id: row.id,
                type: 'portal',
                x: row.x, y: row.y,
                targetWorld: row.to,
                discoverRadius: row.dr,
                interactRadius: row.ir,
                priority: row.pr,
                once: false,
                requireExploration: row.exp
            };
            if (row.sx !== null && row.sx !== undefined) entity.spawnX = row.sx;
            if (row.sy !== null && row.sy !== undefined) entity.spawnY = row.sy;
            if (row.msg) entity.lockedMessage = row.msg;
            entities.push(entity);
        }
    }

    return { playerStart: playerStart, entities: entities, triggerLines: triggerLines };
}

export { TRANSFER_TABLE, buildTransferDataForWorld };
