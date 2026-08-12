// src/Components/modals/RecordDetailModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

// 中文痛感词反向映射字典
const CHINESE_TO_KEY_MAP = {
  '绞痛': 'twist', '刺痛': 'pierce', '坠胀': 'heavy', '坠胀重压': 'heavy',
  '坠痛': 'heavy', '酸胀': 'wave', '酸胀痛': 'wave', '弥漫酸胀痛': 'wave',
  '刮痛': 'scrape', '撕裂痛': 'scrape', '撕裂刮痛': 'scrape',
};

const containsChinese = (str) => /[\u4e00-\u9fa5]/.test(String(str || ''));
const containsEnglish = (str) => /[a-zA-Z]/.test(String(str || '')) && !containsChinese(str);

const getPainNameDisplay = (record, t) => {
  if (!record) return '';
  const key = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName];
  if (key && t(`painNames.${key}`)) {
    return t(`painNames.${key}`);
  }
  return record.painName || '';
};

// 🌟 双向智能转译：中文模式下存量英文转中文，英文模式下存量中文转英文
const getReportDataForModal = (viewingDiary, isEn, t) => {
  try {
    let rd = viewingDiary?.reportData || {};
    const dominantKey = viewingDiary?.dominantPain || CHINESE_TO_KEY_MAP[viewingDiary?.painName] || 'heavy';

    if (isEn) {
      // 英文模式：将中文重构为英文模板
      if (containsChinese(rd.chief_complaint) || containsChinese(rd.present_illness) || containsChinese(rd.action)) {
        const painName = t(`painNames.${dominantKey}`) || dominantKey;
        const analogy = t(`painTemplates.${dominantKey}.analogy`) || '';
        const chief = t('defaultTemplates.chief_complaint', { pain: painName, symptoms: 'No significant accompanying symptoms' });
        const illness = t('defaultTemplates.present_illness', { pain: painName, cycleDay: viewingDiary?.cycleDay || 'X', analogy });
        const diag = t('defaultTemplates.clinical_diagnosis');
        const selfCare = t(`painTemplates.${dominantKey}.selfCare`);

        const prefKey = viewingDiary?.userPrefs?.[0] || 'care';
        const actionsArr = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
        const action = Array.isArray(actionsArr) ? actionsArr.map(act => String(act).replace('{{med}}', 'Ibuprofen')).join('\n') : '';
        const work = t('workTemplate') ? t('workTemplate').replace('{{pain}}', painName) : '';

        return { chief_complaint: chief, present_illness: illness, clinical_diagnosis: diag, selfCare, action, work };
      }
    } else {
      // 🌟 中文模式：将存量英文重构为中文模板！(修复截图 1)
      if (containsEnglish(rd.chief_complaint) || containsEnglish(rd.present_illness)) {
        const painName = t(`painNames.${dominantKey}`) || '痛经';
        const analogy = t(`painTemplates.${dominantKey}.analogy`) || '';
        const chief = t('defaultTemplates.chief_complaint', { pain: painName, symptoms: '无明显伴随症状' });
        const illness = t('defaultTemplates.present_illness', { pain: painName, cycleDay: viewingDiary?.cycleDay || 'X', analogy });
        const diag = t('defaultTemplates.clinical_diagnosis');
        const selfCare = t(`painTemplates.${dominantKey}.selfCare`);

        const prefKey = viewingDiary?.userPrefs?.[0] || 'care';
        const actionsArr = t(`partnerActions.${prefKey}`, { returnObjects: true }) || [];
        const action = Array.isArray(actionsArr) ? actionsArr.map(act => String(act).replace('{{med}}', '布洛芬')).join('\n') : '';
        const work = t('workTemplate') ? t('workTemplate').replace('{{pain}}', painName) : '';

        return { chief_complaint: chief, present_illness: illness, clinical_diagnosis: diag, selfCare, action, work };
      }
    }

    return rd;
  } catch (err) {
    console.warn('⚠️ 数据解析异常回退:', err);
    return viewingDiary?.reportData || {};
  }
};

