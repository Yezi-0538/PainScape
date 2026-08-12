// src/pages/SplashPage.jsx
import React from 'react';
import { useI18n } from '../i18n/i18nContext';

export default function SplashPage({
  splashOpacity,
  targetLanguage,
  onLanguageSwitch,
  quote,
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#050505',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box',
        opacity: splashOpacity,
        transition: 'opacity 1.5s ease-in-out',
      }}
    >
      {/* Language switch button */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100,
        }}
      >
        <button
          onClick={onLanguageSwitch}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#ccc',
            padding: '6px 14px',
            borderRadius: 'var(--radius-lg)',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {t('splash.switchLang')}
        </button>
      </div>

      <h1
        style={{
          color: '#fff',
          letterSpacing: '8px',
          marginBottom: '40px',
          fontSize: '2.5rem',
        }}
      >
        PainScape
      </h1>

      <p
        style={{
          color: '#aaa',
          fontSize: 'var(--text-base)',
          lineHeight: '1.8',
          textAlign: 'center',
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
        }}
      >
        {quote}
      </p>

      {/* 新增：定调文案 */}
      <p
        style={{
          color: '#666',
          fontSize: '12px',
          lineHeight: '1.6',
          textAlign: 'center',
          marginTop: '32px',
          opacity: 0.8,
        }}
      >
        {t('splash.tagline')}
      </p>
    </div>
  );
}