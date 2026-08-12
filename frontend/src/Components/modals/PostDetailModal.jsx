// src/components/modals/PostDetailModal.jsx
import React, { useState } from 'react';

export default function PostDetailModal({
  viewingPost,
  onClose,
  onLike,
  onHug,
  onDelete,
  onAddExperience,
  canDelete,
  t,
}) {
  const [showExpInput, setShowExpInput] = useState(false);
  const [expText, setExpText] = useState('');
  const [expTags, setExpTags] = useState('');

  if (!viewingPost) return null;

  const handleSaveExperience = () => {
    if (!expText.trim()) {
      alert(t('toast.saveExperienceRequired'));
      return;
    }
    const tagsArray = expTags ? expTags.split(/[,，]/).filter(tag => tag.trim()) : [];
    onAddExperience(viewingPost.id, expText, tagsArray);
    setShowExpInput(false);
    setExpText('');
    setExpTags('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 11000,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10,10,10,0.98)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: '24px',
          padding: 'var(--space-xl)',
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          marginBottom: '40px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              color: '#ef5350',
              fontWeight: 'bold',
              fontSize: 'var(--text-base)',
              letterSpacing: '0.5px',
            }}
          >
            {t('post.title')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* 图片 */}
        <div
          style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid #222',
            background: '#000',
            marginBottom: '16px',
          }}
        >
          <img
            src={viewingPost.img}
            style={{
              width: '100%',
              display: 'block',
              objectFit: 'contain',
            }}
            alt="Embodied Pain Map"
          />
        </div>

        {/* 描述 */}
        <div style={{ marginBottom: '18px' }}>
          <p
            style={{
              color: '#fff',
              fontSize: 'var(--text-md)',
              fontWeight: '600',
              lineHeight: '1.5',
              margin: '0 0 10px 0',
            }}
          >
            “ {viewingPost.text} ”
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                color: '#d32f2f',
                fontSize: '11px',
                background: 'rgba(211,47,47,0.1)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
              }}
            >
              {t(`painNames.${viewingPost.painTags?.[0] || 'twist'}`)}
            </span>
            <span style={{ color: '#666', fontSize: '11px' }}>
              ID: #{viewingPost.id ? String(viewingPost.id).slice(-6) : 'unknown'}
            </span>
          </div>
        </div>

        {/* AI 分析 */}
        <div
          style={{
            background: 'linear-gradient(145deg, #181818, #111111)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '14px',
            border: '1px solid rgba(255,255,255,0.03)',
            borderLeft: '4px solid #d32f2f',
          }}
        >
          <h4
            style={{
              color: '#ef5350',
              margin: '0 0 8px 0',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            {t('post.aiAnalysis')}
          </h4>
          <p
            style={{
              color: '#b0b0b0',
              fontSize: '12.5px',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            {viewingPost.analogy || t('post.aiDefault')}
          </p>
        </div>

        {/* 自愈经验 */}
        <div
          style={{
            background: 'linear-gradient(145deg, #181a18, #111311)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderLeft: '4px solid #4caf50',
            marginBottom: '20px',
          }}
        >
          <h4
            style={{
              color: '#4caf50',
              margin: '0 0 8px 0',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            {t('post.selfExperience')}
          </h4>

          {viewingPost.userExperience ? (
            <div>
              <p
                style={{
                  color: '#b0b0b0',
                  fontSize: '12.5px',
                  margin: '0 0 12px 0',
                  lineHeight: '1.6',
                }}
              >
                {viewingPost.userExperience}
              </p>
              {viewingPost.experienceTags &&
                viewingPost.experienceTags.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {viewingPost.experienceTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: 'rgba(76,175,80,0.12)',
                          color: '#4caf50',
                          padding: '3px 8px',
                          borderRadius: '10px',
                          fontSize: '10.5px',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  paddingTop: '10px',
                }}
              >
                <button
                  onClick={() => onLike(viewingPost.id)}
                  style={{
                    background: viewingPost.hasUserVotedHelpful
                      ? 'rgba(76,175,80,0.15)'
                      : 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    borderRadius: 'var(--radius-lg)',
                    color: '#4caf50',
                    padding: '6px 14px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  👍{' '}
                  {viewingPost.hasUserVotedHelpful
                    ? t('post.votedHelpful')
                    : t('post.markHelpful')}{' '}
                  · {viewingPost.helpfulVotes || 0}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p
                style={{
                  color: '#888',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  margin: '0 0 10px 0',
                }}
              >
                {t('post.noExperience')}
              </p>
              <button
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  border: '1px dashed #4caf50',
                  color: '#4caf50',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
                onClick={() => setShowExpInput(true)}
              >
                {t('post.addExperience')}
              </button>
            </div>
          )}
        </div>

        {/* 输入经验表单 */}
        {showExpInput && (
          <div
            style={{
              background: '#1c1c1c',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #333',
              marginBottom: '20px',
            }}
          >
            <textarea
              placeholder={t('post.experiencePlaceholder')}
              style={{
                width: '100%',
                background: '#111',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                minHeight: '80px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
              value={expText}
              onChange={(e) => setExpText(e.target.value)}
            />
            <input
              placeholder={t('post.tagsPlaceholder')}
              style={{
                width: '100%',
                background: '#111',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                marginTop: '8px',
                boxSizing: 'border-box',
              }}
              value={expTags}
              onChange={(e) => setExpTags(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#333',
                  color: '#aaa',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                onClick={() => setShowExpInput(false)}
              >
                {t('post.cancel')}
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '8px',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
                onClick={handleSaveExperience}
              >
                {t('post.publishExperience')}
              </button>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            borderTop: '1px solid #2a2a2a',
            paddingTop: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onHug(viewingPost.id)}
              style={{
                flex: 1.3,
                padding: 'var(--space-md)',
                borderRadius: '24px',
                border: viewingPost.hasUserHugged
                  ? '1px solid #ef5350'
                  : '1px solid #333',
                background: viewingPost.hasUserHugged
                  ? 'rgba(239,83,80,0.1)'
                  : 'rgba(255,255,255,0.02)',
                color: viewingPost.hasUserHugged ? '#ef5350' : '#888',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <span style={{ fontSize: 'var(--text-md)' }}>
                {viewingPost.hasUserHugged ? '❤️' : '🤍'}
              </span>
              <span>
                {viewingPost.hasUserHugged
                  ? t('post.hugged')
                  : t('post.giveHug')}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 6px',
                  borderRadius: '8px',
                }}
              >
                {viewingPost.hugs}
              </span>
            </button>

            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 'var(--space-md)',
                borderRadius: '24px',
                border: 'none',
                background: '#333',
                color: '#eee',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {t('diary.close')}
            </button>
          </div>

          {canDelete && (
            <button
              onClick={() => onDelete(viewingPost.id)}
              style={{
                width: '100%',
                padding: 'var(--space-md)',
                borderRadius: '24px',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                background: 'rgba(244, 67, 54, 0.05)',
                color: '#ef5350',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
            >
              <span>🗑️</span>
              <span>{t('post.delete')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}