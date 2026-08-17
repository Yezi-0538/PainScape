// src/pages/ResultPage.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';
import PublishPostModal from '../Components/modals/PublishPostModal';
import PeriodScience from '../Components/PeriodScience';

// ============================================================
// 🏷️ 标记文本解析工具函数
// ============================================================

const parseMarkedText = (text) => {
  if (!text) return [{ text: '', type: 'plain' }];

  const parts = [];
  let lastIndex = 0;
  const regex = /<user>(.*?)<\/user>/gs;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        type: 'plain'
      });
    }
    parts.push({
      text: match[1],
      type: 'user'
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      type: 'plain'
    });
  }

  return parts;
};

const stripUserMarkers = (text) => {
  if (!text) return '';
  return text.replace(/<user>(.*?)<\/user>/gs, '$1');
};

const MarkedTextDisplay = ({ text, style = {} }) => {
  if (!text) return null;

  const parts = parseMarkedText(text);

  return (
    <span style={{ ...style }}>
      {parts.map((part, index) => (
        <span
          key={index}
          style={{
            color: part.type === 'user' ? '#ffb74d' : 'inherit',
            fontWeight: part.type === 'user' ? '600' : 'normal',
            background: part.type === 'user' ? 'rgba(255, 152, 0, 0.2)' : 'transparent',
            padding: part.type === 'user' ? '0 4px' : '0',
            borderRadius: part.type === 'user' ? '4px' : '0',
            borderBottom: part.type === 'user' ? '2px solid rgba(255, 152, 0, 0.3)' : 'none',
          }}
        >
          {part.text}
        </span>
      ))}
    </span>
  );
};

// ============================================================
// 🔧 可编辑的可复制模块组件
// ============================================================

