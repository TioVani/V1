#!/usr/bin/env node
/**
 * check-api-compat.mjs
 * 检查外部代码是否引用了系统模块未导出的方法或已删除的状态字段
 *
 * 用法: node scripts/check-api-compat.mjs
 * 正常退出(0) = 无过期引用，退出(1) = 发现过期引用
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const ROOT = resolve(__dirname, '..');

// ─── 配置：要检查的模块 ───
// file: 模块路径（相对于 ROOT）
// callPatterns: 外部代码中引用此模块实例的变量名
const MODULES = [
    {
        file: 'src/systems/BattleEngine.js',
        callPatterns: ['battleEngine', 'engine'],
    },
];

// ─── 工具函数 ───

function readAllJs(dir) {
    const files = [];
    try {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            const stat = statSync(full);
            if (stat.isDirectory()) {
                files.push(...readAllJs(full));
            } else if (extname(entry) === '.js') {
                files.push(full);
            }
        }
    } catch { /* skip */ }
    return files;
}

function extractExports(content) {
    const matches = [...content.matchAll(/return\s*\{([\s\S]*?)\}\s*;/g)];
    if (!matches.length) return new Set();
    const last = matches[matches.length - 1][1];
    return new Set([...last.matchAll(/(\w+)\s*:/g)].map(m => m[1]));
}

function extractStateFields(content) {
    const match = content.match(/function\s+createDefaultState[\s\S]*?return\s*\{([\s\S]*?)\}\s*;/);
    if (!match) return new Set();
    return new Set([...match[1].matchAll(/(\w+)\s*:/g)].map(m => m[1]));
}

function findMethodCalls(files, patterns, selfFile) {
    // 收集 { methodName: [file:line, ...] }
    const calls = new Map();
    for (const file of files) {
        if (file === selfFile) continue;
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (const pat of patterns) {
                const re = new RegExp(pat + '\\.(\\w+)\\s*\\(', 'g');
                let m;
                while ((m = re.exec(lines[i])) !== null) {
                    const method = m[1];
                    const rel = file.replace(ROOT + sepPattern, '').replace(/\\/g, '/');
                    if (!calls.has(method)) calls.set(method, []);
                    calls.get(method).push(`${rel}:${i + 1}`);
                }
            }
        }
    }
    return calls;
}

function findStateFieldRefs(files, selfFile) {
    // 只在包含 `S = xxx.getState()` 模式的文件中找 S.fieldName 引用
    const refs = new Map();
    for (const file of files) {
        if (file === selfFile) continue;
        const content = readFileSync(file, 'utf-8');
        // 只匹配确实把 getState() 赋给 S 的文件
        if (!/\bS\s*=\s*\w+\.getState\(\)/.test(content)) continue;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const re = /\bS\.(\w+)/g;
            let m;
            while ((m = re.exec(lines[i])) !== null) {
                const field = m[1];
                const rel = file.replace(ROOT + sepPattern, '').replace(/\\/g, '/');
                if (!refs.has(field)) refs.set(field, []);
                refs.get(field).push(`${rel}:${i + 1}`);
            }
        }
    }
    return refs;
}

// Windows/Unix 路径分隔符
const sepPattern = /[/\\]/;

// ─── 主逻辑 ───

const srcFiles = readAllJs(resolve(ROOT, 'src'));
const gameFile = resolve(ROOT, 'game.js');
const allFiles = [...srcFiles, gameFile];

let issues = 0;

for (const mod of MODULES) {
    const filePath = resolve(ROOT, mod.file);
    const content = readFileSync(filePath, 'utf-8');
    const exports = extractExports(content);
    const stateFields = extractStateFields(content);

    console.log(`\n=== ${mod.file} ===`);
    console.log(`Exports (${exports.size}): ${[...exports].join(', ')}`);
    console.log(`State fields (${stateFields.size}): ${[...stateFields].join(', ')}`);

    // 检查 1: 外部调用了未导出的方法
    const calls = findMethodCalls(allFiles, mod.callPatterns, filePath);
    for (const [method, locs] of calls) {
        if (!exports.has(method)) {
            console.log(`\n❌ STALE METHOD: .${method}() not exported but called at:`);
            locs.forEach(l => console.log(`   ${l}`));
            issues++;
        }
    }

    // 检查 2: 外部引用了已删除的状态字段
    const stateRefs = findStateFieldRefs(allFiles, filePath);
    for (const [field, locs] of stateRefs) {
        if (!stateFields.has(field)) {
            console.log(`\n❌ STALE STATE: S.${field} not in createDefaultState() but referenced at:`);
            locs.forEach(l => console.log(`   ${l}`));
            issues++;
        }
    }
}

if (issues > 0) {
    console.log(`\n❌ Found ${issues} stale reference(s)`);
    process.exit(1);
} else {
    console.log('\n✅ No stale references found');
}
