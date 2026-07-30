// src/components/modals/SharePreviewModal.jsx
import React from 'react';

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

  const getPreviewText = () => {
    const recipient = shareContent.leaveRecipient || 'manager';
    switch (shareContent.identity) {
      case 'partner':
        return {
          title: getContextTitle('partner'),
          content: shareContent.analogy?.slice(0, 80) + '...',
        };
      case 'work':
        return {
          title: getContextTitle('work', recipient),
          content: shareContent.workText?.slice(0, 80) + '...',
        };
      case 'doctor':
        return {
          title: getContextTitle('doctor'),
          content:
            (shareContent.med_complaint ||
              t('sharePreview.defaultDoctorContent'))?.slice(0, 80) + '...',
        };
      case 'self':
        return {
          title: getContextTitle('self'),
          content: shareContent.selfCare?.slice(0, 80) + '...',
        };
      default:
        return {
          title: getContextTitle(shareContent.identity),
          content: t('sharePreview.defaultContent', {
            pain: shareContent.pain || '',
          }),
        };
    }
  };

  const previewText = getPreviewText();

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 600,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: '#1c1c1c',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #444',
        }}
      >
        <h3
          style={{
            color: '#fff',
            margin: '0 0 15px 0',
            textAlign: 'center',
          }}
        >
          {t('sharePreview.title')}
        </h3>

        <p
          style={{
            color: '#888',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '15px',
          }}
        >
          {shareContent.historyImg
            ? t('sharePreview.archiveReview')
            : !pgFrontRef
            ? t('sharePreview.loading')
            : isSideEmpty('front') && isSideEmpty('back')
            ? t('sharePreview.noContent')
            : t('sharePreview.livePreview')}
        </p>

        <div
          style={{
            background: '#0a0a0a',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <img
            src={shareContent.historyImg || imgUrl}
            style={{
              width: '100%',
              maxWidth: '300px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
            alt="preview"
          />
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '15px',
            marginBottom: '20px',
          }}
        >
          <p
            style={{
              color: '#ff9800',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0 0 10px 0',
            }}
          >
            {previewText.title}
          </p>
          <p style={{ color: '#ccc', fontSize: '13px', margin: 0 }}>
            {previewText.content}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '25px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid #555',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onClick={onCancel}
          >
            {t('sharePreview.cancel')}
          </button>
          <button
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '25px',
              background: '#4caf50',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onClick={onConfirm}
          >
            {t('sharePreview.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}