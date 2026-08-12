// src/Components/modals/PublishPostModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

export default function PublishPostModal({
  isOpen,
  imgUrl,
  postText,
  setPostText,
  onClose,
  onSubmit,
  isAnonymous,      // ✅ 新增
  setIsAnonymous,   // ✅ 新增
}) {
  const { t } = useI18n();
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurLevel, setBlurLevel] = useState(8);
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 11000,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--space-xl)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1c1c1c',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 'var(--container-sm)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          wordBreak: 'break-all',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            color: '#fff',
            marginTop: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {t('publishModal.title')}
        </h3>

        <div
          style={{
            background: 'rgba(255, 152, 0, 0.06)',
            border: '1px solid rgba(255, 152, 0, 0.15)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <p
            style={{
              color: '#ffcc80',
              fontSize: '12px',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            {t('publishModal.hint')}
          </p>
        </div>

        {/* 图片预览 + 模糊控制 */}
        {imgUrl && (
          <div
            style={{
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid #333',
              marginBottom: '12px',
              position: 'relative',
            }}
          >
            <img
              src={imgUrl}
              style={{
                width: '100%',
                display: 'block',
                filter: blurEnabled ? `blur(${blurLevel}px)` : 'none',
                transition: 'filter 0.3s ease',
              }}
              alt="preview"
            />
            {blurEnabled && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  color: '#ff9800',
                  fontSize: '10px',
                }}
              >
                🔒 {t('sharePreview.blurred')}
              </div>
            )}
          </div>
        )}

        {/* ✅ 模糊控制栏 */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: blurEnabled ? '10px' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: 'var(--text-md)' }}>
                {blurEnabled ? '🔒' : '🔓'}
              </span>
              <span style={{ color: '#aaa', fontSize: '12px' }}>
                {t('sharePreview.blurArtwork')}
              </span>
            </div>
            {/* 模糊控制栏 - 按钮样式优化 */}
            <button
              onClick={() => setBlurEnabled(!blurEnabled)}
              style={{
                width: '50px',      // ✅ 从 44px 改为 36px
                minHeight: '20px',        // ✅ 必须同步改
                maxHeight: '20px',        // ✅ 防止被撑大
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: blurEnabled ? '#ff9800' : '#444',
                cursor: 'pointer',
                position: 'relative',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '16px',    // ✅ 从 20px 改为 16px
                  height: '16px',   // ✅ 从 20px 改为 16px
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: blurEnabled ? '18px' : '2px',  // ✅ 调整位置
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </div>
          {blurEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#555', fontSize: '10px' }}>
                {t('sharePreview.blurLight')}
              </span>
              <input
                type="range"
                min="2"
                max="20"
                value={blurLevel}
                onChange={(e) => setBlurLevel(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: '3px',
                  accentColor: '#ff9800',
                  cursor: 'pointer',
                }}
              />
              <span style={{ color: '#555', fontSize: '10px' }}>
                {t('sharePreview.blurStrong')}
              </span>
            </div>
          )}
          {blurEnabled && (
            <p
              style={{
                color: '#666',
                fontSize: '10px',
                margin: '8px 0 0 0',
                textAlign: 'center',
                lineHeight: '1.4',
              }}
            >
              {t('sharePreview.blurHint')}
            </p>
          )}
        </div>

        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder={t('publishModal.placeholder')}
          style={{
            width: '100%',
            height: '90px',
            background: '#111',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-md)',
            boxSizing: 'border-box',
            marginBottom: '20px',
            fontSize: '13px',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* 匿名选项 */}
        {setIsAnonymous && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#888', fontSize: '12px' }}>
              {t('publishModal.anonymous') || '匿名发布'}
            </span>
          </div>
        )}

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: '#2a2a2a',
              color: '#999',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: 'bold',
            }}
            onClick={onClose}
          >
            {t('publishModal.cancel')}
          </button>
          <button
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: 'linear-gradient(135deg, #ff9800, #f44336)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(244, 67, 54, 0.3)',
            }}
            onClick={() => {
              // ✅ 提交时传递模糊信息
              const submitData = {
                text: postText,
                blurEnabled,
                blurLevel: blurEnabled ? blurLevel : 0,
              };
              onSubmit(submitData);
            }}
          >
            {t('publishModal.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}