"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNonce = getNonce;
// 生成安全的 nonce 值用于 Webview CSP
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
//# sourceMappingURL=nonce.js.map