export default function RecordDetailModal({
  viewingDiary,
  mode = 'history',
  onClose,
  onDelete,
  onShare,
  onPublish,
  lang = 'zh',
}) {
  const { t } = useI18n();
  const [postText, setPostText] = useState('');
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  if (!viewingDiary) return null;

  const isEn = lang === 'en';
  const rd = getReportDataForModal(viewingDiary, isEn, t);
  const displayPainName = getPainNameDisplay(viewingDiary, t);

  const formatText = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(isEn ? '; ' : '；');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const handlePublishSubmit = () => {
    setShowPublishConfirm(true);
  };

  const confirmPublish = () => {
    setShowPublishConfirm(false);
    if (onPublish) {
      onPublish(viewingDiary, postText);
    }
    onClose();
  };

  const cancelPublish = () => {
    setShowPublishConfirm(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-lg)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#141414',
          border: '1px solid #333',
          borderRadius: '24px',
          padding: '24px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ color: '#fff', fontSize: 'var(--text-md)', fontWeight: 'bold' }}>
            {mode === 'result'
              ? `📤 ${isEn ? 'Share Pain Map' : '疼痛地图预览与分享'}`
              : `📖 ${isEn ? 'Pain Record Details' : '痛觉记录详情'}`}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 图像展示 */}
        {viewingDiary.img && (
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '16px' }}>
            <img src={viewingDiary.img} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: '220px' }} alt="Pain Map" />
          </div>
        )}

        {/* 核心指标卡片 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            color: '#ef5350',
            fontSize: '12px',
            background: 'rgba(239,83,80,0.12)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 'bold',
            border: '1px solid rgba(239,83,80,0.2)'
          }}>
            {displayPainName}
          </span>
          {viewingDiary.painScore != null && (
            <span style={{
              color: '#ff9800',
              fontSize: '12px',
              background: 'rgba(255,152,0,0.12)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 'bold',
              border: '1px solid rgba(255,152,0,0.2)'
            }}>
              {isEn ? 'Score: ' : '评分: '} {viewingDiary.painScore}
            </span>
          )}
          {viewingDiary.date && (
            <span style={{ color: '#888', fontSize: '12px', padding: '4px 0' }}>
              🕒 {viewingDiary.date} {viewingDiary.time || ''}
            </span>
          )}
        </div>

        {/* 详细段落展示 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {rd.chief_complaint && (
            <div style={{ background: '#1c1c1c', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #ef5350' }}>
              <div style={{ color: '#ef5350', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.chiefComplaint') || (isEn ? 'Chief Complaint:' : '主诉：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.chief_complaint)}
              </div>
            </div>
          )}

          {rd.present_illness && (
            <div style={{ background: '#1c1c1c', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #ab47bc' }}>
              <div style={{ color: '#ab47bc', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.presentIllness') || (isEn ? 'History of Present Illness:' : '现病史：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.present_illness)}
              </div>
            </div>
          )}

          {rd.clinical_diagnosis && (
            <div style={{ background: '#1c1c1c', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #4caf50' }}>
              <div style={{ color: '#4caf50', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.clinicalDiagnosis') || (isEn ? 'Clinical Diagnosis:' : '临床诊断：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.clinical_diagnosis)}
              </div>
            </div>
          )}

          {rd.selfCare && (
            <div style={{ background: '#1c1c1c', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #ff9800' }}>
              <div style={{ color: '#ff9800', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.selfCare') || (isEn ? 'Self-Care Advice:' : '自愈建议：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', whitespace: 'pre-line' }}>
                {formatText(rd.selfCare)}
              </div>
            </div>
          )}

          {rd.action && (
            <div style={{ background: '#1c1c1c', padding: 'var(--space-md)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #2196f3' }}>
              <div style={{ color: '#2196f3', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.action') || (isEn ? 'Partner/Family Action:' : '伴侣/家人行动：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', whitespace: 'pre-line' }}>
                {formatText(rd.action)}
              </div>
            </div>
          )}
        </div>

        {/* 社区发布发帖输入框（仅在日记模式下呈现） */}
        {mode === 'history' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              💬 {isEn ? 'Message for Community Feed:' : '想随此帖发布到广场的话（可选）：'}
            </label>
            <textarea
              rows={3}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={isEn ? 'Write a message to sisters in the community...' : '写点什么倾诉或分享给社群姐妹...'}
              style={{
                width: '100%',
                background: '#1c1c1c',
                color: '#fff',
                border: '1px solid #333',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: '12.5px',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* 交互按钮布局 */}
        {mode === 'result' ? (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onShare && onShare(viewingDiary)}
              style={{
                flex: 2,
                padding: 'var(--space-md)',
                background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: 'var(--text-base)',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
              }}
            >
              📥 {t('result.shareCard')}
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: 'var(--space-md)',
                background: '#222',
                border: '1px solid #444',
                color: '#ccc',
                borderRadius: '14px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('diary.close') || (isEn ? 'Close' : '关闭')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => onShare && onShare(viewingDiary)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(76,175,80,0.2)',
                }}
              >
                📤 {isEn ? 'Share Image' : '分享图片'}
              </button>
              <button
                onClick={handlePublishSubmit}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: '#2196f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(33,150,243,0.2)',
                }}
              >
                🌐 {isEn ? 'Post to Community' : '发布到广场'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {onDelete && (
                <button
                  onClick={() => onDelete(viewingDiary.id)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: 'rgba(244,67,54,0.1)',
                    border: '1px solid rgba(244,67,54,0.3)',
                    color: '#ef5350',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ {t('history.delete') || (isEn ? 'Delete' : '删除')}
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: '#222',
                  border: '1px solid #333',
                  color: '#aaa',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                {t('diary.close') || (isEn ? 'Close' : '关闭')}
              </button>
            </div>
          </div>
        )}
      </div>
      {showPublishConfirm && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '24px',
            padding: 'var(--space-lg)',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
          onClick={cancelPublish}
        >
          <div
            style={{
              background: '#181818',
              border: '1px solid #333',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              width: '100%',
              maxWidth: '420px',
              boxSizing: 'border-box',
              boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
              color: '#fff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '14px', fontSize: 'var(--text-md)', fontWeight: '700' }}>
              {t('diary.publishConfirmTitle') || (isEn ? 'Confirm Publish' : '确认发布到社区')}
            </div>
            <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.7', marginBottom: '20px' }}>
              {t('diary.publishConfirmMessage') || (isEn ? 'This diary entry will be shared to the community feed and become visible to other members.' : '该日记将发布到社区广场，其他同伴将可见。是否继续？')}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cancelPublish}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: '14px',
                  border: '1px solid #444',
                  background: '#222',
                  color: '#bbb',
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel') || (isEn ? 'Cancel' : '取消')}
              </button>
              <button
                onClick={confirmPublish}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#2196f3',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {t('common.confirm') || (isEn ? 'Confirm' : '确认')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}