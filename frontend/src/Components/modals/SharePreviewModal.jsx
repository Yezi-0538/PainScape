// src/Components/modals/SharePreviewModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

const CONTEXT_TYPES = [
  {
    key: 'partner',
    emoji: '🫂',
    color: '#ef5350',
  },
  {
    key: 'work',
    emoji: '💼',
    color: '#ff9800',
  },
  {
    key: 'medical',
    emoji: '🏥',
    color: '#2196f3',
  },
  {
    key: 'selfcare',
    emoji: '🌿',
    color: '#4caf50',
  },
];

export default function SharePreviewModal({
  isOpen,
  shareContent,
  imgUrl,
  onConfirm,
  onCancel,
}) {
  const { t } = useI18n();
  if (!isOpen || !shareContent) return null;
  console.log('🔍 shareContent:', shareContent);

  const isEn = t('history.sun') === 'Sun';

  const workSubScenes = [
    { key: 'manager', emoji: t('shareText.workSub.manager.emoji') },
    { key: 'teacher', emoji: t('shareText.workSub.teacher.emoji') },
    { key: 'friend', emoji: t('shareText.workSub.friend.emoji') },
    { key: 'client', emoji: t('shareText.workSub.client.emoji') },
  ];

  const [workSubScene, setWorkSubScene] = useState(shareContent.workScenario || 'manager');

  const [selectedContext, setSelectedContext] = useState(shareContent.identity || 'partner');
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurLevel, setBlurLevel] = useState(8);

  const safeSlice = (text, len = 150) => {
    if (!text) return '';
    const str = typeof text === 'object' ? JSON.stringify(text) : String(text);
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  const getContextContent = () => {
    console.log('🔍 selectedContext:', selectedContext);
    console.log('🔍 shareContent keys:', Object.keys(shareContent));
    const painLabel = shareContent.pain || '';
    switch (selectedContext) {
      case 'partner': {
        const text = shareContent.partnerText || shareContent.analogy || '';
        return {
          title: t('sharePreview.contextPartnerTitle'),
          content: `${t('sharePreview.contextPartnerPrefix')}${painLabel}\n\n${safeSlice(text)}`,
        };
      }
      case 'work': {
        const text = shareContent.workText || shareContent.action || '';
        const subSceneLabel = t(`sharePreview.workSub.${workSubScene}`);
        return {
          title: `${t('sharePreview.contextWorkTitle')} · ${subSceneLabel}`,
          content: safeSlice(text),
        };
      }
      case 'medical': {
        const text = shareContent.reportText || shareContent.chief_complaint || '';
        const ref = shareContent.present_illness || shareContent.med_reference || '';
        return {
          title: t('sharePreview.contextMedicalTitle'),
          content: `${t('sharePreview.contextMedicalChief')}${safeSlice(text, 100)}\n\n${t('sharePreview.contextMedicalRef')}${safeSlice(ref, 100)}`,
        };
      }
      case 'selfcare': {
        const text = shareContent.selfCare || shareContent.selfcareText || '';
        return {
          title: t('sharePreview.contextSelfcareTitle'),
          content: safeSlice(text),
        };
      }
      default:
        return {
          title: t('sharePreview.contextDefaultTitle'),
          content: safeSlice(shareContent.analogy || ''),
        };
    }
  };

  const contextContent = getContextContent();
  const previewImg = shareContent.historyImg || imgUrl;
  const currentContext = CONTEXT_TYPES.find(c => c.key === selectedContext);

  const handleConfirmShare = () => {
    if (onConfirm) {
      onConfirm({
        ...shareContent,
        identity: selectedContext,
        workSubScene: selectedContext === 'work' ? workSubScene : undefined,
        previewTitle: contextContent.title,
        previewContent: contextContent.content,
        blurEnabled,
        blurLevel: blurEnabled ? blurLevel : 0,
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 11500,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        boxSizing: 'border-box',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#141414',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid #333',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          color: '#fff',
          margin: '0 0 8px 0',
          textAlign: 'center',
          fontSize: 'var(--text-md)',
          fontWeight: 'bold',
        }}>
          {t('sharePreview.title')}
        </h3>

        <p style={{
          color: '#888',
          fontSize: '12px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          {t('sharePreview.subtitle')}
        </p>

        {/* 语境选择器 */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            color: '#888',
            fontSize: '11px',
            display: 'block',
            marginBottom: '8px',
            textAlign: 'center',
            letterSpacing: '0.5px',
          }}>
            {t('sharePreview.selectContext')}
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}>
            {CONTEXT_TYPES.map((ctx) => (
              <button
                key={ctx.key}
                onClick={() => setSelectedContext(ctx.key)}
                style={{
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedContext === ctx.key
                    ? `1.5px solid ${ctx.color}`
                    : '1px solid rgba(255,255,255,0.08)',
                  background: selectedContext === ctx.key
                    ? `${ctx.color}18`
                    : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{ctx.emoji}</div>
                <div style={{
                  color: selectedContext === ctx.key ? '#fff' : '#888',
                  fontSize: '11px',
                  fontWeight: selectedContext === ctx.key ? '600' : '400',
                }}>
                  {t(`sharePreview.contextLabel.${ctx.key}`)}
                </div>
                <div style={{
                  color: selectedContext === ctx.key ? '#aaa' : '#555',
                  fontSize: '9px',
                  marginTop: '2px',
                }}>
                  {t(`sharePreview.contextDesc.${ctx.key}`)}
                </div>
              </button>
            ))}
          </div>
        </div>
        {selectedContext === 'work' && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{
              color: '#888',
              fontSize: '10px',
              display: 'block',
              marginBottom: '8px',
              textAlign: 'center',
              letterSpacing: '0.5px',
            }}>
              {t('shareText.selectWorkSub')}
            </span>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              {workSubScenes.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setWorkSubScene(sub.key)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: workSubScene === sub.key
                      ? '1px solid rgba(255,152,0,0.4)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: workSubScene === sub.key
                      ? 'rgba(255,152,0,0.12)'
                      : 'transparent',
                    color: workSubScene === sub.key ? '#ffb74d' : '#888',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {sub.emoji} {t(`shareText.workSub.${sub.key}.label`)}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* 图片预览区 + 模糊控制 */}
        <div style={{
          background: '#0a0a0a',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-md)',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          border: '1px solid #222',
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '320px',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            <img
              src={previewImg}
              style={{
                width: '100%',
                maxHeight: '220px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-sm)',
                filter: blurEnabled ? `blur(${blurLevel}px)` : 'none',
                transition: 'filter 0.3s ease',
              }}
              alt="preview"
            />
            {blurEnabled && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '8px',
                padding: '4px 8px',
                color: '#ff9800',
                fontSize: '10px',
              }}>
                🔒 {t('sharePreview.blurred')}
              </div>
            )}
          </div>

          {/* 模糊控制栏 */}
          <div style={{
            width: '100%',
            maxWidth: '320px',
            marginTop: '12px',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: blurEnabled ? '10px' : '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'var(--text-md)' }}>{blurEnabled ? '🔒' : '🔓'}</span>
                <span style={{ color: '#aaa', fontSize: '12px' }}>
                  {t('sharePreview.blurArtwork')}
                </span>
              </div>
              <button
                onClick={() => setBlurEnabled(!blurEnabled)}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: blurEnabled ? '#ff9800' : '#444',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: blurEnabled ? '22px' : '2px',
                  transition: 'left 0.2s ease',
                }} />
              </button>
            </div>
            {blurEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#555', fontSize: '10px' }}>{t('sharePreview.blurLight')}</span>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={blurLevel}
                  onChange={(e) => setBlurLevel(Number(e.target.value))}
                  style={{ flex: 1, height: '3px', accentColor: '#ff9800', cursor: 'pointer' }}
                />
                <span style={{ color: '#555', fontSize: '10px' }}>{t('sharePreview.blurStrong')}</span>
              </div>
            )}
          </div>
          {blurEnabled && (
            <p style={{
              color: '#666',
              fontSize: '10px',
              margin: '8px 0 0 0',
              textAlign: 'center',
              lineHeight: '1.4',
            }}>
              {t('sharePreview.blurHint')}
            </p>
          )}
        </div>

        {/* 语境文本预览 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderLeft: `4px solid ${currentContext?.color || '#888'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--text-md)' }}>{currentContext?.emoji}</span>
            <p style={{ color: '#fff', fontSize: 'var(--text-base)', fontWeight: 'bold', margin: 0 }}>
              {contextContent.title}
            </p>
          </div>
          <p style={{
            color: '#ccc',
            fontSize: '12.5px',
            margin: 0,
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
          }}>
            {contextContent.content || t('sharePreview.noContextText')}
          </p>
        </div>

        {/* 底部按钮 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              flex: 1,
              padding: '8px 0',      // ✅ 从 12px 改为 8px
              borderRadius: '14px',  // ✅ 从 20px 改为 14px
              background: '#222',
              border: '1px solid #333',
              color: '#888',
              cursor: 'pointer',
              fontSize: '11px',      // ✅ 从 13px 改为 11px
              minHeight: '36px',     // ✅ 添加固定最小高度
            }}
            onClick={onCancel}
          >
            {t('sharePreview.cancel')}
          </button>
          <button
            style={{
              flex: 1.5,
              padding: '8px 0',
              borderRadius: '14px',
              background: blurEnabled
                ? 'linear-gradient(135deg, #ff9800, #e65100)'
                : `linear-gradient(135deg, ${currentContext?.color || '#4caf50'}, ${currentContext?.color || '#2e7d32'}88)`,
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '11px',
              minHeight: '36px',
            }}
            onClick={handleConfirmShare}
          >
            {blurEnabled ? t('sharePreview.confirmBlurred') : t('sharePreview.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}