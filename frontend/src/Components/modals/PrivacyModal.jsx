// src/Components/modals/PrivacyModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext'; 

const PrivacyModal = ({ onAgree, onDisagree }) => {
  const { t } = useI18n();
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '24px',
          padding: '32px 28px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
      >
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔒</div>
          <h2 style={{ color: '#fff', fontSize: '20px', margin: 0, fontWeight: '600' }}>
            {t('privacy.title')}
          </h2>
          <p style={{ color: '#888', fontSize: '13px', margin: '8px 0 0 0', lineHeight: '1.5' }}>
            {t('privacy.subtitle')}
          </p>
        </div>

        {/* 承诺清单 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '14px',
            padding: '16px 18px',
            marginBottom: '18px',
            border: '1px solid #2a2a2a',
          }}
        >
          <p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 10px 0', fontWeight: '600' }}>
            {t('privacy.promise')}
          </p>
          {t('privacy.promiseItems', { returnObjects: true }).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
              <span style={{ color: '#4caf50', fontSize: '14px' }}>✓</span>
              <span style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.4' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* 阅读完整政策 */}
        <button
          onClick={() => setShowFullPolicy(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64b5f6',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px 0',
            width: '100%',
            textAlign: 'center',
            textDecoration: 'underline',
            marginBottom: '18px',
          }}
        >
          {t('privacy.readMore')}
        </button>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onDisagree}
            style={{
              flex: 1,
              padding: '14px',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: '14px',
              color: '#888',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#aaa'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
          >
            {t('privacy.disagree')}
          </button>
          <button
            onClick={onAgree}
            style={{
              flex: 1,
              padding: '14px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '14px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(76,175,80,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#43a047'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#4caf50'; }}
          >
            {t('privacy.agree')}
          </button>
        </div>

        {/* 完整隐私政策（弹出层） */}
        {showFullPolicy && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#1a1a1a',
              borderRadius: '24px',
              padding: '28px 24px',
              boxSizing: 'border-box',
              zIndex: 10,
              overflowY: 'auto',
              border: '1px solid #333',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontSize: '17px', margin: 0 }}>
                {t('privacy.policyContentTitle')}
              </h3>
              <button
                onClick={() => setShowFullPolicy(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                color: '#bbb',
                fontSize: '14px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
              }}
            >
              {t('privacy.policyContent')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyModal;