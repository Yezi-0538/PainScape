// src/Components/OnboardingTooltip.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';

const STEP_GUIDES = {
  basicInfo: {
    tip: 'onboardGuide.basicTip',     // 一句话提示，不重复标题
  },
  medical: {
    tip: 'onboardGuide.medicalTip',
  },
  preference: {
    tip: 'onboardGuide.prefTip',
  },
};

export default function OnboardingTooltip({ step, onClose }) {
  const { t } = useI18n();
  const guide = STEP_GUIDES[step];
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [step, onClose]);

  if (!guide || !visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 130px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        pointerEvents: 'none',
        maxWidth: '300px',
        animation: 'bubbleFade 0.5s ease forwards',
      }}
    >
      <style>{`
        @keyframes bubbleFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes bubblePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>

      <div
        style={{
          background: 'rgba(22, 22, 22, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '20px',
          padding: '14px 20px 14px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          animation: 'bubblePulse 3s ease-in-out infinite',
        }}
      >
        {/* 小绿点指示器 */}
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#4caf50',
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(76,175,80,0.3)',
          }}
        />

        {/* 核心文案 - 只有一句话 */}
        <p
          style={{
            margin: 0,
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            lineHeight: '1.5',
            letterSpacing: '0.2px',
            fontWeight: '300',
          }}
        >
          {t(guide.tip)}
        </p>

        {/* 步骤点 */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {['basicInfo', 'medical', 'preference'].map(s => (
            <div
              key={s}
              style={{
                width: s === step ? '14px' : '4px',
                height: '4px',
                borderRadius: '4px',
                background: s === step 
                  ? 'rgba(76,175,80,0.5)' 
                  : 'rgba(255,255,255,0.08)',
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}