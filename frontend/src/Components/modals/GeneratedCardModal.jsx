// src/Components/modals/GeneratedCardModal.jsx
import React from 'react';

export default function GeneratedCardModal({
  generatedCardUrl,
  onClose,
  lang = 'zh',
}) {
  if (!generatedCardUrl) return null;

  const isEn = lang === 'en';

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        const response = await fetch(generatedCardUrl);
        const blob = await response.blob();
        const file = new File([blob], 'painscape_share.jpg', {
          type: 'image/jpeg',
        });
        await navigator.share({
          title: 'PainScape Somatic Card',
          files: [file],
        });
      } catch (e) {
        console.warn('系统分享中断:', e);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 12000,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            color: '#fff',
            textAlign: 'center',
            margin: 0,
            fontSize: 'var(--text-md)',
            fontWeight: 'bold',
          }}
        >
          {isEn ? 'Somatic Card Generated' : '已成功生成体感卡片'}
        </h3>
        <p
          style={{
            color: '#aaa',
            fontSize: '12px',
            textAlign: 'center',
            margin: 0,
          }}
        >
          {isEn
            ? '💡 Long-press the card below to save or send to friends'
            : '💡 长按下方卡片即可 保存图片 或 直接发送给伴侣/朋友'}
        </p>
        <img
          src={generatedCardUrl}
          style={{
            width: '100%',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid #333',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            display: 'block',
          }}
          alt="Generated Card"
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          {navigator.share && (
            <button
              onClick={handleSystemShare}
              style={{
                flex: 1,
                padding: 'var(--space-md)',
                background: '#4caf50',
                border: 'none',
                borderRadius: '25px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {isEn ? 'System Share' : '调用系统分享'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: '#333',
              border: 'none',
              borderRadius: '25px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {isEn ? 'Close' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}