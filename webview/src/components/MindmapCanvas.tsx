import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MindmapDocument, MindmapNodeData, TreeLayoutNode } from '../types';
import { calculateTreeLayout, getLinkPath } from '../layout/treeLayout';
import { MindmapNode as MindmapNodeComponent } from './MindmapNode';
import { useMindmapStore } from '../store/mindmapStore';
import { DragDropService, DropPreview, DropMode, InsertPosition } from '../store/DragDropService';

interface MindmapCanvasProps {
  document: MindmapDocument;
  onUpdateNode: (nodeId: string, updates: Partial<MindmapNodeData>) => void;
  onToggleExpand: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  document,
  onUpdateNode,
  onToggleExpand,
  onAddChild,
  onAddSibling,
  onDeleteNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  
  // 拖拽服务 - 单一职责
  const dragDropServiceRef = useRef<DragDropService>(new DragDropService());
  const dragDropService = dragDropServiceRef.current;
  
  // 拖拽起始位置引用
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Pointer 捕获 ref - 修复右键 pan 卡顿问题
  const panPointerIdRef = useRef<number | null>(null);
  const panButtonRef = useRef<number | null>(null);
  
  const {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    layoutConfig,
    currentTheme,
    selectedNodeIds,
    setSelectedNodeId,
    toggleNodeSelection,
    selectNodes,
    clearAllSelection,
    isNodeSelected,
    moveNodes,
    nodeDimensions,
  } = useMindmapStore();
  
  // 计算布局
  const layoutResult = calculateTreeLayout(document.root, layoutConfig, nodeDimensions);
  
  // 更新内容
  const handleUpdateContent = useCallback((nodeId: string, text: string) => {
    onUpdateNode(nodeId, { text });
  }, [onUpdateNode]);
  
