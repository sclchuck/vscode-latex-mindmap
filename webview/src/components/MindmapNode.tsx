import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TreeLayoutNode, ThemeConfig } from '../types';
import { renderLatex } from '../latex/renderLatex';
import { useMindmapStore } from '../store/mindmapStore';
import { getVSCodeBridge } from '../store/vscodeBridge';

interface MindmapNodeProps {
  node: TreeLayoutNode;
  theme: ThemeConfig;
  onToggleExpand: (nodeId: string) => void;
  onUpdateContent: (nodeId: string, text: string) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  onNodeClick: (nodeId: string, e: React.MouseEvent) => void;
  onNodeDragStart: (nodeId: string, e: React.MouseEvent) => void;
}

// 阻止事件冒泡的辅助函数
const stopNodeMouseEvent = (e: React.MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
};

// Node 内边距常量
const NODE_PADDING_X = 20;
const NODE_PADDING_Y = 10;

export const MindmapNode: React.FC<MindmapNodeProps> = ({
  node,
  theme,
  onToggleExpand,
  onUpdateContent,
  isSelected = false,
  isDragging = false,
  onNodeClick,
  onNodeDragStart,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.data.data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 编辑内容区域尺寸
  const [editContentSize, setEditContentSize] = useState({ width: 0, height: 0 });
  // 编辑框尺寸（允许 textarea 超出节点边框）
  const [editBoxSize, setEditBoxSize] = useState({ width: 0, height: 0 });
  // 冻结节点尺寸（编辑时固定外框）
  const [frozenNodeSize, setFrozenNodeSize] = useState<{ width: number; height: number } | null>(null);
  
  const oldTextRef = useRef<string>(node.data.data.text);
  const clickStartRef = useRef<{ x: number; y: number } | null>(null);
  
  const {
    setSelectedNodeId,
    isRootNode,
    changeNodeContent,
    updateNodeDimensions,
  } = useMindmapStore();
  
  const isRoot = isRootNode(node.data.data.id);
  const hasChildren = node.hasChildren;
  const isCollapsed = node.data.data.expandState === 'collapse';
  
  // 渲染 LaTeX 内容
  const { html } = renderLatex(node.data.data.text);
  
  // 当节点文本更新时，同步 editText
  useEffect(() => {
    setEditText(node.data.data.text);
    oldTextRef.current = node.data.data.text;
  }, [node.data.data.text]);
  
  // 测量并更新节点尺寸（编辑模式时不测量）
  useEffect(() => {
    const measureNode = () => {
      if (!nodeRef.current || isEditing) return;

      const width = nodeRef.current.offsetWidth;
      const height = nodeRef.current.offsetHeight;

      if (width > 0 && height > 0) {
        updateNodeDimensions(node.data.data.id, width, height);
      }
    };

    const timeoutId = setTimeout(measureNode, 50);
    return () => clearTimeout(timeoutId);
  }, [node.data.data.id, node.data.data.text, html, isEditing, updateNodeDimensions]);
  
  // 编辑时更新编辑框尺寸（textarea 自身扩展，node 外框不变）
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;

    const textarea = textareaRef.current;

    // 临时收缩，读取真实 scroll 尺寸
    textarea.style.width = '1px';
    textarea.style.height = '1px';

    const nextWidth = Math.max(
      editContentSize.width || 0,
      textarea.scrollWidth + 2,  // +2 避免因误差显示滚动条
      20
    );

    const nextHeight = Math.max(
      editContentSize.height || 0,
      textarea.scrollHeight + 2,  // +2 避免因误差显示滚动条
      20
    );

    setEditBoxSize({
      width: nextWidth,
      height: nextHeight,
    });
  }, [isEditing, editText, editContentSize.width, editContentSize.height]);
  
  // 开始编辑 - 记录尺寸
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // 冻结整个节点外框尺寸 - 使用 offsetWidth/offsetHeight 不受 zoom 影响
    if (nodeRef.current) {
      const width = nodeRef.current.offsetWidth;
      const height = nodeRef.current.offsetHeight;

      setFrozenNodeSize({
        width,
        height,
      });
      console.log(`[Node] 冻结节点尺寸: ${width}x${height}`);
    }

    // 记录内容区域尺寸 - 使用 offsetWidth/offsetHeight 不受 zoom 影响
    if (contentRef.current) {
      const width = contentRef.current.offsetWidth;
      const height = contentRef.current.offsetHeight;

      setEditContentSize({
        width,
        height,
      });
      console.log(`[Node] 编辑内容尺寸: ${width}x${height}`);
    }

    setIsEditing(true);
    setEditText(node.data.data.text);
    oldTextRef.current = node.data.data.text;
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [node.data.data.text]);
  
  // 完成编辑
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setFrozenNodeSize(null); // 解除冻结
    setEditBoxSize({ width: 0, height: 0 }); // 清理编辑框尺寸
    setEditContentSize({ width: 0, height: 0 }); // 清理内容尺寸
  
    const oldText = oldTextRef.current;
    const newText = editText;
  
    if (newText !== oldText) {
      console.log(`[MindmapNode] 内容变更: "${oldText}" -> "${newText}"`);
      changeNodeContent(node.data.data.id, oldText, newText);
      
      // 通知 VS Code 文档已变更（不保存，不 markClean）
      const currentDoc = useMindmapStore.getState().document;
      if (currentDoc) {
        getVSCodeBridge().notifyDocumentChanged(currentDoc);
      }
      
      // 删除原来的 onUpdateContent 调用，避免 documentUpdated -> markClean 清掉 isDirty
      // onUpdateContent(node.data.data.id, newText);
    }
  }, [editText, node.data.data.id, changeNodeContent]);
  
  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setFrozenNodeSize(null); // 解除冻结
      setEditBoxSize({ width: 0, height: 0 }); // 清理编辑框尺寸
      setEditContentSize({ width: 0, height: 0 }); // 清理内容尺寸
      setEditText(node.data.data.text);
    }
  }, [handleBlur, node.data.data.text]);
  
  // 鼠标按下 - 记录起始位置（编辑模式下禁用拖拽）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 编辑模式下不启动拖拽
    if (isEditing) {
      e.stopPropagation();
      return;
    }

    if (e.button !== 0) return;
    e.stopPropagation();

    clickStartRef.current = { x: e.clientX, y: e.clientY };
    onNodeDragStart(node.data.data.id, e);
  }, [isEditing, node.data.data.id, onNodeDragStart]);

  // 鼠标移动 - 检测拖拽（编辑模式下禁用）
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // 编辑模式下不处理
    if (isEditing) return;

    if (!clickStartRef.current) return;

    const dx = e.clientX - clickStartRef.current.x;
    const dy = e.clientY - clickStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      clickStartRef.current = null;
    }
  }, [isEditing]);

  // 鼠标抬起 - 点击或结束拖拽（编辑模式下禁用）
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // 编辑模式下不处理
    if (isEditing) {
      e.stopPropagation();
      return;
    }

    if (!clickStartRef.current) return;

    const dx = e.clientX - clickStartRef.current.x;
    const dy = e.clientY - clickStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      e.stopPropagation();
      onNodeClick(node.data.data.id, e);
    }

    clickStartRef.current = null;
  }, [isEditing, node.data.data.id, onNodeClick]);
  
  // 确定背景色和边框色
  const getBackgroundColor = () => {
    if (isSelected) return theme.selectedBackground;
    if (isRoot) return theme.rootBackground;
    return theme.nodeBackground;
  };
  
  const getBorderColor = () => {
    if (isSelected) return theme.selectedBorder;
    if (isRoot) return theme.rootBorder;
    return theme.nodeBorder;
  };
  
  const getTextColor = () => {
    if (isRoot) return theme.rootText;
    return theme.nodeText;
  };
  
  return (
    <div
      ref={nodeRef}
      id={`node-${node.data.data.id}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{
        minWidth: 150,
        // 编辑时固定节点尺寸，防止大小变化
        width: isEditing && frozenNodeSize ? frozenNodeSize.width : undefined,
        height: isEditing && frozenNodeSize ? frozenNodeSize.height : undefined,
        minHeight: 40,
        padding: `${NODE_PADDING_Y}px ${NODE_PADDING_X}px`,
        paddingRight: NODE_PADDING_X,
        borderRadius: 8,
        border: `2px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        // 编辑时光标变为文本选择
        cursor: isEditing ? 'text' : isDragging ? 'grabbing' : 'pointer',
        // 编辑时允许文本选择
        userSelect: isEditing ? 'text' : 'none',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(74, 144, 217, 0.5)'
          : isDragging
            ? '0 8px 24px rgba(0,0,0,0.3)'
            : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
        position: 'relative',
        // 编辑时提升 z-index 避免被其他节点遮挡
        zIndex: isEditing ? 10000 : isSelected ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',

        // 允许展开折叠按钮和绝对定位编辑框显示到节点外部
        overflow: 'visible',
      }}
    >
      {isEditing ? (
        // 绝对定位编辑层，脱离 flex 布局
        <div
          style={{
            position: 'absolute',
            left: NODE_PADDING_X,
            top: NODE_PADDING_Y,
            overflow: 'visible',
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            wrap="off"
            style={{
              width: editBoxSize.width > 0 ? editBoxSize.width : (editContentSize.width > 0 ? editContentSize.width : 20),
              height: editBoxSize.height > 0 ? editBoxSize.height : (editContentSize.height > 0 ? editContentSize.height : 20),
              minWidth: editContentSize.width > 0 ? editContentSize.width : 20,
              minHeight: editContentSize.height > 0 ? editContentSize.height : 20,
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              lineHeight: '1.2',
              resize: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              display: 'block',
              boxSizing: 'content-box',

              // 不自动换行
              whiteSpace: 'pre',
              wordBreak: 'keep-all',
              overflowWrap: 'normal',

              // hidden 禁止 textarea 自己的滚动条，内容通过 editBoxSize 扩大而不会裁剪
              overflow: 'hidden',
              scrollbarWidth: 'none',  // Firefox
              msOverflowStyle: 'none',  // IE/旧 Edge

              maxWidth: 'none',
              maxHeight: 'none',

              position: 'relative',
              zIndex: 10001,
            }}
            autoFocus
          />
        </div>
      ) : (
        <div
          ref={contentRef}
          style={{
            minHeight: 20,

            // 不自动换行，让节点宽度根据内容自动撑开
            whiteSpace: 'nowrap',
            wordBreak: 'keep-all',
            overflowWrap: 'normal',

            // 防止 KaTeX 或内联元素导致奇怪折行
            display: 'inline-block',

            // 非编辑时内容参与节点尺寸计算
            overflow: 'visible',
            maxWidth: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: html || node.data.data.text }}
        />
      )}
    
      {/* 展开/折叠按钮 */}
      {hasChildren && (
        <button
          onMouseDown={stopNodeMouseEvent}
          onMouseUp={stopNodeMouseEvent}
          onClick={(e) => {
            stopNodeMouseEvent(e);
            onToggleExpand(node.data.data.id);
          }}
          onDoubleClick={stopNodeMouseEvent}
          style={{
            position: 'absolute',
            right: -14,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `2px solid ${getBorderColor()}`,
            backgroundColor: getBackgroundColor(),
            color: getTextColor(),
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 0,
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            pointerEvents: 'auto',
          }}
          title={isCollapsed ? '展开' : '折叠'}
        >
          {isCollapsed ? '+' : '-'}
        </button>
      )}
    </div>
  );
};