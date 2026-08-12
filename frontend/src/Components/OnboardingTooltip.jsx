// src/Components/OnboardingTooltip.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';

const STEP_GUIDES = {
  basicInfo: {
    icon: '📋',
    titleKey: 'onboardGuide.basicTitle',
    tip: 'onboardGuide.basicTip',
  },
  medical: {
    icon: '🩺',
    titleKey: 'onboardGuide.medicalTitle',
    tip: 'onboardGuide.medicalTip',
  },
  preference: {
    icon: '🎯',
    titleKey: 'onboardGuide.prefTitle',
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
        width: '100%',
        maxWidth: 'var(--container-sm)',
        margin: '0 auto 12px auto',
        padding: '10px 14px',
        background: 'rgba(76,175,80,0.06)',
        border: '1px solid rgba(76,175,80,0.10)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
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
      <p
        style={{
          margin: 0,
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          lineHeight: '1.5',
          fontWeight: '300',
          flex: 1,
        }}
      >
        {t(guide.tip)}
      </p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 'var(--text-base)',
          cursor: 'pointer',
          padding: '2px 4px',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}