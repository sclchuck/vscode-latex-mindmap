"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultDocument = createDefaultDocument;
exports.generateId = generateId;
// 创建默认文档
function createDefaultDocument() {
    const rootId = generateId();
    return {
        root: {
            data: {
                id: rootId,
                created: Date.now(),
                text: "New Mindmap",
                expandState: "expand"
            },
            children: []
        },
        template: "right",
        theme: "fresh-blue",
        version: "1.0.0"
    };
}
// 生成唯一 ID
function generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}
//# sourceMappingURL=types.js.map