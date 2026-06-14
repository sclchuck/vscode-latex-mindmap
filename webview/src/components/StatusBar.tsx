import React, { useMemo } from 'react';
import { useMindmapStore } from '../store/mindmapStore';
import { MindmapNode } from '../types';

/** 递归统计文档中所有节点（含折叠隐藏的） */
function countAllNodes(node: MindmapNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countAllNodes(child);
  }
  return count;
}

/** 递归统计当前可见的节点：遇到 collapse 则跳过其子树 */
function countVisibleNodes(node: MindmapNode): number {
  let count = 1;
  if (node.data.expandState === 'collapse') {
    return count;
  }
  for (const child of node.children) {
    count += countVisibleNodes(child);
  }
  return count;
}

export const StatusBar: React.FC = () => {
  const document = useMindmapStore((s) => s.document);

  const { total, visible } = useMemo(() => {
    if (!document?.root) {
      return { total: 0, visible: 0 };
    }
    return {
      total: countAllNodes(document.root),
      visible: countVisibleNodes(document.root),
    };
  }, [document]);

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">总数: {total}</span>
        <span className="statusbar-separator">|</span>
        <span className="statusbar-item">可见: {visible}</span>
      </div>
      <div className="statusbar-right">
        {/* 预留扩展位 */}
      </div>
    </div>
  );
};
