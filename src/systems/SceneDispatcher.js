/**
 * SceneDispatcher — 剧情场景调度器
 * 负责从 STORY_SCENES 读取场景配置，依次执行各阶段对话播放，
 * 在阶段之间插入战斗流程控制，管理战斗中 trigger 的注册/注销。
 */
import { STORY_SCENES } from '../config/DialogueConfig.js';

function createSceneDispatcher(deps) {
    var dialogueSystem = deps.dialogueSystem;
    var startBattle = deps.startBattle;
    var stateMachine = deps.stateMachine;
    var gameStateEnum = deps.gameStateEnum;
    var completeEventTask = deps.completeEventTask || function() {};
    var onBeforeStarClickHook = deps.onBeforeStarClickHook || null;

    // ── 当前场景状态 ──────────────────────────────
    var _activeScene = null;
    var _activeSceneId = null;
    var _phase = 'idle';
    var _preBattlePlayed = false;
    var _battleTriggerRegistered = false;
    var _firstStarClickCallback = null;

    // ── 核心 API ──────────────────────────────────

    function start(sceneId, context) {
        var scene = STORY_SCENES[sceneId];
        if (!scene) {
            console.warn('SceneDispatcher: 未知场景', sceneId);
            return;
        }

        _activeScene = scene;
        _activeSceneId = sceneId;
        _phase = 'preBattle';
        _preBattlePlayed = false;

        if (scene.preBattle) {
            _phase = 'preBattle';
            stateMachine.transitionTo(gameStateEnum.CUTSCENE_DIALOGUE);
            dialogueSystem.play({
                script: scene.preBattle.script,
                mode: 'fullscreen',
                onComplete: function() {
                    _preBattlePlayed = true;
                    _phase = 'inBattle';
                    startBattle(context);
                    registerBattleTriggers(scene.inBattle, context);
                },
            });
        } else {
            _phase = 'inBattle';
            startBattle(context);
            registerBattleTriggers(scene.inBattle, context);
        }
    }

    function onBattleEnd(result) {
        if (!_activeScene) return;

        unregisterBattleTriggers();

        if (result === 'win') {
            if (_activeScene.postBattle) {
                _phase = 'postBattle';
                stateMachine.transitionTo(gameStateEnum.CUTSCENE_DIALOGUE);
                if (dialogueSystem.isActive()) dialogueSystem.destroy();
                dialogueSystem.play({
                    script: _activeScene.postBattle.script,
                    mode: 'fullscreen',
                    onComplete: function() {
                        executeAction(_activeScene.postBattle.onCompleteAction);
                        _activeScene = null;
                        _activeSceneId = null;
                        _phase = 'idle';
                        stateMachine.transitionTo(gameStateEnum.WORLDMAP);
                    },
                });
            } else {
                _activeScene = null;
                _activeSceneId = null;
                _phase = 'idle';
                stateMachine.transitionTo(gameStateEnum.WORLDMAP);
            }
        } else {
            _phase = 'inBattle';
        }
    }

    function getActiveSceneId() {
        return _activeSceneId;
    }

    function getPhase() {
        return _phase;
    }

    function getPreBattlePlayed() {
        return _preBattlePlayed;
    }

    function destroy() {
        unregisterBattleTriggers();
        _activeScene = null;
        _activeSceneId = null;
        _phase = 'idle';
        _preBattlePlayed = false;
    }

    // ── 战斗触发器注册 ────────────────────────────

    function registerBattleTriggers(inBattleConfig, context) {
        if (!inBattleConfig || !inBattleConfig.triggers) return;

        _battleTriggerRegistered = true;

        if (inBattleConfig.mode === 'guide_anim') {
            registerGuideAnimTriggers(inBattleConfig);
        } else {
            registerOverlayTriggers(inBattleConfig);
        }
    }

    function registerGuideAnimTriggers(inBattleConfig) {
        var battleStartTrigger = null;
        for (var i = 0; i < inBattleConfig.triggers.length; i++) {
            if (inBattleConfig.triggers[i].at === 'battle_start') {
                battleStartTrigger = inBattleConfig.triggers[i];
                break;
            }
        }
        if (battleStartTrigger) {
            var delayMs = battleStartTrigger.delayMs || 0;
            setTimeout(function() {
                if (_activeScene && _phase === 'inBattle') {
                    dialogueSystem.play({
                        mode: 'guide_anim',
                        guideAnim: inBattleConfig.guideAnim,
                        triggers: inBattleConfig.triggers,
                        startIndex: 0,
                    });
                }
            }, delayMs);
        }
        // first_star_click 不再在此处注册，由 DialogueSystem 在滑入完成后自行注册
    }

    function registerOverlayTriggers(inBattleConfig) {
        for (var i = 0; i < inBattleConfig.triggers.length; i++) {
            var trigger = inBattleConfig.triggers[i];
            if (trigger.at === 'battle_start') {
                var delayMs = trigger.delayMs || 0;
                setTimeout(function() {
                    if (_activeScene && _phase === 'inBattle') {
                        dialogueSystem.playFromLine(
                            inBattleConfig.script,
                            trigger.lineIndex,
                            inBattleConfig.mode || 'overlay',
                            null,
                            trigger.autoDismiss
                        );
                    }
                }, delayMs);
            } else if (trigger.at === 'first_star_click') {
                _firstStarClickCallback = function() {
                    if (dialogueSystem.isActive()) {
                        dialogueSystem.destroy();
                    }
                    if (_activeScene && _phase === 'inBattle') {
                        dialogueSystem.playFromLine(
                            inBattleConfig.script,
                            trigger.lineIndex,
                            inBattleConfig.mode || 'overlay',
                            null,
                            trigger.autoDismiss
                        );
                    }
                    _firstStarClickCallback = null;
                };
                if (onBeforeStarClickHook) {
                    var adapter = onBeforeStarClickHook.getAdapter ? onBeforeStarClickHook.getAdapter() : null;
                    if (adapter && adapter.registerFirstStarClick) {
                        adapter.registerFirstStarClick(_firstStarClickCallback);
                    }
                }
            }
        }
    }

    function unregisterBattleTriggers() {
        // overlay 模式：通过 adapter 注销
        if (_firstStarClickCallback) {
            if (onBeforeStarClickHook) {
                var adapter = onBeforeStarClickHook.getAdapter ? onBeforeStarClickHook.getAdapter() : null;
                if (adapter && adapter.unregisterFirstStarClick) {
                    adapter.unregisterFirstStarClick();
                }
            }
            _firstStarClickCallback = null;
        }
        // guide_anim 模式：由 DialogueSystem 自行注销，这里不再需要手动注销
        _battleTriggerRegistered = false;
    }

    // ── 动作执行 ──────────────────────────────────

    function executeAction(action) {
        if (!action) return;
        if (action.type === 'create_task') {
            completeEventTask(action.taskId);
        }
    }

    // ── 公开接口 ──────────────────────────────────
    return {
        start: start,
        onBattleEnd: onBattleEnd,
        getActiveSceneId: getActiveSceneId,
        getPhase: getPhase,
        getPreBattlePlayed: getPreBattlePlayed,
        destroy: destroy,
        // 重试时只注册 first_star_click trigger（不重复播 battle_start）
        registerBattleTriggersRetry: function(inBattleConfig) {
            if (!inBattleConfig || !inBattleConfig.triggers) return;

            if (inBattleConfig.mode === 'guide_anim') {
                // guide_anim 重试：重新 play，startIndex=1（跳过 battle_start）
                // DialogueSystem 内部会在滑入完成后自行注册 firstStarClick
                var firstStarClickTrigger = null;
                for (var i = 0; i < inBattleConfig.triggers.length; i++) {
                    if (inBattleConfig.triggers[i].at === 'first_star_click') {
                        firstStarClickTrigger = inBattleConfig.triggers[i];
                        break;
                    }
                }
                if (firstStarClickTrigger) {
                    dialogueSystem.play({
                        mode: 'guide_anim',
                        guideAnim: inBattleConfig.guideAnim,
                        triggers: inBattleConfig.triggers,
                        startIndex: 1,
                    });
                }
            } else {
                for (var i = 0; i < inBattleConfig.triggers.length; i++) {
                    var trigger = inBattleConfig.triggers[i];
                    if (trigger.at === 'first_star_click') {
                        _firstStarClickCallback = function() {
                            if (dialogueSystem.isActive()) {
                                dialogueSystem.destroy();
                            }
                            if (_activeScene && _phase === 'inBattle') {
                                dialogueSystem.playFromLine(
                                    inBattleConfig.script,
                                    trigger.lineIndex,
                                    inBattleConfig.mode || 'overlay',
                                    null,
                                    trigger.autoDismiss
                                );
                            }
                            _firstStarClickCallback = null;
                        };
                        if (onBeforeStarClickHook) {
                            var adapter = onBeforeStarClickHook.getAdapter ? onBeforeStarClickHook.getAdapter() : null;
                            if (adapter && adapter.registerFirstStarClick) {
                                adapter.registerFirstStarClick(_firstStarClickCallback);
                            }
                        }
                    }
                }
            }
        },
    };
}

export { createSceneDispatcher };