// src/components/modals/DiaryDetailModal.jsx
import React, { useState } from 'react';
import { PALETTES } from '../../i18n/translationsConstants';

export default function DiaryDetailModal({
  viewingDiary,
  onClose,
  onDelete,
  onShare,
  onPublish,
  appMode,
  t,
  getEditedOrDefault,
  setShareContent,
  setShowSharePreview,
}) {
  const [diaryShareIdentity, setDiaryShareIdentity] = useState('partner');
  const [leaveRecipient, setLeaveRecipient] = useState('manager');
  const [leaveTone, setLeaveTone] = useState('polite');

  if (!viewingDiary) return null;

  const getColorName = (palette) => {
    const map = {
      crimson: t('colorDescriptions.crimson'),
      dark: t('colorDescriptions.dark'),
      purple: t('colorDescriptions.purple'),
      blue: t('colorDescriptions.blue'),
    };
    return (map[palette] || '').split('：')[0] || palette;
  };

  const handleShare = () => {
    setShareContent({
      ...viewingDiary.content,
      identity: diaryShareIdentity,
      historyImg: viewingDiary.img,
      pain: viewingDiary.painName,
      workText: getEditedOrDefault('workText', viewingDiary.content?.workText),
      leaveRecipient: leaveRecipient,
    });
    setShowSharePreview(true);
    onClose();
  };

  const handlePublish = () => {
    onPublish(viewingDiary.img);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 500,
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
        overflow: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 痛觉图谱图片 */}
        <img
          src={viewingDiary.img}
          style={{
            width: '100%',
            borderRadius: '12px',
            border: '1px solid #444',
          }}
          alt="diary"
        />

        {/* Meta 信息标签 */}
        {viewingDiary.meta && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '12px',
            }}
          >
            {viewingDiary.meta.colorPalette && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  color: '#ccc',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: `rgb(${(PALETTES[viewingDiary.meta.colorPalette]?.color || [200, 50, 50]).join(',')})`,
                    display: 'inline-block',
                  }}
                />
                {getColorName(viewingDiary.meta.colorPalette)}
              </span>
            )}
            {viewingDiary.meta.painScore > 0 && (
              <span
                style={{
                  background: 'rgba(211,47,47,0.15)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  color: '#ffcdd2',
                }}
              >
                {t('diary.brushCount', { count: viewingDiary.meta.painScore })}
              </span>
            )}
            {viewingDiary.meta.bodyMode && viewingDiary.meta.bodyMode !== 'none' && (
              <span
                style={{
                  background: 'rgba(76,175,80,0.12)',
                  borderRadius: '12px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  color: '#a5d6a7',
                }}
              >
                {viewingDiary.meta.bodyMode === 'front'
                  ? t('diary.bodyFront')
                  : viewingDiary.meta.bodyMode === 'back'
                    ? t('diary.bodyBack')
                    : t('diary.bodyBoth')}
              </span>
            )}
          </div>
        )}

        {/* 标题：日期 + 痛感名 */}
        <h3
          style={{
            color: '#fff',
            marginTop: '20px',
            marginBottom: '10px',
          }}
        >
          {viewingDiary.date} {viewingDiary.time}
          <span
            style={{
              marginLeft: '12px',
              color: '#d32f2f',
              fontSize: '16px',
              background: 'rgba(211, 47, 47, 0.15)',
              padding: '4px 12px',
              borderRadius: '12px',
            }}
          >
            {viewingDiary.painName}
          </span>
        </h3>

        {/* 内容区域 */}
        <div
          style={{
            background: 'rgba(28,28,28,0.9)',
            padding: '18px',
            borderRadius: '12px',
            marginTop: '10px',
            border: '1px solid #444',
          }}
        >
          <p
            style={{
              color: '#ccc',
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '0 0 12px 0',
            }}
          >
            {viewingDiary.content?.analogy}
          </p>
          <p
            style={{
              color: '#4caf50',
              fontSize: '13px',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            {viewingDiary.content?.selfCare}
          </p>
        </div>

        {/* 分享/发布区域 */}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '20px',
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>
              {t('diary.shareContext')}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              {['partner', 'work', appMode === 'medical' && 'doctor', 'self']
                .filter(Boolean)
                .map((tab) => (
                  <button
                    key={tab}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiaryShareIdentity(tab);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: diaryShareIdentity === tab ? '#d32f2f' : '#222',
                      color: diaryShareIdentity === tab ? '#fff' : '#888',
                      minWidth: '60px',
                    }}
                  >
                    {t(`result.tabs.${tab}`)}
                  </button>
                ))}
            </div>
          </div>

          {/* Work 模式下额外选项 */}
          {diaryShareIdentity === 'work' && (
            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderTop: '1px solid #333',
                paddingTop: '12px',
              }}
            >
              <span
                style={{
                  color: '#888',
                  fontSize: '11.5px',
                  alignSelf: 'flex-start',
                }}
              >
                📢 发送对象：
              </span>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                }}
              >
                {['manager', 'teacher', 'client', 'friend'].map((key) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeaveRecipient(key);
                    }}
                    style={{
                      padding: '8px 0',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border:
                        leaveRecipient === key
                          ? '1px solid #ff9800'
                          : '1px solid #333',
                      background:
                        leaveRecipient === key
                          ? 'rgba(255, 152, 0, 0.08)'
                          : '#222',
                      color: leaveRecipient === key ? '#fff' : '#888',
                      cursor: 'pointer',
                    }}
                  >
                    {t(`result.work.recipients.${key}`)}
                  </button>
                ))}
              </div>

              <span
                style={{
                  color: '#888',
                  fontSize: '11.5px',
                  alignSelf: 'flex-start',
                  marginTop: '6px',
                }}
              >
                🎭 表达语气：
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['polite', 'objective'].map((key) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeaveTone(key);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border:
                        leaveTone === key
                          ? '1px solid #ff9800'
                          : '1px solid #333',
                      background:
                        leaveTone === key
                          ? 'rgba(255, 152, 0, 0.08)'
                          : '#222',
                      color: leaveTone === key ? '#fff' : '#888',
                      cursor: 'pointer',
                    }}
                  >
                    {t(`result.work.tones.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
              marginTop: '5px',
            }}
          >
            <button
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '25px',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              onClick={handleShare}
            >
              {t('diary.share')}
            </button>
            <button
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '25px',
                background: 'rgba(167, 119, 224, 0.99)',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
              }}
              onClick={handlePublish}
            >
              {t('diary.publish')}
            </button>
          </div>
        </div>

        {/* 删除与关闭 */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%',
            marginTop: '15px',
          }}
        >
          <button
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: '25px',
              background: 'rgba(211,47,47,0.08)',
              border: '1px solid rgba(211,47,47,0.3)',
              color: '#ef5350',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onClick={onDelete}
          >
            🗑️ {t('history.delete') || '删除'}
          </button>
          <button
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: '25px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #333',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={onClose}
          >
            {t('diary.close') || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}