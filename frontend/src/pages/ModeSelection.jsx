// src/pages/ModeSelection.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/i18nContext';

export default function ModeSelectionPage({
  targetLanguage,
  onLanguageSwitch,
  onSelectMode,
}) {
  const { t } = useI18n();
  const [selectedTempMode, setSelectedTempMode] = useState('medical');

  const isMedical = selectedTempMode === 'medical';
  const activeColor = isMedical ? 'rgb(211, 47, 47)' : 'rgb(76, 175, 80)';
  const activeShadow = isMedical ? 'rgba(211, 47, 47, 0.25)' : 'rgba(76, 175, 80, 0.25)';

  return (
    <div
      style={{
        pointerEvents: 'auto',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#121212',
          border: '1px solid #222',
          borderRadius: '28px',
          padding: '36px 32px',
          boxSizing: 'border-box',
          boxShadow: '0 12px 45px rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Language switch */}
        <div style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>
          <button
            onClick={onLanguageSwitch}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#999',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {targetLanguage === 'zh' ? 'English' : '简体中文'}
          </button>
        </div>

        <h2
          style={{
            color: '#fff',
            marginBottom: '28px',
            fontSize: '22px',
            fontWeight: '600',
            letterSpacing: '1px',
            textAlign: 'center',
          }}
        >
          {t('modeSelection.title')}
        </h2>

        {/* Mode toggle */}
        <div
          style={{
            display: 'flex',
            background: '#1a1a1a',
            borderRadius: '30px',
            padding: '5px',
            width: '100%',
            marginBottom: '28px',
            boxSizing: 'border-box',
            position: 'relative',
            border: '1px solid #2a2a2a',
          }}
        >
          <button
            onClick={() => setSelectedTempMode('medical')}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: '25px',
              background: isMedical ? 'rgb(211, 47, 47)' : 'transparent',
              color: isMedical ? '#fff' : '#888',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 2,
              boxShadow: isMedical ? '0 3px 12px rgba(211, 47, 47, 0.4)' : 'none',
            }}
          >
            {t('modeSelection.medicalTab')}
          </button>
          <button
            onClick={() => setSelectedTempMode('general')}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: '25px',
              background: !isMedical ? 'rgb(76, 175, 80)' : 'transparent',
              color: !isMedical ? '#fff' : '#888',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 2,
              boxShadow: !isMedical ? '0 3px 12px rgba(76, 175, 80, 0.4)' : 'none',
            }}
          >
            {t('modeSelection.generalTab')}
          </button>
        </div>

        {/* Feature cards */}
        <div
          style={{
            width: '100%',
            background: '#161616',
            border: `1.5px solid ${activeColor}`,
            borderRadius: '20px',
            padding: '28px 24px',
            boxSizing: 'border-box',
            boxShadow: `0 0 25px ${activeShadow}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '24px',
            minHeight: '148px',
          }}
        >
          {(isMedical
            ? t('modeSelection.medicalFeatures', { returnObjects: true })
            : t('modeSelection.generalFeatures', { returnObjects: true })
          ).map((featureText, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ color: activeColor, fontSize: '18px', fontWeight: 'bold' }}>✓</span>
              <span style={{ color: '#eee', fontSize: '15px', lineHeight: '1.5' }}>{featureText}</span>
            </div>
          ))}
        </div>

        {/* Common features */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '36px',
            padding: '0 8px',
          }}
        >
          {t('modeSelection.commonFeatures', { returnObjects: true }).map((commonText, idx) => (
            <span
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '13px',
                color: '#888',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              {commonText}
            </span>
          ))}
        </div>

        {/* ✅ Confirm button - 修复：调用 onSelectMode */}
        <button
          onClick={() => onSelectMode(selectedTempMode)}
          style={{
            width: '100%',
            padding: '16px 0',
            background: activeColor,
            color: '#fff',
            border: 'none',
            borderRadius: '30px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.25s',
            boxShadow: `0 4px 20px ${activeShadow}`,
            letterSpacing: '1px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {t('modeSelection.confirmBtn')}
        </button>
      </div>
    </div>
  );
}