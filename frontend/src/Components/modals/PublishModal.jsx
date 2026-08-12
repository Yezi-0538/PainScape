// src/components/modals/PublishModal.jsx
import React from 'react';

export default function PublishModal({
  isOpen,
  imgUrl,
  postText,
  onTextChange,
  onPublish,
  onCancel,
  isLoading,
  t,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 500,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--space-xl)',
        boxSizing: 'border-box',
      }}
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

        {imgUrl && (
          <div
            style={{
              marginBottom: '15px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid #333',
            }}
          >
            <img
              src={imgUrl}
              style={{ width: '100%', display: 'block' }}
              alt="preview"
            />
          </div>
        )}

        <textarea
          value={postText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t('publishModal.placeholder')}
          style={{
            width: '100%',
            height: '100px',
            background: '#111',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            boxSizing: 'border-box',
            marginBottom: '20px',
            fontSize: 'var(--text-base)',
            lineHeight: '1.5',
            resize: 'none',
            outline: 'none',
          }}
          disabled={isLoading}
        />

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
            onClick={onCancel}
            disabled={isLoading}
          >
            {t('publishModal.cancel')}
          </button>
          <button
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              background: isLoading
                ? '#555'
                : 'linear-gradient(135deg, #ff9800, #f44336)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: 'bold',
              boxShadow: isLoading
                ? 'none'
                : '0 4px 15px rgba(244, 67, 54, 0.3)',
            }}
            onClick={onPublish}
            disabled={isLoading}
          >
            {isLoading ? t('app.loading') : t('publishModal.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}