// src/Components/OnboardingGuide.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';

const GUIDES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    titleKey: 'guide.paintTitle',
    descKey: 'guide.paintDesc',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    titleKey: 'guide.editTitle',
    descKey: 'guide.editDesc',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
    titleKey: 'guide.privacyTitle',
    descKey: 'guide.privacyDesc',
  },
];

export default function OnboardingGuide({ onClose }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  // 3 秒自动切换
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < GUIDES.length - 1) {
        setStep(step + 1);
      } else {
        handleClose();
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [step]);

  const handleClose = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        zIndex: 250,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: fading ? 'translateY(100%)' : 'translateY(0)',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* 关闭按钮 */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0 20px 6px 0',
      }}>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(20,20,20,0.9)',
            border: '1px solid #333',
            color: '#666',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
          }}
        >
          ✕
        </button>
      </div>

      {/* 卡片 */}
      <div
        style={{
          background: 'rgba(18,18,18,0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid #222',
          borderRadius: '20px 20px 0 0',
          padding: '20px 24px calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        {/* 图标 + 标题行 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
        }}>
          <span style={{ color: '#4caf50', display: 'flex' }}>
            {GUIDES[step].icon}
          </span>
          <span style={{
            color: '#e0e0e0',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            {t(GUIDES[step].titleKey)}
          </span>
        </div>

        {/* 描述 */}
        <p style={{
          color: '#888',
          fontSize: '12px',
          lineHeight: '1.6',
          margin: '0 0 16px 0',
          paddingLeft: '30px',
        }}>
          {t(GUIDES[step].descKey)}
        </p>

        {/* 进度点 + 手动切换 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '30px',
        }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {GUIDES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '16px' : '5px',
                  height: '5px',
                  borderRadius: '3px',
                  background: i === step ? '#4caf50' : '#333',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#555',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                {t('guide.prev')}
              </button>
            )}
            <button
              onClick={() => {
                if (step < GUIDES.length - 1) {
                  setStep(step + 1);
                } else {
                  handleClose();
                }
              }}
              style={{
                background: 'rgba(76,175,80,0.15)',
                border: 'none',
                color: '#4caf50',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: '12px',
              }}
            >
              {step < GUIDES.length - 1 ? t('guide.next') : t('guide.gotIt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}