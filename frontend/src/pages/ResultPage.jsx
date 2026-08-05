// src/pages/ResultPage.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/i18nContext';
import EditableBlock from '../Components/EditableBlock';
import PublishPostModal from '../Components/modals/PublishPostModal'; // 🌟 引入发布弹窗组件

export default function ResultPage({
  // 导航
  onBack,
  onPublish,
  onShare,

  // 数据
  imgUrl,
  content = {},
  appMode,

  // Tab
  identity = 'partner',
  setIdentity,

  // 编辑
  editedContents = {},
  setEditedContents,
  editingField,
  setEditingField,
  getEditedOrDefault = (k, v) => v,

  // 优化
  refineInput = '',
  setRefineInput,
  refiningField,
  setRefiningField,
  refineTargetField = 'chief_complaint',
  setRefineTargetField,
  handleRefine,

  // 请假
  leaveRecipient = 'manager',
  setLeaveRecipient,
  leaveTone = 'polite',
  setLeaveTone,

  // 分享
  prepareSharePreview,
  setHealingState,
  randomPartnerTips = [],
  handleCopy = () => {},
}) {
  const { t } = useI18n();

  // 🌟 1. 新增：控制发布弹窗与输入标题文本的状态
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishTitleText, setPublishTitleText] = useState('');

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
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 痛觉图谱预览 */}
      {imgUrl && (
        <img
          src={imgUrl}
          style={{
            width: '50%',
            maxWidth: '200px',
            marginTop: '20px',
            borderRadius: '16px',
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
          gap: '8px',
          margin: '24px 0 16px 0',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : '380px',
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            style={{
              flex: 1,
              padding: '12px 0',
              background: identity === tab ? '#222' : 'rgba(20,20,20,0.6)',
              color: identity === tab ? '#fff' : '#666',
              border: identity === tab ? '1.5px solid #444' : '1px solid #222',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: identity === tab ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
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
          padding: '24px',
          borderRadius: '20px',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : '380px',
          border: '1px solid #222',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          transition: 'max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      >
        {/* ===== 伴侣视图 ===== */}
        {identity === 'partner' && (
          <>
            <h3 style={{ color: '#fff', margin: '0 0 15px 0' }}>
              {t('result.partner.title')}
            </h3>
            <div
              style={{
                background: 'rgba(211,47,47,0.04)',
                padding: '14px',
                borderRadius: '12px',
                borderLeft: '4px solid #d32f2f',
                borderTop: '1px solid #222',
                borderRight: '1px solid #222',
                borderBottom: '1px solid #222',
              }}
            >
              <p
                style={{
                  color: '#ffcdd2',
                  fontSize: '13.5px',
                  margin: '0 0 8px 0',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                }}
              >
                {t('result.partner.experiencing')}
                <strong>{content.pain || '痛经'}</strong>。
              </p>
              <EditableBlock
                fieldKey="analogy"
                defaultValue={content.analogy || ''}
                color="#ffcdd2"
                style={{ fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
                onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
              />
            </div>
            <div style={{ marginTop: '20px' }}>
              <strong
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                {t('result.partner.actionPrompt')}
              </strong>
              <EditableBlock
                fieldKey="action"
                defaultValue={content.action || ''}
                color="#ccc"
                style={{ fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
                onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
              />
            </div>
            <button
              onClick={() => handleCopy(getEditedOrDefault('action', content.action || ''))}
              style={{
                marginTop: '15px',
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1px dashed #d32f2f',
                color: '#ffcdd2',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {t('result.partner.copyAction')}
            </button>

            {/* 优化区域 */}
            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #222' }}>
              <p style={{ color: '#888', fontSize: '12px', margin: '0 0 10px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder={getRefinePlaceholder('partner')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#111',
                    border: '1px solid #222',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine('analogy');
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine('analogy')}
                  disabled={refiningField === 'analogy'}
                  style={{
                    background: refiningField === 'analogy' ? '#555' : '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 16px',
                    cursor: refiningField === 'analogy' ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                  }}
                >
                  {refiningField === 'analogy'
                    ? t('result.refine.optimizing')
                    : t('result.refine.optimize')}
                </button>
              </div>
            </div>

            {/* 伴侣科普 */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #222' }}>
              <h4
                style={{
                  color: '#ef5350',
                  fontSize: '14px',
                  fontWeight: '600',
                  margin: '0 0 14px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                🔴 {t('resultLabels.companionGuide')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.isArray(randomPartnerTips) && randomPartnerTips.map((tip, idx) => {
                  const titleStr = typeof tip === 'string' ? tip : (tip?.title || '');
                  const descStr = typeof tip === 'string' ? '' : (tip?.desc || '');
                  const isWarning = titleStr.includes('警告') || titleStr.toLowerCase().includes('alert');
                  return (
                    <div
                      key={idx}
                      style={{
                        background: isWarning
                          ? 'linear-gradient(145deg, #241414, #121212)'
                          : '#161616',
                        borderRadius: '14px',
                        padding: '16px',
                        border: isWarning
                          ? '1px solid rgba(211,47,47,0.2)'
                          : '1px solid #222',
                        borderLeft: isWarning
                          ? '4px solid #d32f2f'
                          : '4px solid rgba(211, 47, 47, 0.5)',
                      }}
                    >
                      <div
                        style={{
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '8px',
                        }}
                      >
                        {titleStr || '陪伴提示'}
                      </div>
                      {descStr && (
                        <div
                          style={{
                            color: '#aaa',
                            fontSize: '12.5px',
                            lineHeight: '1.6',
                            textAlign: 'justify',
                          }}
                        >
                          {descStr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ===== 请假视图 ===== */}
        {identity === 'work' && (
          <>
            <h3 style={{ color: '#ff9800', margin: '0 0 15px 0' }}>
              {t('result.work.title')}
            </h3>
            <p
              style={{
                color: '#888',
                fontSize: '12.5px',
                marginBottom: '16px',
                lineHeight: '1.6',
              }}
            >
              {t('result.work.description')}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: '11px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                {t('resultLabels.sendTarget')}
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['manager', 'teacher', 'client', 'friend'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setLeaveRecipient && setLeaveRecipient(key)}
                    style={{
                      flex: '1 0 45%',
                      padding: '10px 0',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: leaveRecipient === key ? '1px solid #ff9800' : '1px solid #222',
                      background: leaveRecipient === key ? 'rgba(255, 152, 0, 0.08)' : '#161616',
                      color: leaveRecipient === key ? '#fff' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginBottom: '4px',
                    }}
                  >
                    {t(`result.work.recipients.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span
                style={{
                  color: '#666',
                  fontSize: '11px',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                {t('resultLabels.tonePreference')}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['polite', 'objective'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setLeaveTone && setLeaveTone(key)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: leaveTone === key ? '1px solid #ff9800' : '1px solid #222',
                      background: leaveTone === key ? 'rgba(255, 152, 0, 0.08)' : '#161616',
                      color: leaveTone === key ? '#fff' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t(`result.work.tones.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,152,0,0.03)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,152,0,0.12)',
              }}
            >
              <EditableBlock
                fieldKey="workText"
                defaultValue={getEditedOrDefault('workText', content.workText || '')}
                color="#eee"
                style={{ fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
                onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
              />
            </div>

            <button
              onClick={() => handleCopy(getEditedOrDefault('workText', content.workText || ''))}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1px dashed #ff9800',
                color: '#ffcc80',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
              }}
            >
              {t('result.work.copyTemplate')}
            </button>

            <div style={{ marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #222' }}>
              <p style={{ color: '#888', fontSize: '11px', margin: '0 0 10px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder={getRefinePlaceholder('work')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#111',
                    border: '1px solid #222',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine('workText');
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine('workText')}
                  disabled={refiningField === 'workText'}
                  style={{
                    background: refiningField === 'workText' ? '#555' : '#ff9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 16px',
                    cursor: refiningField === 'workText' ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ borderBottom: '1px solid #222', paddingBottom: '14px' }}>
              <h3
                style={{
                  color: '#2196f3',
                  margin: '0 0 6px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                {t('result.doctor.title')}
              </h3>
              <p
                style={{
                  color: '#ff9800',
                  fontSize: '11.5px',
                  lineHeight: '1.6',
                  margin: 0,
                  fontWeight: '500',
                  background: 'rgba(255,152,0,0.04)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,152,0,0.1)',
                }}
              >
                {t('result.doctor.disclaimer')}
              </p>
            </div>

            {/* 主诉 */}
            {content.chief_complaint && content.chief_complaint.trim() && (
              <div
                style={{
                  background: 'rgba(211,47,47,0.02)',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(211,47,47,0.1)',
                  borderLeft: '4px solid #d32f2f',
                }}
              >
                <h4
                  style={{
                    color: '#ef5350',
                    fontSize: '13px',
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>📋</span> {t('doctorTab.chiefComplaint')}
                </h4>
                <EditableBlock
                  fieldKey="chief_complaint"
                  defaultValue={content.chief_complaint}
                  color="#fff"
                  style={{
                    fontSize: '14.5px',
                    fontWeight: '500',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                  }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 现病史 */}
            {content.present_illness && content.present_illness.trim() && (
              <div
                style={{
                  background: '#161616',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid #222',
                }}
              >
                <h4
                  style={{
                    color: '#90caf9',
                    fontSize: '13px',
                    margin: '0 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>📝</span> {t('doctorTab.presentIllness')}
                </h4>
                <EditableBlock
                  fieldKey="present_illness"
                  defaultValue={content.present_illness}
                  color="#e0e0e0"
                  style={{ fontSize: '13.5px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 既往史 */}
            {content.past_history && content.past_history.trim() && (
              <div
                style={{
                  background: '#161616',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid #222',
                }}
              >
                <h4
                  style={{
                    color: '#90caf9',
                    fontSize: '13px',
                    margin: '0 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>📂</span> {t('doctorTab.pastHistory')}
                </h4>
                <EditableBlock
                  fieldKey="past_history"
                  defaultValue={content.past_history}
                  color="#cccccc"
                  style={{ fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 月经史 */}
            {content.menstrual_history && content.menstrual_history.trim() && (
              <div
                style={{
                  background: '#161616',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid #222',
                }}
              >
                <h4
                  style={{
                    color: '#90caf9',
                    fontSize: '13px',
                    margin: '0 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>🌸</span> {t('doctorTab.menstrualObstetricHistory')}
                </h4>
                <EditableBlock
                  fieldKey="menstrual_history"
                  defaultValue={content.menstrual_history}
                  color="#cccccc"
                  style={{ fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 临床诊断 */}
            {content.clinical_diagnosis && content.clinical_diagnosis.trim() && (
              <div
                style={{
                  background: 'rgba(33,150,243,0.02)',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid rgba(33,150,243,0.1)',
                  borderLeft: '4px solid #2196f3',
                }}
              >
                <h4
                  style={{
                    color: '#90caf9',
                    fontSize: '13px',
                    margin: '0 0 10px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>🩺</span> {t('doctorTab.clinicalDiagnosis')}
                </h4>
                <EditableBlock
                  fieldKey="clinical_diagnosis"
                  defaultValue={content.clinical_diagnosis}
                  color="#e3f2fd"
                  style={{
                    fontSize: '13.5px',
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap',
                    fontWeight: '500',
                  }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 临床建议 */}
            {content.clinical_suggestions && content.clinical_suggestions.trim() && (
              <div
                style={{
                  background: '#161616',
                  padding: '18px',
                  borderRadius: '14px',
                  border: '1px solid #222',
                }}
              >
                <h4
                  style={{
                    color: '#ffb74d',
                    fontSize: '13px',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  <span>💊</span> {t('doctorTab.clinicalAdvice')}
                </h4>
                <EditableBlock
                  fieldKey="clinical_suggestions"
                  defaultValue={content.clinical_suggestions}
                  color="#e0e0e0"
                  style={{ fontSize: '13px', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}
                  onSave={(key, val) => setEditedContents && setEditedContents({ ...editedContents, [key]: val })}
                />
              </div>
            )}

            {/* 优化面板 */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #222' }}>
              <p style={{ color: '#888', fontSize: '11.5px', margin: '0 0 12px 0' }}>
                {t('result.refine.prompt')}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {[
                  { key: 'chief_complaint', label: t('result.refine.optimizeComplaint') },
                  {
                    key: 'present_illness',
                    label: t('result.refine.optimizeReference'),
                  },
                  { key: 'clinical_suggestions', label: t('result.refine.optimize') },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setRefineTargetField && setRefineTargetField(item.key);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      fontSize: '11px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: refineTargetField === item.key ? '#2196f3' : '#1e1e1e',
                      color: refineTargetField === item.key ? '#fff' : '#888',
                      transition: 'all 0.2s',
                      fontWeight: refineTargetField === item.key ? 'bold' : 'normal',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  placeholder={getRefinePlaceholder('doctor')}
                  value={refineInput}
                  onChange={(e) => setRefineInput && setRefineInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#111',
                    border: '1px solid #222',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && handleRefine) handleRefine(refineTargetField);
                  }}
                />
                <button
                  onClick={() => handleRefine && handleRefine(refineTargetField)}
                  disabled={refiningField === refineTargetField}
                  style={{
                    background: refiningField === refineTargetField ? '#555' : '#2196f3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0 16px',
                    cursor: refiningField === refineTargetField ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
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
            <h3 style={{ color: '#9c27b0', margin: '0 0 15px 0' }}>
              {t('result.self.title')}
            </h3>
            <p
              style={{
                color: '#ccc',
                fontSize: '13px',
                lineHeight: '1.75',
                marginBottom: '20px',
                textAlign: 'justify',
                whiteSpace: 'pre-wrap',
              }}
            >
              {content.comfort}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid #222',
                    borderLeft: `4px solid ${tip.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#202020')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#161616')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '26px' }}>{tip.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                        {tip.title}
                      </div>
                      <div style={{ color: '#aaa', fontSize: '11.5px', marginTop: '4px' }}>
                        {tip.subtitle}
                      </div>
                    </div>
                    <span style={{ color: '#666', fontSize: '18px' }}>›</span>
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
          gap: '10px',
          width: '100%',
          maxWidth: identity === 'doctor' ? '580px' : '380px',
          transition: 'max-width 0.25s',
          marginTop: '24px',
          marginBottom: '40px',
        }}
      >
        <button
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: '25px',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(76,175,80,0.2)',
          }}
          onClick={() => prepareSharePreview && prepareSharePreview(content)} // 🌟 调取海报预审弹窗
        >
          {t('result.shareCard')}
        </button>
        <button
          style={{
            flex: 1.5,
            padding: '14px',
            borderRadius: '25px',
            background: '#2196f3',
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(33,150,243,0.2)',
          }}
          onClick={() => {
            if (onPublish) onPublish(); // 🌟 调取社区发布弹窗
          }}
        >
          {t('result.publish')}
        </button>
        <button
          style={{
            flex: 1.2,
            padding: '14px',
            borderRadius: '25px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid #444',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          onClick={onBack}
        >
          {t('result.backHome')}
        </button>
      </div>
    </div>
  );
}