const EditableCard = ({
  fieldKey,
  value,
  onSave,
  title,
  icon,
  textColor = '#e0e0e0',
  fontSize = 'var(--text-sm)',
  lineHeight = '1.8',
  placeholder = '',
  rows = 3,
  showCopy = true,
  showEdit = true,
  sourceLabel = null,
  sourceColor = null,
  borderColor = '#333',
}) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(stripUserMarkers(value || ''));
  const [showCopied, setShowCopied] = useState(false);

  const userFields = ['past_history', 'menstrual_history'];
  const isUserField = userFields.includes(fieldKey);

  const getDisplayValue = () => {
    if (!value) return '';
    if (value.includes('<user>')) return value;
    if (isUserField) {
      return `<user>${value}</user>`;
    }
    return value;
  };

  const displayValue = getDisplayValue();

  const getPlainText = () => {
    return stripUserMarkers(value || '');
  };

  const handleCopy = async () => {
    const plainText = getPlainText();
    if (!plainText) return;

    try {
      await navigator.clipboard.writeText(plainText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleSave = () => {
    let savedValue = editValue;
    if (isUserField && savedValue && !savedValue.includes('<user>')) {
      savedValue = `<user>${savedValue}</user>`;
    }
    onSave(fieldKey, savedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(stripUserMarkers(value || ''));
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditValue(stripUserMarkers(value || ''));
    setIsEditing(true);
  };

  const getBorderColor = () => {
    if (borderColor) return borderColor;
    return '#333';
  };

  const cardBorderColor = getBorderColor();

  const copyLabel = showCopied ? t('resultLabels.copied') : t('resultLabels.copy');
  const editLabel = t('resultLabels.edit');
  const saveLabel = t('resultLabels.save');
  const cancelLabel = t('resultLabels.cancel');
  const defaultPlaceholder = t('resultLabels.clickToEdit');

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        padding: 'var(--space-lg)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${cardBorderColor}`,
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555';
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = cardBorderColor;
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
      }}
    >
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 'var(--text-md)' }}>{icon || '📄'}</span>
        <h4 style={{
          color: '#aaa',
          fontSize: 'var(--text-sm)',
          margin: 0,
          fontWeight: '500',
          letterSpacing: '0.3px',
        }}>
          {title || fieldKey}
        </h4>
        {sourceLabel && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              padding: '1px 8px',
              borderRadius: '10px',
              background: sourceColor ? `${sourceColor}20` : 'rgba(255,255,255,0.06)',
              color: sourceColor || '#666',
              fontWeight: '400',
              letterSpacing: '0.3px',
              opacity: 0.7,
            }}
          >
            {sourceLabel}
          </span>
        )}
      </div>

      {/* 内容区域 */}
      {isEditing ? (
        <div style={{ width: '100%' }}>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            style={{
              width: '100%',
              background: '#111',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: 'var(--space-md)',
              fontSize: fontSize,
              lineHeight: lineHeight,
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: `${rows * 32}px`,
              boxSizing: 'border-box',
            }}
            placeholder={placeholder || defaultPlaceholder}
            autoFocus
          />
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleSave}
              style={{
                padding: '4px 14px',
                background: '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: '500',
                minHeight: '28px',
                height: '28px',
              }}
            >
              {saveLabel}
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '4px 14px',
                background: 'transparent',
                color: '#888',
                border: '1px solid #333',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                minHeight: '28px',
                height: '28px',
              }}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleStartEdit}
          style={{
            cursor: 'pointer',
            padding: '2px 0',
            minHeight: '20px',
          }}
        >
          {displayValue ? (
            <MarkedTextDisplay
              text={displayValue}
              style={{
                color: textColor,
                fontSize: fontSize,
                lineHeight: lineHeight,
              }}
            />
          ) : (
            <span style={{
              color: '#444',
              fontSize: fontSize,
              fontStyle: 'italic',
            }}>
              {placeholder || defaultPlaceholder}
            </span>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      {!isEditing && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '4px',
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          flexWrap: 'wrap',
        }}>
          {showCopy && (
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                color: showCopied ? '#4caf50' : '#555',
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                minHeight: 'auto',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#aaa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = showCopied ? '#4caf50' : '#555'; }}
            >
              {copyLabel}
            </button>
          )}

          {showEdit && (
            <button
              onClick={handleStartEdit}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#555',
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: 'var(--text-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
                minHeight: 'auto',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#4caf50'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; }}
            >
              {editLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// 主组件
// ============================================================

export default function ResultPage({
  onBack,
  onPublish,
  onShare,
  imgUrl,
  content = {},
  appMode,
  identity = 'partner',
  setIdentity,
  editedContents = {},
  medicalBackground = {},
  setEditedContents,
  editingField,
  setEditingField,
  getEditedOrDefault = (k, v) => v,
  refineInput = '',
  setRefineInput,
  refiningField,
  setRefiningField,
  refineTargetField = 'chief_complaint',
  setRefineTargetField,
  handleRefine,
  leaveRecipient = 'manager',
  setLeaveRecipient,
  leaveTone = 'polite',
  setLeaveTone,
  prepareSharePreview,
  setHealingState,
  randomPartnerTips = [],
  handleCopy = () => {},
}) {
  const { t, lang, toggleLang } = useI18n();

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitleText, setPublishTitleText] = useState('');

  const getFieldValue = (fieldKey) => {
    if (editedContents && editedContents[fieldKey] !== undefined) {
      return editedContents[fieldKey];
    }
    return content[fieldKey] || '';
  };

  const handleFieldSave = (fieldKey, value) => {
    setEditedContents && setEditedContents({
      ...editedContents,
      [fieldKey]: value,
    });
  };

  const getWorkText = useCallback(() => {
    if (editedContents?.workText !== undefined) return editedContents.workText;
    const toneMap = {
      polite: 'formal',
      objective: 'neutral',
      formal: 'formal',
      neutral: 'neutral',
      casual: 'casual',
    };
    const workScenarios = {
      zh: {
        manager: {
          formal: '领导您好：因身体不适，申请今天休假一天。紧急事务已交接，明天恢复正常工作。',
          neutral: '今天身体不适，请假一天。工作已安排妥当。',
          casual: '身体不太舒服，今天请假休息一天，不好意思。',
        },
        teacher: {
          formal: '老师您好！因身体不适，今日无法到课。已安排同学代为记录课堂内容。',
          neutral: '今天身体不适，请假缺席课程。会及时补上学习内容。',
          casual: '老师好，今天身体不舒服，请一天假。后续会补上笔记。',
        },
        friend: {
          formal: '今天身体不适，需取消本次见面。改日再约，抱歉。',
          neutral: '今天不太舒服，咱们改天再约吧。',
          casual: '身体有点扛不住了，今天先鸽了，回头约！',
        },
        client: {
          formal: '因突发身体不适，需将今日会议改期。已协调同事代为对接，给您带来不便深表歉意。',
          neutral: '今天身体不适，需要将会议改期。已安排同事协助对接。',
          casual: '今天临时身体不适，会议改天再约。相关问题已同步给同事。',
        },
        partner: {
          formal: '今天身体不适，需要安静休息。晚间事宜需请你代为处理。',
          neutral: '今天不太舒服，想好好休息一下。家里的事麻烦你多担待。',
          casual: '今天疼得厉害，想躺平一天。辛苦你照顾啦。',
        },
      },
      en: {
        manager: {
          formal: 'Requesting sick leave today. Urgent matters have been delegated. Expected return tomorrow.',
          neutral: 'Taking a sick day today. Work is covered.',
          casual: 'Not feeling well today — taking the day off. Will catch up tomorrow.',
        },
        teacher: {
          formal: 'Unable to attend class today due to a health condition. Arranged for notes to be shared.',
          neutral: 'Can\'t make it to class today — health flare-up. Will catch up on materials.',
          casual: 'Professor — not feeling well today. Will get notes from a classmate.',
        },
        friend: {
          formal: 'Need to cancel today\'s plans due to a health issue. Let\'s reschedule soon.',
          neutral: 'Not feeling great today — let\'s reschedule.',
          casual: 'Feeling rough today — gonna have to rain check. Let\'s catch up soon!',
        },
        client: {
          formal: 'Due to a sudden health matter, I need to reschedule today\'s meeting. A colleague will handle urgent matters. Apologies for the inconvenience.',
          neutral: 'Need to reschedule today\'s meeting due to a health issue. A colleague is briefed and available.',
          casual: 'Not feeling well today — need to push our meeting. Colleague is up to speed if anything urgent.',
        },
        partner: {
          formal: 'Need to rest today due to a health condition. Would appreciate your support with household matters.',
          neutral: 'Not feeling great today. Need some quiet rest — could use your help around the house.',
          casual: 'Feeling awful today — going to be horizontal. Thanks for taking care of things.',
        },
      },
    };

    const langKey = lang === 'en' ? 'en' : 'zh';
    const recipient = leaveRecipient || 'manager';
    const rawTone = leaveTone || 'neutral';
    const tone = toneMap[rawTone] || 'neutral';

    const scenarios = workScenarios[langKey];
    if (scenarios && scenarios[recipient] && scenarios[recipient][tone]) {
      return scenarios[recipient][tone];
    }
    if (scenarios && scenarios[recipient] && scenarios[recipient]['neutral']) {
      return scenarios[recipient]['neutral'];
    }
    return lang === 'en'
      ? 'Requesting sick leave today due to a health condition.'
      : '因身体不适，申请今天休假一天。';
  }, [leaveRecipient, leaveTone, lang, editedContents?.workText]);

  const getRefinePlaceholder = (tabIdentity) => {
    const map = {
      partner: t('result.refine.placeholderPartner'),
      work: t('result.refine.placeholderWork'),
      doctor: t('result.refine.placeholderDoctor'),
      self: t('result.refine.placeholderSelf'),
    };
    return map[tabIdentity] || t('result.refine.placeholder');
  };

  const tabs = ['partner', 'work', appMode === 'medical' && 'doctor', 'self'].filter(Boolean);

  const fieldSources = content._fieldSources || {};

  const getSourceInfo = (fieldKey) => {
    let source = fieldSources[fieldKey];
    if (!source) {
      const userFields = ['past_history', 'menstrual_history'];
      source = userFields.includes(fieldKey) ? 'user' : 'ai';
    }
    if (source === 'user') {
      return {
        label: t('resultLabels.sourceUser'),
        color: '#ff9800',
      };
    }
    return {
      label: t('resultLabels.sourceAi'),
      color: '#64b5f6',
    };
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 20,
        background: 'rgba(8,8,8,0.97)',
        backdropFilter: 'blur(12px)',
        padding: 'var(--space-xl)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {imgUrl && (
        <img
          src={imgUrl}
          style={{
            width: '50%',
            maxWidth: '200px',
            marginTop: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid #333',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          alt="pain map preview"
        />
      )}

      {/* Tab 切换 */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          margin: '20px 0 14px 0',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : 'var(--container-max)',
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            style={{
              flex: 1,
              padding: '10px 0',
              background: identity === tab ? 'rgba(255,255,255,0.08)' : 'rgba(20,20,20,0.6)',
              color: identity === tab ? '#fff' : '#666',
              border: identity === tab ? '1.5px solid #555' : '1px solid #2a2a2a',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              fontWeight: identity === tab ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minHeight: 'var(--btn-min-touch)',
            }}
            onClick={() => setIdentity && setIdentity(tab)}
          >
            {t(`result.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* 内容卡片 */}
      <div
        className="info-card"
        style={{
          background: '#121212',
          padding: 'var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : 'var(--container-max)',
          border: '1px solid #2a2a2a',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== 伴侣视图 ===== */}
        {identity === 'partner' && (
          <>
            <h3 style={{
              color: '#fff',
              margin: '0 0 12px 0',
              fontSize: 'var(--text-md)',
              fontWeight: '500',
            }}>
              {t('result.partner.title')}
            </h3>

            <div
              style={{
                background: 'rgba(211,47,47,0.04)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '4px solid #d32f2f',
                borderTop: '1px solid #2a2a2a',
                borderRight: '1px solid #2a2a2a',
                borderBottom: '1px solid #2a2a2a',
                marginBottom: '14px',
              }}
            >
              <p
                style={{
                  color: '#ffcdd2',
                  fontSize: 'var(--text-sm)',
                  margin: '0 0 6px 0',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                }}
              >
                {t('result.partner.experiencing')}
                <strong>{content.pain || t('painNames.twist')}</strong>。
              </p>
              <EditableCard
                fieldKey="analogy"
                value={getFieldValue('analogy') || content.analogy || ''}
                onSave={handleFieldSave}
                title={t('resultLabels.companionGuide')}
                icon="💬"
                textColor="#ffcdd2"
                fontSize="var(--text-sm)"
                lineHeight="1.7"
                placeholder={t('resultLabels.clickToEdit')}
                rows={2}
                borderColor="#3a2a2a"
                sourceLabel={t('resultLabels.sourceAi')}
                sourceColor="#64b5f6"
              />
            </div>

            <EditableCard
              fieldKey="action"
              value={getFieldValue('action') || content.action || ''}
              onSave={handleFieldSave}
              title={t('resultLabels.companionGuide')}
              icon="🤝"
              textColor="#ccc"
              fontSize="var(--text-sm)"
              lineHeight="1.7"
              placeholder={t('resultLabels.clickToEdit')}
              rows={3}
              borderColor="#2a3a2a"
            />

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #2a2a2a' }}>
              <p style={{ color: '#666', fontSize: 'var(--text-xs)', margin: '0 0 8px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <input
                  placeholder={getRefinePlaceholder('partner')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: 'var(--space-md)',
                    fontSize: 'var(--text-sm)',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine('analogy');
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine('analogy')}
                  disabled={refiningField === 'analogy'}
                  style={{
                    padding: '0 16px',
                    background: refiningField === 'analogy' ? '#555' : '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: refiningField === 'analogy' ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)',
                    whiteSpace: 'nowrap',
                    fontWeight: '500',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                >
                  {refiningField === 'analogy'
                    ? t('result.refine.optimizing')
                    : t('result.refine.optimize')}
                </button>
              </div>
            </div>

            <PeriodScience />
          </>
        )}

        {/* ===== 请假视图 ===== */}
        {identity === 'work' && (
          <>
            <h3 style={{
              color: '#ff9800',
              margin: '0 0 12px 0',
              fontSize: 'var(--text-md)',
              fontWeight: '500',
            }}>
              {t('result.work.title')}
            </h3>
            <p
              style={{
                color: '#888',
                fontSize: 'var(--text-sm)',
                marginBottom: '14px',
                lineHeight: '1.6',
              }}
            >
              {t('result.work.description')}
            </p>

            <div style={{ marginBottom: '14px' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: 'var(--text-xs)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                {t('resultLabels.sendTarget')}
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['manager', 'teacher', 'client', 'friend'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setLeaveRecipient && setLeaveRecipient(key)}
                    style={{
                      flex: '1 0 45%',
                      padding: '8px 0',
                      fontSize: 'var(--text-xs)',
                      borderRadius: '6px',
                      border: leaveRecipient === key ? '1px solid #ff9800' : '1px solid #2a2a2a',
                      background: leaveRecipient === key ? 'rgba(255, 152, 0, 0.08)' : '#161616',
                      color: leaveRecipient === key ? '#fff' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '4px',
                      minHeight: 'var(--btn-height-sm)',
                    }}
                  >
                    {t(`result.work.recipients.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: 'var(--text-xs)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                {t('resultLabels.tonePreference')}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['polite', 'objective'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setLeaveTone && setLeaveTone(key)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: 'var(--text-xs)',
                      borderRadius: '6px',
                      border: leaveTone === key ? '1px solid #ff9800' : '1px solid #2a2a2a',
                      background: leaveTone === key ? 'rgba(255, 152, 0, 0.08)' : '#161616',
                      color: leaveTone === key ? '#fff' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minHeight: 'var(--btn-height-sm)',
                    }}
                  >
                    {t(`result.work.tones.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <EditableCard
              fieldKey="workText"
              value={getFieldValue('workText') || getWorkText()}
              onSave={handleFieldSave}
              title={t('resultLabels.sendTarget')}
              icon="📨"
              textColor="#eee"
              fontSize="var(--text-sm)"
              lineHeight="1.7"
              placeholder={t('resultLabels.clickToEdit')}
              rows={2}
              borderColor="#2a3a2a"
            />

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #2a2a2a' }}>
              <p style={{ color: '#666', fontSize: 'var(--text-xs)', margin: '0 0 8px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <input
                  placeholder={getRefinePlaceholder('work')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: 'var(--space-md)',
                    fontSize: 'var(--text-sm)',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine('workText');
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine('workText')}
                  disabled={refiningField === 'workText'}
                  style={{
                    padding: '0 16px',
                    background: refiningField === 'workText' ? '#555' : '#ff9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: refiningField === 'workText' ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)',
                    whiteSpace: 'nowrap',
                    fontWeight: '500',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                >
                  {refiningField === 'workText'
                    ? t('result.refine.optimizing')
                    : t('result.refine.optimize')}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== 医生视图 ===== */}
        {identity === 'doctor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderBottom: '1px solid #2a2a2a', paddingBottom: '12px' }}>
              <h3 style={{
                color: '#2196f3',
                margin: '0 0 4px 0',
                fontSize: 'var(--text-md)',
                fontWeight: '500',
              }}>
                {t('result.doctor.title')}
              </h3>
              <p style={{
                color: '#ff9800',
                fontSize: 'var(--text-xs)',
                lineHeight: '1.6',
                margin: 0,
                fontWeight: '400',
                background: 'rgba(255,152,0,0.04)',
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,152,0,0.06)',
              }}>
                {t('result.doctor.disclaimer')}
              </p>
            </div>

            {content.chief_complaint?.trim() && (
              <EditableCard
                fieldKey="chief_complaint"
                value={getFieldValue('chief_complaint') || content.chief_complaint}
                onSave={handleFieldSave}
                title={t('doctorTab.chiefComplaint')}
                icon="📋"
                textColor="#fff"
                fontSize="var(--text-base)"
                lineHeight="1.7"
                placeholder={t('resultLabels.clickToEdit')}
                rows={2}
                borderColor="#2a3a4a"
                sourceLabel={getSourceInfo('chief_complaint').label}
                sourceColor={getSourceInfo('chief_complaint').color}
              />
            )}

            {content.present_illness?.trim() && (
              <EditableCard
                fieldKey="present_illness"
                value={getFieldValue('present_illness') || content.present_illness}
                onSave={handleFieldSave}
                title={t('doctorTab.presentIllness')}
                icon="📝"
                textColor="#e0e0e0"
                fontSize="var(--text-sm)"
                lineHeight="1.8"
                placeholder={t('resultLabels.clickToEdit')}
                rows={3}
                borderColor="#2a3a4a"
                sourceLabel={getSourceInfo('present_illness').label}
                sourceColor={getSourceInfo('present_illness').color}
              />
            )}

            {content.past_history?.trim() && (
              <EditableCard
                fieldKey="past_history"
                value={getFieldValue('past_history') || content.past_history}
                onSave={handleFieldSave}
                title={t('doctorTab.pastHistory')}
                icon="📂"
                textColor="#ffb74d"
                fontSize="var(--text-sm)"
                lineHeight="1.8"
                placeholder={t('resultLabels.clickToEdit')}
                rows={2}
                borderColor="#3a3a2a"
                sourceLabel={getSourceInfo('past_history').label}
                sourceColor={getSourceInfo('past_history').color}
              />
            )}

            {content.menstrual_history?.trim() && (
              <EditableCard
                fieldKey="menstrual_history"
                value={getFieldValue('menstrual_history') || content.menstrual_history}
                onSave={handleFieldSave}
                title={t('doctorTab.menstrualObstetricHistory')}
                icon="🌸"
                textColor="#ffb74d"
                fontSize="var(--text-sm)"
                lineHeight="1.8"
                placeholder={t('resultLabels.clickToEdit')}
                rows={2}
                borderColor="#3a3a2a"
                sourceLabel={getSourceInfo('menstrual_history').label}
                sourceColor={getSourceInfo('menstrual_history').color}
              />
            )}

            {content.clinical_diagnosis?.trim() && (
              <EditableCard
                fieldKey="clinical_diagnosis"
                value={getFieldValue('clinical_diagnosis') || content.clinical_diagnosis}
                onSave={handleFieldSave}
                title={t('doctorTab.clinicalDiagnosis')}
                icon="🩺"
                textColor="#e3f2fd"
                fontSize="var(--text-sm)"
                lineHeight="1.8"
                placeholder={t('resultLabels.clickToEdit')}
                rows={3}
                borderColor="#2a3a4a"
                sourceLabel={getSourceInfo('clinical_diagnosis').label}
                sourceColor={getSourceInfo('clinical_diagnosis').color}
              />
            )}

            {content.clinical_suggestions?.trim() && (
              <EditableCard
                fieldKey="clinical_suggestions"
                value={getFieldValue('clinical_suggestions') || content.clinical_suggestions}
                onSave={handleFieldSave}
                title={t('doctorTab.clinicalAdvice')}
                icon="💊"
                textColor="#e0e0e0"
                fontSize="var(--text-sm)"
                lineHeight="1.85"
                placeholder={t('resultLabels.clickToEdit')}
                rows={3}
                borderColor="#2a3a4a"
                sourceLabel={getSourceInfo('clinical_suggestions').label}
                sourceColor={getSourceInfo('clinical_suggestions').color}
              />
            )}

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #2a2a2a' }}>
              <p style={{ color: '#666', fontSize: 'var(--text-xs)', margin: '0 0 10px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'chief_complaint', label: t('result.refine.optimizeComplaint') },
                  { key: 'present_illness', label: t('result.refine.optimizeReference') },
                  { key: 'clinical_suggestions', label: t('result.refine.optimize') },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setRefineTargetField && setRefineTargetField(item.key);
                    }}
                    style={{
                      flex: 1,
                      minWidth: '60px',
                      padding: '6px 8px',
                      fontSize: 'var(--text-xs)',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: refineTargetField === item.key ? '#2196f3' : '#1e1e1e',
                      color: refineTargetField === item.key ? '#fff' : '#666',
                      transition: 'all 0.2s',
                      fontWeight: refineTargetField === item.key ? 'bold' : 'normal',
                      minHeight: 'var(--btn-height-sm)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <input
                  placeholder={getRefinePlaceholder('doctor')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background: '#111',
                    border: '1px solid #2a2a2a',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: 'var(--space-md)',
                    fontSize: 'var(--text-sm)',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine(refineTargetField);
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine(refineTargetField)}
                  disabled={refiningField === refineTargetField}
                  style={{
                    padding: '0 16px',
                    background: refiningField === refineTargetField ? '#555' : '#2196f3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: refiningField === refineTargetField ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)',
                    whiteSpace: 'nowrap',
                    fontWeight: '500',
                    minHeight: 'var(--btn-min-touch)',
                  }}
                >
                  {refiningField === refineTargetField
                    ? t('result.refine.optimizing')
                    : t('result.refine.optimize')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 自愈视图 ===== */}
        {identity === 'self' && (
          <>
            <h3 style={{
              color: '#9c27b0',
              margin: '0 0 12px 0',
              fontSize: 'var(--text-md)',
              fontWeight: '500',
            }}>
              {t('result.self.title')}
            </h3>

            <EditableCard
              fieldKey="selfCare"
              value={getFieldValue('selfCare') || content.comfort || ''}
              onSave={handleFieldSave}
              title={t('result.self.title')}
              icon="💜"
              textColor="#ccc"
              fontSize="var(--text-sm)"
              lineHeight="1.75"
              placeholder={t('resultLabels.clickToEdit')}
              rows={4}
              borderColor="#2a2a3a"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {[
                {
                  key: 'breathing',
                  icon: '🌬️',
                  title: t('healing.breathing.title'),
                  subtitle: t('healing.breathing.description'),
                  color: '#4caf50',
                },
                {
                  key: 'posture',
                  icon: '🧘',
                  title: t('healing.meditation.title'),
                  subtitle: t('healing.meditation.description'),
                  color: '#ab47bc',
                },
                {
                  key: 'acupressure',
                  icon: '💆',
                  title: t('healing.acupressure.title'),
                  subtitle: t('healing.acupressure.description'),
                  color: '#2196f3',
                },
                {
                  key: 'thermal',
                  icon: '🔥',
                  title: t('healing.heatPack.title'),
                  subtitle: t('healing.heatPack.description'),
                  color: '#ff9800',
                },
              ].map((tip) => (
                <div
                  key={tip.key}
                  onClick={() => {
                    setHealingState && setHealingState({ isOpen: true, activeTab: tip.key });
                  }}
                  style={{
                    background: '#161616',
                    padding: 'var(--space-lg)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #2a2a2a',
                    borderLeft: `4px solid ${tip.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#202020')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#161616')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: 'var(--text-xl)' }}>{tip.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: '#fff',
                        fontWeight: '500',
                        fontSize: 'var(--text-sm)',
                      }}>
                        {tip.title}
                      </div>
                      <div style={{
                        color: '#888',
                        fontSize: 'var(--text-xs)',
                        marginTop: '2px',
                      }}>
                        {tip.subtitle}
                      </div>
                    </div>
                    <span style={{ color: '#555', fontSize: 'var(--text-md)' }}>›</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 底部按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : 'var(--container-max)',
          transition: 'max-width 0.25s',
          marginTop: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          style={{
            flex: 1.8,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            boxShadow: '0 2px 8px rgba(76,175,80,0.2)',
            whiteSpace: 'nowrap',
            minHeight: 'var(--btn-min-touch)',
          }}
          type="button"
          onClick={() => {
            if (prepareSharePreview) {
              prepareSharePreview(content);
            } else if (onShare) {
              onShare(content?.historyImg || imgUrl);
            }
          }}
        >
          {t('result.shareCard')}
        </button>

        <button
          style={{
            flex: 1.5,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            background: '#2196f3',
            color: '#fff',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            boxShadow: '0 2px 8px rgba(33,150,243,0.2)',
            whiteSpace: 'nowrap',
            minHeight: 'var(--btn-min-touch)',
          }}
          type="button"
          onClick={() => {
            if (onPublish) {
              onPublish();
            } else if (typeof setShowPostModal !== 'undefined') {
              setShowPostModal(true);
            }
          }}
        >
          {t('result.publish')}
        </button>

        <button
          style={{
            flex: 1.1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #2a2a2a',
            color: '#888',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            whiteSpace: 'nowrap',
            minHeight: 'var(--btn-min-touch)',
          }}
          onClick={onBack}
        >
          {t('result.backHome')}
        </button>

        <button
          type="button"
          style={{
            flex: 0.6,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #2a2a2a',
            color: '#888',
            cursor: 'pointer',
            fontSize: 'var(--text-xs)',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            minHeight: 'var(--btn-min-touch)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={toggleLang}
        >
          {lang === 'zh' ? t('splash.switchLang') : t('splash.switchLang')}
        </button>
      </div>
    </div>
  );
}