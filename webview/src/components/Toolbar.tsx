import React, { useCallback } from 'react';
import { LayoutDirection, themes } from '../types';
import { useMindmapStore } from '../store/mindmapStore';

interface ToolbarProps {
  onSave: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  isDirty?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onExportSvg,
  onExportJson,
  isDirty = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const {
    layoutDirection,
    setLayoutDirection,
    currentTheme,
    setTheme,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    searchQuery,
    setSearchQuery,
  } = useMindmapStore();
  
  const handleLayoutChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLayoutDirection(e.target.value as LayoutDirection);
  }, [setLayoutDirection]);
  
  const handleThemeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  }, [setTheme]);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* 标题 */}
      <div style={{ fontWeight: 'bold', fontSize: 14, marginRight: 10 }}>
        LaTeX Mindmap {isDirty && <span style={{ color: '#e6a23c' }}>●</span>}
      </div>
      
      <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />
      
      {/* 撤销/重做 */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="撤销 (Ctrl+Z)"
        style={{
          padding: '6px 12px',
          backgroundColor: canUndo ? '#fff' : '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 4,
          cursor: canUndo ? 'pointer' : 'not-allowed',
          fontSize: 13,
          opacity: canUndo ? 1 : 0.5,
        }}
      >
        ↩
      </button>
      
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="重做 (Ctrl+Y)"
        style={{
          padding: '6px 12px',
          backgroundColor: canRedo ? '#fff' : '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 4,
          cursor: canRedo ? 'pointer' : 'not-allowed',
          fontSize: 13,
          opacity: canRedo ? 1 : 0.5,
        }}
      >
        ↪
      </button>
      
      <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />
      
      {/* 保存按钮 */}
      <button
        onClick={onSave}
        title="保存 (Ctrl+S)"
        style={{
          padding: '6px 12px',
          backgroundColor: isDirty ? '#67c23a' : '#909399',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        保存
      </button>
      
      {/* 导出按钮 */}
      <button
        onClick={onExportSvg}
        style={{
          padding: '6px 12px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        导出 SVG
      </button>
      
      <button
        onClick={onExportJson}
        style={{
          padding: '6px 12px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        导出 JSON
      </button>
      
      <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />
      
      {/* 布局方向 */}
      <select
        value={layoutDirection}
        onChange={handleLayoutChange}
        style={{
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 4,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <option value="right">向右展开</option>
        <option value="left">向左展开</option>
        <option value="top">向下展开</option>
      </select>
      
      {/* 主题选择 */}
      <select
        value={currentTheme.name}
        onChange={handleThemeChange}
        style={{
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 4,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {Object.entries(themes).map(([key, theme]) => (
          <option key={key} value={key}>{theme.name}</option>
        ))}
      </select>
      
      <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />
      
      {/* 缩放控制 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          onClick={zoomOut}
          style={{
            width: 28,
            height: 28,
            border: '1px solid #ddd',
            borderRadius: 4,
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          -
        </button>
        <span style={{ fontSize: 13, minWidth: 45, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          style={{
            width: 28,
            height: 28,
            border: '1px solid #ddd',
            borderRadius: 4,
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          +
        </button>
        <button
          onClick={resetZoom}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: 4,
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          重置
        </button>
      </div>
      
      <div style={{ width: 1, height: 24, backgroundColor: '#e0e0e0' }} />
      
      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索节点..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          padding: '6px 10px',
          border: '1px solid #ddd',
          borderRadius: 4,
          fontSize: 13,
          width: 150,
        }}
      />
      
      {/* 快捷键提示 */}
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888' }}>
        <span title="拖动画布">空格+拖动</span> | 
        <span title="添加子节点">Tab</span> | 
        <span title="添加兄弟节点">Enter</span> | 
        <span title="删除节点">Delete</span>
      </div>
    </div>
  );
};