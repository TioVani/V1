/**
 * AssetManager — 统一资源加载/获取/释放
 * 兼容当前异步加载模式：loadGroup 不阻塞，图片通过 onload/onerror 就绪
 */
function createAssetManager(deps) {
    var createImage = deps.createImage;
    var imageGroups = deps.imageGroups;
    var beautyConfig = deps.beautyConfig;
    var characterMap = deps.characterMap;

    var _cache = {};
    var _groupLoaded = {};

    // 初始化时自动生成 beauty 帧条目
    if (beautyConfig && beautyConfig.frameCount > 0) {
        var beautyItems = [];
        for (var i = 0; i < beautyConfig.frameCount; i++) {
            var num = String(i).padStart(beautyConfig.padLength, '0');
            beautyItems.push({
                id: 'beauty_' + num,
                src: beautyConfig.basePath + num + beautyConfig.extension
            });
        }
        imageGroups.beauty = beautyItems;
    }

    function loadGroup(groupId) {
        var items = imageGroups[groupId];
        if (!items) return;
        _groupLoaded[groupId] = true;
        for (var i = 0; i < items.length; i++) {
            _loadImage(items[i]);
        }
    }

    function loadAll() {
        var keys = Object.keys(imageGroups);
        for (var i = 0; i < keys.length; i++) {
            loadGroup(keys[i]);
        }
    }

    function _loadImage(item) {
        var img = createImage();
        img._loaded = false;
        img._id = item.id;
        img.onload = function() { img._loaded = true; };
        img.onerror = function() { img._loaded = false; };
        img.src = item.src;
        _cache[item.id] = img;
    }

    function get(id) {
        return _cache[id] || null;
    }

    function getOrDefault(id, fallback) {
        var asset = _cache[id];
        return (asset && asset._loaded) ? asset : fallback;
    }

    function getFrames(groupId) {
        var items = imageGroups[groupId];
        if (!items) return [];
        var frames = [];
        for (var i = 0; i < items.length; i++) {
            var img = _cache[items[i].id];
            if (img) frames.push(img);
        }
        return frames;
    }

    function unloadGroup(groupId) {
        var items = imageGroups[groupId];
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            var id = items[i].id;
            var img = _cache[id];
            if (img) {
                img.onload = null;
                img.onerror = null;
                img.src = '';
            }
            delete _cache[id];
        }
        _groupLoaded[groupId] = false;
    }

    function isGroupLoaded(groupId) {
        return !!_groupLoaded[groupId];
    }

    function getLoadingProgress() {
        var loaded = 0;
        var total = 0;
        var keys = Object.keys(_cache);
        for (var i = 0; i < keys.length; i++) {
            total++;
            if (_cache[keys[i]] && _cache[keys[i]]._loaded) loaded++;
        }
        return total > 0 ? loaded / total : 0;
    }

    return {
        loadGroup: loadGroup,
        loadAll: loadAll,
        get: get,
        getOrDefault: getOrDefault,
        getFrames: getFrames,
        unloadGroup: unloadGroup,
        isGroupLoaded: isGroupLoaded,
        getLoadingProgress: getLoadingProgress
    };
}

export { createAssetManager };
