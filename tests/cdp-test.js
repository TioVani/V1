/**
 * cdp-connect.js — 直接通过 WebSocket 连接开发者工具自动化端口
 * 绕过 miniprogram-automator，直接发送命令
 */
const WebSocket = require('ws');

const PORT = process.argv[2] || 9432;
const WS_URL = `ws://127.0.0.1:${PORT}`;

async function main() {
    console.log(`连接 ${WS_URL} ...`);

    const ws = new WebSocket(WS_URL);
    let msgId = 0;
    const pending = {};

    function send(method, params) {
        return new Promise((resolve, reject) => {
            const id = ++msgId;
            pending[id] = { resolve, reject };
            const msg = JSON.stringify({ id, method, params: params || {} });
            console.log('[SEND]', msg);
            ws.send(msg);
        });
    }

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        // console.log('[RECV]', JSON.stringify(msg).substring(0, 200));
        if (msg.id && pending[msg.id]) {
            if (msg.error) {
                pending[msg.id].reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
                pending[msg.id].resolve(msg.result);
            }
            delete pending[msg.id];
        }
    });

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
        setTimeout(() => reject(new Error('connection timeout')), 10000);
    });

    console.log('[OK] WebSocket 已连接');

    // 测试: 获取工具信息
    try {
        const info = await send('Tool.getInfo', {});
        console.log('[INFO] Tool info:', JSON.stringify(info));
    } catch(e) {
        console.log('[INFO] Tool.getInfo failed:', e.message);
    }

    // 测试: 调用 wx 方法
    try {
        const result = await send('Tool.evaluate', {
            expr: 'JSON.stringify({ width: wx.getSystemInfoSync().windowWidth, height: wx.getSystemInfoSync().windowHeight })'
        });
        console.log('[RESULT] Screen:', result);
    } catch(e) {
        console.log('[FAIL] evaluate:', e.message);

        // 尝试 App 方法
        try {
            const result2 = await send('App.callMethod', {
                method: 'getCurrentPages'
            });
            console.log('[RESULT] Pages:', JSON.stringify(result2));
        } catch(e2) {
            console.log('[FAIL] callMethod:', e2.message);
        }
    }

    // 列出所有可用方法
    try {
        const methods = await send('Tool.getSource', {});
        console.log('[RESULT] Source:', JSON.stringify(methods).substring(0, 500));
    } catch(e) {
        console.log('[INFO] getSource:', e.message);
    }

    ws.close();
    console.log('[DONE]');
}

main().catch(e => {
    console.error('[ERROR]', e.message);
    process.exit(1);
});
