// src/Components/modals/SharePreviewModal.jsx
import React, { useState } from 'react';

export default function SharePreviewModal({
  isOpen,
  shareContent,
  imgUrl,
  pgFrontRef,
  isSideEmpty,
  getContextTitle,
  onConfirm,
  onCancel,
  t,
}) {
  if (!isOpen || !shareContent) return null;

  // 🌟 1. 精准判断语言模式：支持中文模式显示中文、英文模式显示英文
  const isEn = t('history.sun') === 'Sun';

  // 🌟 2. 核心新增：分享接收对象选择器（对应需求 5：伴侣、家人与朋友）
  const [selectedRecipient, setSelectedRecipient] = useState(shareContent.identity || 'partner');

  const safeSlice = (text, len = 90) => {
    if (!text) return '';
    const str = typeof text === 'object' ? JSON.stringify(text) : String(text);
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  // 🌟 3. 动态多语言与不同对象文本生成
  const getPreviewText = () => {
    const analogyText = shareContent.analogy || shareContent.chief_complaint || (isEn ? 'Somatic Pain Map Record' : '痛觉图谱记录');
    const actionText = shareContent.action || (isEn ? '• Warm your palms and place on lower belly\n• Prepare a heat pad' : '• 搓热手掌贴敷下腹\n• 准备温热水袋');
    const workText = shareContent.workText || (isEn ? 'Requesting sick leave today due to dysmenorrhea.' : '因突发经期痛经，今天申请请假休息。');

    switch (selectedRecipient) {
      case 'partner':
        return {
          title: isEn ? 'Somatic Companion Guide (For Partner)' : '经期陪伴指南 (致伴侣)',
          content: `${isEn ? 'She is experiencing: ' : '她正在经历：'}${shareContent.pain || (isEn ? 'Dysmenorrhea' : '痛经')}\n${safeSlice(analogyText)}\n\n${isEn ? 'Care Suggestions:' : '关怀指南：'}\n${safeSlice(actionText)}`,
        };
      case 'family':
        return {
          title: isEn ? 'Family Care Notice (For Family)' : '家庭关怀告知单 (致家人)',
          content: `${isEn ? 'Current Status: ' : '身体状况：'}${shareContent.pain || (isEn ? 'Dysmenorrhea' : '痛经')}\n${safeSlice(analogyText)}\n\n${isEn ? 'Care Actions:' : '行动支持：'}\n${safeSlice(actionText)}`,
        };
      case 'friend':
        return {
          title: isEn ? 'Somatic Status Explanation (For Friend)' : '体感情况说明 (致朋友)',
          content: safeSlice(workText || (isEn ? 'Sorry, experiencing period pain today and need to rest.' : '抱歉，今日经期痉挛疼痛，需要在家休息。')),
        };
      case 'work':
        return {
          title: isEn ? 'Somatic Leave Statement (For Manager)' : '体感请假说明 (致领导)',
          content: safeSlice(workText),
        };
      default:
        return {
          title: isEn ? 'Somatic Pain Statement' : '体感痛觉声明',
          content: safeSlice(analogyText),
        };
    }
  };

  const previewText = getPreviewText();
  const previewImg = shareContent.historyImg || imgUrl;

  const handleConfirmShare = () => {
    if (onConfirm) {
      onConfirm({
        ...shareContent,
        identity: selectedRecipient,
        previewTitle: previewText.title,
        previewContent: previewText.content,
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 11500,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#141414',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid #333',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            color: '#fff',
            margin: '0 0 12px 0',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          📋 {t('sharePreview.title') || (isEn ? 'Share Card Preview' : '分享海报预审')}
        </h3>

        <p
          style={{
            color: '#888',
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          {isEn ? '💡 Choose recipient and confirm layout before generating poster' : '💡 请选择分享对象并确认海报排版，确认后生成高清海报'}
        </p>

        {/* 🌟 4. 分享对象选择器 (伴侣 🫂 / 家人 🏠 / 朋友 👥) */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: '#888', fontSize: '11.5px', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
            {isEn ? 'Select Recipient:' : '选择分享对象：'}
          </span>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {[
              { key: 'partner', label: isEn ? 'Partner 🫂' : '伴侣 🫂' },
              { key: 'family', label: isEn ? 'Family 🏠' : '家人 🏠' },
              { key: 'friend', label: isEn ? 'Friend 👥' : '朋友 👥' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedRecipient(item.key)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: selectedRecipient === item.key ? 'bold' : 'normal',
                  background: selectedRecipient === item.key ? '#d32f2f' : 'rgba(255,255,255,0.04)',
                  color: selectedRecipient === item.key ? '#fff' : '#888',
                  border: selectedRecipient === item.key ? 'none' : '1px solid #333',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 绘制图片预览 */}
        <div
          style={{
            background: '#0a0a0a',
            borderRadius: '16px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            border: '1px solid #222',
          }}
        >
          <img
            src={previewImg}
            style={{
              width: '100%',
              maxWidth: '320px',
              maxHeight: '220px',
              objectFit: 'contain',
              borderRadius: '12px',
            }}
            alt="preview"
          />
        </div>

        {/* 动态语言与对象文本预览 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: `4px solid ${
              selectedRecipient === 'partner' ? '#ef5350' :
              selectedRecipient === 'family' ? '#ff9800' : '#2196f3'
            }`,
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0 0 8px 0',
            }}
          >
            {previewText.title}
          </p>
          <p style={{ color: '#ccc', fontSize: '12.5px', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-line' }}>
            {previewText.content}
          </p>
        </div>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              background: '#222',
              border: '1px solid #333',
              color: '#888',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            onClick={onCancel}
          >
            {t('sharePreview.cancel') || (isEn ? 'Cancel' : '取消')}
          </button>
          <button
            style={{
              flex: 1.5,
              padding: '12px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
            }}
            onClick={handleConfirmShare}
          >
            ✨ {t('sharePreview.confirm') || (isEn ? 'Generate Poster' : '确认生成海报')}
          </button>
        </div>
      </div>
    </div>
  );
}