"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TexMindDocument = void 0;
const types_1 = require("./types");
class TexMindDocument {
    constructor(document) {
        this.document = document || this.createDefaultDocument();
    }
    // 创建默认文档
    createDefaultDocument() {
        const rootId = (0, types_1.generateId)();
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
    // 获取文档
    getDocument() {
        return this.document;
    }
    // 设置文档
    setDocument(document) {
        this.document = document;
    }
    // 解析 JSON 内容
    static parse(content) {
        console.log('[DATA] 源数据解析开始');
        console.log('[DATA] 原始内容长度:', content.length);
        console.log('[DATA] 内容预览:', content.substring(0, 200) + (content.length > 200 ? '...' : ''));
        try {
            const data = JSON.parse(content);
            // 支持 .km 格式转换
            if (data.root) {
                const nodeCount = TexMindDocument.countNodes(data.root);
                console.log('[DATA] 解析成功! 根节点ID:', data.root.data.id);
                console.log('[DATA] 根节点文本:', data.root.data.text);
                console.log('[DATA] 总节点数:', nodeCount);
                return new TexMindDocument(data);
            }
            console.warn('[DATA] 无效的文档格式');
            throw new Error('Invalid document format');
        }
        catch (error) {
            console.error('[DATA] 解析失败:', error);
            // 返回默认文档
            return new TexMindDocument();
        }
    }
    // 统计节点数量（用于日志）
    static countNodes(node) {
        let count = 1;
        for (const child of node.children) {
            count += TexMindDocument.countNodes(child);
        }
        return count;
    }
    // 序列化文档
    serialize() {
        return JSON.stringify(this.document, null, 2);
    }
    // 查找节点
    findNode(nodeId) {
        return this.findNodeRecursive(this.document.root, nodeId);
    }
    findNodeRecursive(node, nodeId) {
        if (node.data.id === nodeId) {
            return node;
        }
        for (const child of node.children) {
            const found = this.findNodeRecursive(child, nodeId);
            if (found) {
                return found;
            }
        }
        return null;
    }
    // 查找父节点
    findParent(nodeId) {
        return this.findParentRecursive(this.document.root, nodeId);
    }
    findParentRecursive(node, nodeId) {
        for (const child of node.children) {
            if (child.data.id === nodeId) {
                return node;
            }
            const found = this.findParentRecursive(child, nodeId);
            if (found) {
                return found;
            }
        }
        return null;
    }
    // 添加子节点
    addChildNode(parentId, text = "New Node") {
        const parent = this.findNode(parentId);
        if (!parent) {
            return null;
        }
        const newNode = {
            data: {
                id: (0, types_1.generateId)(),
                created: Date.now(),
                text: text,
                expandState: "expand"
            },
            children: []
        };
        parent.children.push(newNode);
        return newNode;
    }
    // 添加兄弟节点
    addSiblingNode(nodeId, text = "New Node") {
        const parent = this.findParent(nodeId);
        if (!parent) {
            return null;
        }
        const newNode = {
            data: {
                id: (0, types_1.generateId)(),
                created: Date.now(),
                text: text,
                expandState: "expand"
            },
            children: []
        };
        parent.children.push(newNode);
        return newNode;
    }
    // 删除节点
    deleteNode(nodeId) {
        const parent = this.findParent(nodeId);
        if (!parent) {
            // 不能删除根节点
            return false;
        }
        const index = parent.children.findIndex(child => child.data.id === nodeId);
        if (index !== -1) {
            parent.children.splice(index, 1);
            return true;
        }
        return false;
    }
    // 更新节点内容
    updateNode(nodeId, updates) {
        const node = this.findNode(nodeId);
        if (!node) {
            return false;
        }
        Object.assign(node.data, updates);
        return true;
    }
    // 切换节点展开状态
    toggleExpand(nodeId) {
        const node = this.findNode(nodeId);
        if (!node) {
            return false;
        }
        node.data.expandState = node.data.expandState === "expand" ? "collapse" : "expand";
        return true;
    }
    // 移动节点到新的父节点
    moveNode(nodeId, newParentId) {
        const node = this.findNode(nodeId);
        const newParent = this.findNode(newParentId);
        const oldParent = this.findParent(nodeId);
        if (!node || !newParent || !oldParent || nodeId === newParentId) {
            return false;
        }
        // 检查是否是将节点移动到自己的子节点中（防止循环引用）
        if (this.isDescendant(newParentId, nodeId)) {
            return false;
        }
        // 从旧父节点移除
        const index = oldParent.children.findIndex(child => child.data.id === nodeId);
        if (index !== -1) {
            oldParent.children.splice(index, 1);
        }
        // 添加到新父节点
        newParent.children.push(node);
        node.data.expandState = "expand";
        return true;
    }
    // 检查 targetId 是否是 nodeId 的后代
    isDescendant(nodeId, targetId) {
        const node = this.findNode(nodeId);
        if (!node) {
            return false;
        }
        return this.findNodeRecursive(node, targetId) !== null;
    }
    // 获取所有节点 ID
    getAllNodeIds() {
        const ids = [];
        this.collectIdsRecursive(this.document.root, ids);
        return ids;
    }
    collectIdsRecursive(node, ids) {
        ids.push(node.data.id);
        for (const child of node.children) {
            this.collectIdsRecursive(child, ids);
        }
    }
    // 统计节点数量
    getNodeCount() {
        let count = 0;
        this.countRecursive(this.document.root, { value: count });
        return count;
    }
    countRecursive(node, count) {
        count.value++;
        for (const child of node.children) {
            this.countRecursive(child, count);
        }
    }
}
exports.TexMindDocument = TexMindDocument;
//# sourceMappingURL=TexMindDocument.js.map