  // 鼠标滚轮缩放
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
      if (newZoom === zoom) return;
      const scaleFactor = newZoom / zoom;
      const newPanOffset = {
        x: mouseX - (mouseX - panOffset.x) * scaleFactor,
        y: mouseY - (mouseY - panOffset.y) * scaleFactor,
      };
      setZoom(newZoom);
      setPanOffset(newPanOffset);
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, panOffset, setZoom, setPanOffset]);
  
  // 监听空格键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
        // 释放 pointer capture
        if (panPointerIdRef.current !== null && containerRef.current) {
          try {
            containerRef.current.releasePointerCapture(panPointerIdRef.current);
          } catch {}
          panPointerIdRef.current = null;
          panButtonRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // 屏幕转画布坐标
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (screenX - rect.left - panOffset.x) / zoom;
    const y = (screenY - rect.top - panOffset.y) / zoom;
    return { x, y };
  }, [panOffset, zoom]);
  
  // 节点点击处理
  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    // 拖拽后忽略点击
    if (dragDropService.IsDragging) return;
    
    if (e.ctrlKey || e.metaKey) {
      toggleNodeSelection(nodeId);
    } else {
      setSelectedNodeId(nodeId);
    }
  }, [dragDropService, toggleNodeSelection, setSelectedNodeId]);
  
  // 节点拖拽开始
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 标记鼠标按下
    dragDropService.SetMouseDown(true);
    
    // 如果节点未选中，先选中它
    if (!isNodeSelected(nodeId)) {
      setSelectedNodeId(nodeId);
    }
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    
    // 获取选中的节点
    const currentSelectedIds = Array.from(selectedNodeIds);
    const idsToDrag = currentSelectedIds.length > 0 ? currentSelectedIds : [nodeId];
    
    // 开始拖拽
    dragDropService.BeginDrag(idsToDrag, canvasPos.x, canvasPos.y);
    setDropPreview(null);
  }, [screenToCanvas, isNodeSelected, setSelectedNodeId, selectedNodeIds, dragDropService]);
  
  // 空白区域开始框选
  const handleSelectionStart = useCallback((e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    
    // 检查是否点击在节点上
    const clickedNode = layoutResult.nodes.find(node => 
      canvasPos.x >= node.x && canvasPos.x <= node.x + (node.width ?? 200) &&
      canvasPos.y >= node.y && canvasPos.y <= node.y + (node.height ?? 60)
    );
    
    if (!clickedNode) {
      if (!e.ctrlKey && !e.metaKey) {
        clearAllSelection();
      }
      setSelectionBox({
        startX: canvasPos.x,
        startY: canvasPos.y,
        endX: canvasPos.x,
        endY: canvasPos.y,
      });
    }
  }, [screenToCanvas, layoutResult.nodes, clearAllSelection]);
  
  // 处理框选移动
  const handleSelectionMoveInternal = useCallback((e: { clientX: number; clientY: number; buttons: number }) => {
    const isLeftButtonDown = (e.buttons & 1) === 1;
    
    // 如果左键已经释放，但拖拽状态还存在，立即清理
    if (!isLeftButtonDown && dragStartPosRef.current) {
      dragDropService.SetMouseDown(false);
      dragDropService.CancelDrag();
      dragStartPosRef.current = null;
      setDropPreview(null);
      return;
    }
    
    // 处理框选：框选也必须是左键按住状态
    if (selectionBox) {
      if (!isLeftButtonDown) {
        setSelectionBox(null);
        return;
      }
      
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      setSelectionBox(prev => prev ? { ...prev, endX: canvasPos.x, endY: canvasPos.y } : null);
    }
    
    // 处理节点拖拽：只有左键按住时才允许拖拽预览
    if (dragStartPosRef.current && isLeftButtonDown) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      
      const activated = dragDropService.UpdateDragPosition(canvasPos.x, canvasPos.y);
      
      if (activated && dragDropService.IsMouseDown) {
        dragDropService.CalculateDropPreview(
          canvasPos.x,
          canvasPos.y,
          document.root,
          layoutResult.nodes
        );
        setDropPreview(dragDropService.DropPreview);
      } else {
        setDropPreview(null);
      }
    }
  }, [selectionBox, screenToCanvas, dragDropService, document.root, layoutResult.nodes]);
  
  // 鼠标释放
  const handleSelectionEnd = useCallback((e: React.MouseEvent) => {
    // 处理框选结束
    if (selectionBox) {
      const box = normalizeBox(selectionBox);
      const selectedIds: string[] = [];
      
      for (const node of layoutResult.nodes) {
        if (
          node.x < box.endX &&
          node.x + (node.width ?? 200) > box.startX &&
          node.y < box.endY &&
          node.y + (node.height ?? 60) > box.startY
        ) {
          selectedIds.push(node.data.data.id);
        }
      }
      
      if (selectedIds.length > 0) {
        if (e.ctrlKey || e.metaKey) {
          const newSelection = [...new Set([...selectedNodeIds, ...selectedIds])];
          selectNodes(newSelection);
        } else {
          selectNodes(selectedIds);
        }
      }
      
      setSelectionBox(null);
    }
    
    // 处理拖拽结束
    const moves = dragDropService.EndDrag();
    if (moves && moves.length > 0) {
      console.log(`[Canvas] 执行移动: ${moves.length} 个节点`);
      moveNodes(moves);
    }
    
    dragStartPosRef.current = null;
    setDropPreview(null);
  }, [selectionBox, layoutResult.nodes, selectedNodeIds, selectNodes, dragDropService, moveNodes]);
  
  // ==================== Pointer Events 修复右键 pan 卡顿 ====================
  
  // Pointer Down - 统一处理 pan 和框选
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 右键 (button === 2) 或 中键 (button === 1) 或 Space 键 - 启动 pan
    if (isSpacePressed || e.button === 1 || e.button === 2) {
      e.preventDefault();
      
      // 捕获指针，防止鼠标移出 canvas 后丢事件
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      panPointerIdRef.current = e.pointerId;
      panButtonRef.current = e.button;
      
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    } else if (e.button === 0) {
      // 左键 - 启动框选或节点拖拽
      handleSelectionStart(e as unknown as React.MouseEvent);
    }
  }, [isSpacePressed, panOffset, handleSelectionStart]);
  
  // Pointer Move - 统一处理 pan 和框选/拖拽
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 如果正在 pan 且是指向正确的指针
    if (isPanning && panPointerIdRef.current === e.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }
    
    // 处理框选/拖拽
    handleSelectionMoveInternal({
      clientX: e.clientX,
      clientY: e.clientY,
      buttons: e.buttons,
    });
  }, [isPanning, panStart, setPanOffset, handleSelectionMoveInternal]);
  
  // 结束 pan
  const endPan = useCallback((e: React.PointerEvent) => {
    if (panPointerIdRef.current === e.pointerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      
      panPointerIdRef.current = null;
      panButtonRef.current = null;
      setIsPanning(false);
    }
  }, []);
  
  // Pointer Up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // 标记鼠标释放
    dragDropService.SetMouseDown(false);
    
    if (isPanning) {
      endPan(e);
    } else {
      handleSelectionEnd(e as unknown as React.MouseEvent);
    }
  }, [isPanning, endPan, handleSelectionEnd, dragDropService]);
  
  // Pointer Cancel - 异常情况清理
  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (panPointerIdRef.current === e.pointerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      
      panPointerIdRef.current = null;
      panButtonRef.current = null;
      setIsPanning(false);
    }
    
    dragDropService.SetMouseDown(false);
    dragDropService.CancelDrag();
    dragStartPosRef.current = null;
    setDropPreview(null);
  }, [dragDropService]);
  
  // ==================== 保留旧的 mouse 事件用于节点内部 ====================
  
  // 鼠标离开 - 只有左键未按下时才处理
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const isLeftButtonDown = (e.buttons & 1) === 1;

    // 如果左键还按着，不要结束拖拽。等 window mouseup 统一处理。
    if (isLeftButtonDown) {
      return;
    }

    dragDropService.SetMouseDown(false);
    dragDropService.CancelDrag();
    dragStartPosRef.current = null;
    setDropPreview(null);
  }, [dragDropService]);
  
  // 全局鼠标释放处理 - 防止鼠标在 canvas 外释放导致状态残留
  useEffect(() => {
    const handleWindowMouseUp = (event: MouseEvent) => {
      const container = containerRef.current;
      if (container && container.contains(event.target as Node)) {
        return;
      }
      
      // 如果是 canvas 外释放，清理拖拽状态
      if (dragStartPosRef.current || dragDropService.IsDragging) {
        dragDropService.SetMouseDown(false);
        dragDropService.CancelDrag();
        dragStartPosRef.current = null;
        setDropPreview(null);
      }
      
      setIsPanning(false);
    };
    
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [dragDropService]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPanning || dragDropService.IsDragging) return;
      
      const selectedNodeIds = useMindmapStore.getState().getSelectedNodeIds();
      const selectedNodeId = selectedNodeIds[0];
      if (!selectedNodeId) return;
      
      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          onAddChild(selectedNodeId);
          break;
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            onAddSibling(selectedNodeId);
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onDeleteNode(selectedNodeId);
          break;
        case 'Escape':
          clearAllSelection();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanning, dragDropService, onAddChild, onAddSibling, onDeleteNode, clearAllSelection]);
  
  // 规范化选择框
  const normalizeBox = (box: { startX: number; startY: number; endX: number; endY: number }) => ({
    startX: Math.min(box.startX, box.endX),
    startY: Math.min(box.startY, box.endY),
    endX: Math.max(box.startX, box.endX),
    endY: Math.max(box.startY, box.endY),
  });
  
  // 渲染连接线
  const renderLinks = () => {
    const links: JSX.Element[] = [];
    
    layoutResult.nodes.forEach((node: TreeLayoutNode) => {
      if (node.parent) {
        const parentNode = layoutResult.nodes.find(
          n => n.data.data.id === node.parent!.data.data.id
        );
        if (parentNode) {
          const path = getLinkPath(parentNode, node, layoutConfig.direction, layoutConfig);
          links.push(
            <path
              key={`link-${node.data.data.id}`}
              d={path}
              fill="none"
              stroke={currentTheme.lineColor}
              strokeWidth={2}
            />
          );
        }
      }
    });
    
    return links;
  };
  
  // 渲染选择框
  const renderSelectionBox = () => {
    if (!selectionBox) return null;
    
    const box = normalizeBox(selectionBox);
    return (
      <div
        style={{
          position: 'absolute',
          left: box.startX,
          top: box.startY,
          width: box.endX - box.startX,
          height: box.endY - box.startY,
          border: '2px dashed #4a90d9',
          backgroundColor: 'rgba(74, 144, 217, 0.2)',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    );
  };
  
  // 渲染放置预览
  const renderDropPreview = () => {
    if (
      !dragDropService.IsMouseDown ||
      !dragDropService.IsDragging ||
      !dropPreview ||
      !dropPreview.isValid
    ) {
      return null;
    }
    
    const targetLayout = layoutResult.nodes.find(
      n => n.data.data.id === dropPreview.targetNodeId
    );
    if (!targetLayout) return null;
    
    const nodeWidth = targetLayout.width ?? 200;
    const nodeHeight = targetLayout.height ?? 60;
    
    if (dropPreview.mode === DropMode.AsChild) {
      return (
        <>
          <div
            style={{
              position: 'absolute',
              left: targetLayout.x - 4,
              top: targetLayout.y - 4,
              width: nodeWidth + 8,
              height: nodeHeight + 8,
              border: '3px solid #4a90d9',
              borderRadius: 8,
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: targetLayout.x - 40,
              top: targetLayout.y + (nodeHeight - 28) / 2,
              width: 28,
              height: 28,
              backgroundColor: '#4a90d9',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            +
          </div>
        </>
      );
    } else if (dropPreview.mode === DropMode.AsSibling) {
      const isBefore = dropPreview.insertPosition === InsertPosition.Before;
      const arrowSymbol = isBefore ? '↑' : '↓';
      
      return (
        <>
          <div
            style={{
              position: 'absolute',
              left: targetLayout.x - 4,
              top: targetLayout.y - 4,
              width: nodeWidth + 8,
              height: nodeHeight + 8,
              border: '3px solid #4a90d9',
              borderRadius: 8,
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: targetLayout.x - 40,
              top: targetLayout.y + (nodeHeight - 28) / 2,
              width: 28,
              height: 28,
              backgroundColor: '#4a90d9',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {arrowSymbol}
          </div>
        </>
      );
    } else {
      return null;
    }
  };
  
  // 变换样式
  const transformStyle = {
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
  };
  
  // 光标样式
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (isSpacePressed) return 'grab';
    if (dragDropService.IsDragging) return 'move';
    return 'default';
  };
  
  // 是否有节点正在被拖拽
  const isDraggingNode = dragDropService.IsDragging && dragStartPosRef.current !== null;
  
  // 阻止右键默认菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);
  
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: getCursorStyle(),
        backgroundColor: '#f5f5f5',
        backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        position: 'relative',
        // 关键：防止浏览器手势干扰 pointer 事件
        touchAction: 'none',
        // pan 时禁止选择
        userSelect: isPanning ? 'none' : undefined,
      }}
      // 使用 Pointer Events 替代 Mouse Events（修复右键 pan 卡顿）
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      {/* SVG 层 - 连接线 */}
      <svg
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <g style={transformStyle}>
          {renderLinks()}
        </g>
      </svg>
      
      {/* 选择框和放置预览 */}
      <div style={transformStyle}>
        {renderSelectionBox()}
        {renderDropPreview()}
      </div>
      
      {/* 节点层 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <div style={{ ...transformStyle, pointerEvents: 'auto', position: 'relative' }}>
          {layoutResult.nodes.map((node: TreeLayoutNode) => (
            <div
              key={node.data.data.id}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
              }}
            >
              <MindmapNodeComponent
                node={node}
                theme={currentTheme}
                onToggleExpand={onToggleExpand}
                onUpdateContent={handleUpdateContent}
                isSelected={isNodeSelected(node.data.data.id)}
                isDragging={isDraggingNode && isNodeSelected(node.data.data.id)}
                onNodeClick={handleNodeClick}
                onNodeDragStart={handleNodeDragStart}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
