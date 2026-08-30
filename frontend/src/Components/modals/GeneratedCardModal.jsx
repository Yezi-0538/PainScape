// src/Components/modals/GeneratedCardModal.jsx
import React, { useState, useEffect } from 'react';

export default function GeneratedCardModal({
  generatedCardUrl,
  onClose,
  lang = 'zh',
}) {
  if (!generatedCardUrl) return null;

  const isEn = lang === 'en';
  const [copyTip, setCopyTip] = useState(''); // '' | 'success' | 'failed'
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动设备
    const ua = navigator.userAgent.toLowerCase();
    const mobileCheck = /android|iphone|ipad|ipod|mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua));
    setIsMobile(mobileCheck);
  }, []);

  // 1. 调用系统原生分享
  const handleSystemShare = async () => {
    try {
      const response = await fetch(generatedCardUrl);
      const blob = await response.blob();
      const file = new File([blob], `PainScape_${Date.now()}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'PainScape Somatic Card',
          text: isEn ? 'My Somatic Pain Map' : '我的体感痛觉图谱',
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: 'PainScape Somatic Card',
          url: window.location.href,
        });
      } else {
        handleCopyImage();
      }
    } catch (e) {
      console.warn('系统分享取消或受限:', e);
    }
  };

  // 2. 复制图片到剪贴板
  const handleCopyImage = async () => {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error('Clipboard API not supported');
      }
      const response = await fetch(generatedCardUrl);
      const blob = await response.blob();
      const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ]);

      setCopyTip('success');
      setTimeout(() => setCopyTip(''), 3000);
    } catch (err) {
      console.warn('复制到剪贴板受限:', err);
      setCopyTip('failed');
      setTimeout(() => setCopyTip(''), 3500);
    }
  };

  // 3. 一键下载图片
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedCardUrl;
    link.download = `PainScape_Card_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          maxHeight: '90vh',
          background: '#161616',
          border: '1px solid #333',
          borderRadius: '20px',
          padding: '20px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭叉 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: '#888',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* 标题 */}
        <h3
          style={{
            color: '#fff',
            textAlign: 'center',
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          {isEn ? 'Somatic Card Generated' : '✨ 体感卡片已生成'}
        </h3>

        {/* 🌟 优雅通用的提示条（彻底去掉微信字眼，区分移动端/电脑端） */}
        <div
          style={{
            background: 'rgba(255,152,0,0.08)',
            border: '1px solid rgba(255,152,0,0.2)',
            borderRadius: '8px',
            padding: '8px 10px',
            marginBottom: '12px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              color: '#ffb74d',
              fontSize: '11.5px',
              textAlign: 'center',
              margin: 0,
              lineHeight: '1.45',
            }}
          >
            {isMobile
              ? (isEn
                  ? '💡 Mobile: Long press the image to save or send directly'
                  : '💡 移动端：可「长按图片」直接发送给同伴或保存')
              : (isEn
                  ? '💡 Desktop: Right click image → "Copy image" to paste into chats'
                  : '💡 电脑端：可「右键图片 → 复制图像」直接粘贴发送')}
          </p>
        </div>

        {/* 卡片图片展示区（允许右键与长按原生操作） */}
        <div
          style={{
            width: '100%',
            maxHeight: '50vh',
            overflowY: 'auto',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: '#0a0a0a',
            marginBottom: '12px',
          }}
        >
          <img
            src={generatedCardUrl}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '12px',
              userSelect: 'auto',
              WebkitUserSelect: 'auto',
              WebkitTouchCallout: 'default', // 允许 iOS 原生长按
              pointerEvents: 'auto',
            }}
            alt="Somatic Card"
          />
        </div>

        {/* 复制成功 / 失败反馈 */}
        {copyTip === 'success' && (
          <div style={{ color: '#4caf50', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
            ✅ {isEn ? 'Image copied to clipboard!' : '图片已复制到剪贴板！'}
          </div>
        )}
        {copyTip === 'failed' && (
          <div style={{ color: '#ef5350', fontSize: '11px', marginBottom: '8px' }}>
            ⚠️ {isEn ? 'Please right-click or long-press image to copy.' : '请直接在上方图片点击右键「复制图像」'}
          </div>
        )}

        {/* 操作按钮组 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
          {/* 系统分享按钮（已去除微信字样） */}
          <button
            onClick={handleSystemShare}
            style={{
              padding: '10px 0',
              background: 'linear-gradient(135deg, #2e7d32, #1b5e20)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(46, 125, 50, 0.25)',
            }}
          >
            📤 {isEn ? 'System Share' : '系统分享'}
          </button>

          {/* 复制图片按钮 */}
          <button
            onClick={handleCopyImage}
            style={{
              padding: '10px 0',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#eee',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            📋 {isEn ? 'Copy Image' : '复制图片'}
          </button>
        </div>

        {/* 本地下载原图链接 */}
        <button
          onClick={handleDownload}
          style={{
            marginTop: '8px',
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '11.5px',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          💾 {isEn ? 'Download Image File' : '下载高清原图到本地'}
        </button>
      </div>
    </div>
  );
}