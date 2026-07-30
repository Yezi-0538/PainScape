// src/components/CropModal.jsx
import React, { useState } from 'react';
import { cropImage } from '../utils/imageUtils';

const CropModal = ({
  isOpen,
  imageSrc,
  cropType,
  onConfirm,
  onCancel,
  lang = 'zh'
}) => {
  const [zoom, setZoom] = useState(1.5);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen || !imageSrc) return null;

  const isAvatar = cropType === 'avatar';

  const handleDragStart = (e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setDragStart({ x: clientX - pos.x, y: clientY - pos.y });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPos({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleConfirm = async () => {
    const result = await cropImage(imageSrc, cropType, zoom, pos);
    onConfirm(result);
  };

  const texts = {
    zh: {
      title: isAvatar ? '调整头像比例' : '调整背景构图',
      hint: '单指/鼠标拖动对齐，下方滑动调节焦距',
      zoom: '缩放',
      cancel: '取消重新选择',
      confirm: '应用此构图'
    },
    en: {
      title: isAvatar ? 'Adjust Avatar' : 'Adjust Background',
      hint: 'Drag to align, slide below to zoom',
      zoom: 'Zoom',
      cancel: 'Cancel',
      confirm: 'Apply'
    }
  };

  const t = texts[lang] || texts.zh;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(5, 5, 5, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px',
      boxSizing: 'border-box',
      userSelect: 'none',
      WebkitUserSelect: 'none'
    }}>
      <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '4px', fontWeight: 'bold' }}>
        ✂️ {t.title}
      </h3>
      <p style={{ color: '#666', fontSize: '11px', marginBottom: '24px' }}>
        {t.hint}
      </p>

      <div
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{
          width: '280px',
          height: '280px',
          background: '#000',
          border: '1px solid #222',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'move',
          touchAction: 'none'
        }}
      >
        <img
          src={imageSrc}
          alt="Source to crop"
          draggable={false}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            maxWidth: '100%',
            maxHeight: '100%',
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        />

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: isAvatar ? '180px' : '150px',
          height: isAvatar ? '180px' : '220px',
          border: '2px dashed #d32f2f',
          borderRadius: isAvatar ? '50%' : '12px',
          boxShadow: '0 0 0 9999px rgba(5, 5, 5, 0.72)',
          pointerEvents: 'none'
        }} />
      </div>

      <div style={{ width: '280px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#555', fontSize: '11px' }}>🔍 {t.zoom}</span>
        <input
          type="range"
          min="0.5"
          max="5.0"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{
            flex: 1,
            accentColor: '#d32f2f',
            height: '4px',
            cursor: 'pointer'
          }}
        />
        <span style={{ color: '#aaa', fontSize: '11px', minWidth: '24px' }}>
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', width: '280px', marginTop: '36px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '30px',
            color: '#888',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {t.cancel}
        </button>
        <button
          onClick={handleConfirm}
          style={{
            flex: 1,
            padding: '12px 0',
            background: '#d32f2f',
            border: 'none',
            borderRadius: '30px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)'
          }}
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
};

export default CropModal;