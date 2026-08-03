// src/pages/HistoryPage.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/i18nContext';

// ============================================================
// 工具函数
// ============================================================
const normalizeDateStr = (dateStr) => {
  if (!dateStr) return '';
  const cleanStr = dateStr.replace(/\//g, '-').replace(/\./g, '-');
  const parsed = new Date(cleanStr);
  if (isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${parsed.getMonth() + 1}-${parsed.getDate()}`;
};

const formatDateKey = (year, month, day) => {
  return `${year}-${month + 1}-${day}`;
};

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 中文痛感词反向映射表
const CHINESE_TO_KEY_MAP = {
  '绞痛': 'twist',
  '刺痛': 'pierce',
  '坠胀': 'heavy',
  '坠胀重压': 'heavy',
  '坠痛': 'heavy',
  '酸胀': 'wave',
  '酸胀痛': 'wave',
  '弥漫酸胀痛': 'wave',
  '刮痛': 'scrape',
  '撕裂痛': 'scrape',
  '撕裂刮痛': 'scrape',
};

// 检查是否包含中文字符
const containsChinese = (str) => /[\u4e00-\u9fa5]/.test(String(str || ''));

// 安全获取转译后的痛感名称
const getPainNameDisplay = (record, t) => {
  if (!record) return '';
  const key = record.dominantPain || CHINESE_TO_KEY_MAP[record.painName];
  if (key && t(`painNames.${key}`)) {
    return t(`painNames.${key}`);
  }
  return record.painName || '';
};

const formatYearMonth = (year, monthIndex, t) => {
  const isEn = t('history.sun') === 'Sun';
  if (isEn) {
    return `${EN_MONTHS[monthIndex]} ${year}`;
  }
  return `${year}年${monthIndex + 1}月`;
};

// 安全解析与重构英文报告
const getReportDataForModal = (viewingDiary, isEn, t) => {
  try {
    let rd = viewingDiary?.reportData || {};

    if (isEn) {
      const dominantKey = viewingDiary.dominantPain || CHINESE_TO_KEY_MAP[viewingDiary.painName] || 'heavy';
      const painName = t(`painNames.${dominantKey}`) || dominantKey;
      const analogy = t(`painTemplates.${dominantKey}.analogy`) || '';

      const chief = containsChinese(rd.chief_complaint) || !rd.chief_complaint
        ? t('defaultTemplates.chief_complaint', { 
            pain: painName, 
            symptoms: 'No significant accompanying symptoms' 
          })
        : rd.chief_complaint;

      const illness = containsChinese(rd.present_illness) || !rd.present_illness
        ? t('defaultTemplates.present_illness', { 
            pain: painName, 
            cycleDay: viewingDiary.cycleDay || 'X', 
            analogy 
          })
        : rd.present_illness;

      const diag = containsChinese(rd.clinical_diagnosis) || !rd.clinical_diagnosis
        ? t('defaultTemplates.clinical_diagnosis')
        : rd.clinical_diagnosis;

      const selfCare = containsChinese(rd.selfCare) || !rd.selfCare
        ? t(`painTemplates.${dominantKey}.selfCare`)
        : rd.selfCare;

      let action = rd.action;
      if (containsChinese(rd.action) || !rd.action) {
        const prefKey = viewingDiary.userPrefs?.[0] || 'care';
        const actionsArr = t(`partnerActions.${prefKey}`, { returnObjects: true });
        if (Array.isArray(actionsArr) && actionsArr.length > 0) {
          action = actionsArr.map(act => String(act).replace('{{med}}', 'Ibuprofen')).join('\n');
        } else {
          const fallbackArr = t('partnerActions.care', { returnObjects: true }) || [];
          action = Array.isArray(fallbackArr) ? fallbackArr.map(act => String(act).replace('{{med}}', 'Ibuprofen')).join('\n') : '';
        }
      }

      let work = rd.work;
      if (containsChinese(rd.work) || !rd.work) {
        work = t('workTemplate')
          ? t('workTemplate').replace('{{pain}}', painName)
          : `Dear Manager, I am experiencing severe acute pain (${painName}) today and am unable to work. I kindly request a day off. Thank you for your understanding.`;
      }

      return {
        chief_complaint: chief,
        present_illness: illness,
        clinical_diagnosis: diag,
        selfCare: selfCare,
        action: action,
        work: work,
      };
    }

    return rd;
  } catch (err) {
    console.warn('⚠️ 解析弹窗数据异常，自动防崩溃回退:', err);
    return viewingDiary?.reportData || {};
  }
};

// ============================================================
// 子组件：趋势摘要
// ============================================================
const TrendSummary = ({ history, t }) => {
  if (history.length < 2) return null;

  const recent = history.slice(0, 5);
  const typeFreq = recent.reduce((acc, r) => {
    const key = r.dominantPain || CHINESE_TO_KEY_MAP[r.painName] || r.type || 'twist';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sortedTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]);
  const dominantKey = sortedTypes.length > 0 ? sortedTypes[0][0] : 'twist';
  
  const dominantName = t(`painNames.${dominantKey}`) || dominantKey;

  const gaps = history
    .slice(0, -1)
    .map((r, i) => {
      const d1 = new Date(history[i + 1].date.replace(/\//g, '-'));
      const d2 = new Date(r.date.replace(/\//g, '-'));
      return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24));
    })
    .filter((d) => !isNaN(d));

  const avgGap = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  return (
    <div
      style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '15px',
        marginBottom: '20px',
        border: '1px solid #333',
      }}
    >
      <p
        style={{
          color: '#fff',
          fontWeight: 'bold',
          margin: '0 0 10px 0',
          fontSize: '13px',
        }}
      >
        {t('history.trendTitle')}
      </p>
      <div style={{ display: 'flex', gap: '15px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#ef9a9a', fontSize: '20px', fontWeight: 'bold' }}>
            {dominantName}
          </div>
          <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
            {t('history.trendMostCommon')}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#90caf9', fontSize: '20px', fontWeight: 'bold' }}>
            ~{avgGap}
            {t('history.days')}
          </div>
          <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
            {t('history.trendAvgInterval')}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#a5d6a7', fontSize: '20px', fontWeight: 'bold' }}>
            {history.length}
          </div>
          <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>
            {t('history.trendTotal')}
          </div>
        </div>
      </div>
      {avgGap > 0 && (avgGap < 25 || avgGap > 35) ? (
        <p
          style={{
            color: '#ff9800',
            fontSize: '11px',
            margin: '10px 0 0 0',
            padding: '8px',
            background: 'rgba(255,152,0,0.08)',
            borderRadius: '6px',
          }}
        >
          {t('history.trendDeviation')}
        </p>
      ) : null}
    </div>
  );
};

// ============================================================
// 子组件：记录详情弹窗
// ============================================================
const RecordDetailModal = ({ viewingDiary, onClose, onDelete, t, lang = 'zh' }) => {
  if (!viewingDiary) return null;

  const isEn = lang === 'en' || t('history.sun') === 'Sun';
  const rd = getReportDataForModal(viewingDiary, isEn, t);
  const displayPainName = getPainNameDisplay(viewingDiary, t);

  const formatText = (val) => {
    if (!val) return '';
    if (Array.isArray(val)) return val.join(isEn ? '; ' : '；');
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
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
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
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
          maxWidth: '420px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
            📖 {isEn ? 'Pain Record Details' : '痛觉记录详情'}
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

        {/* 图片展示 */}
        {viewingDiary.img && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #222', background: '#000', marginBottom: '16px' }}>
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
            borderRadius: '12px',
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
              borderRadius: '12px',
              fontWeight: 'bold',
              border: '1px solid rgba(255,152,0,0.2)'
            }}>
              {isEn ? 'Score: ' : '评分: '} {viewingDiary.painScore}
            </span>
          )}
          <span style={{ color: '#888', fontSize: '12px', padding: '4px 0' }}>
            🕒 {viewingDiary.date} {viewingDiary.time}
          </span>
        </div>

        {/* 详细段落展示 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {rd.chief_complaint && (
            <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #ef5350' }}>
              <div style={{ color: '#ef5350', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.chiefComplaint') || (isEn ? 'Chief Complaint:' : '主诉：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.chief_complaint)}
              </div>
            </div>
          )}

          {rd.present_illness && (
            <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #ab47bc' }}>
              <div style={{ color: '#ab47bc', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.presentIllness') || (isEn ? 'History of Present Illness:' : '现病史：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.present_illness)}
              </div>
            </div>
          )}

          {rd.clinical_diagnosis && (
            <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #4caf50' }}>
              <div style={{ color: '#4caf50', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.clinicalDiagnosis') || (isEn ? 'Clinical Diagnosis:' : '临床诊断：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5' }}>
                {formatText(rd.clinical_diagnosis)}
              </div>
            </div>
          )}

          {rd.selfCare && (
            <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #ff9800' }}>
              <div style={{ color: '#ff9800', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.selfCare') || (isEn ? 'Self-Care Advice:' : '自愈建议：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', whitespace: 'pre-line' }}>
                {formatText(rd.selfCare)}
              </div>
            </div>
          )}

          {rd.action && (
            <div style={{ background: '#1c1c1c', padding: '12px', borderRadius: '12px', borderLeft: '3px solid #2196f3' }}>
              <div style={{ color: '#2196f3', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                {t('pdf.action') || (isEn ? 'Partner/Family Action:' : '伴侣/家人行动：')}
              </div>
              <div style={{ color: '#ccc', fontSize: '13px', lineHeight: '1.5', whitespace: 'pre-line' }}>
                {formatText(rd.action)}
              </div>
            </div>
          )}
        </div>

        {/* 底部功能按钮 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onDelete(viewingDiary.id)}
            style={{
              flex: 1,
              padding: '11px',
              background: 'rgba(244,67,54,0.1)',
              border: '1px solid rgba(244,67,54,0.3)',
              color: '#ef5350',
              borderRadius: '12px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🗑️ {t('history.delete') || (isEn ? 'Delete' : '删除')}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2,
              padding: '11px',
              background: '#333',
              border: 'none',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {t('diary.close') || (isEn ? 'Close' : '关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 主组件
// ============================================================
export default function HistoryPage({
  lang = 'zh', 
  setTargetLanguage,
  onBack,
  history,
  setHistory,
  calendarDate,
  setCalendarDate,
  selectedDate,
  setSelectedDate,
  selectedDateRecords,
  setSelectedDateRecords,
  showGroupedView,
  setShowGroupedView,
  menstrualDates,
  setMenstrualDates,
  viewingDiary,
  setViewingDiary,
  exportHistoryPDF,
  showToast,
}) {
  const { t } = useI18n();
  const isEn = lang === 'en';
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const toggleMonth = (month) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  const hasRecordOnDate = (year, month, day) => {
    const targetStr = formatDateKey(year, month, day);
    return history.some((h) => normalizeDateStr(h.date) === targetStr);
  };

  const getRecordsOnDate = (year, month, day) => {
    const targetStr = formatDateKey(year, month, day);
    return history.filter((h) => normalizeDateStr(h.date) === targetStr);
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const today = new Date();

    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          style={{ width: '14.28%', padding: '8px', boxSizing: 'border-box' }}
        />
      );
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = formatDateKey(year, month, d);
      const hasRecord = hasRecordOnDate(year, month, d);
      const isSelected = selectedDate === dateKey;
      const isToday = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()) === dateKey;
      const isMenstrual = menstrualDates.includes(dateKey);

      days.push(
        <div
          key={d}
          onClick={() => {
            setSelectedDate(dateKey);
            const records = getRecordsOnDate(year, month, d);
            setSelectedDateRecords(records);
          }}
          style={{
            width: '14.28%',
            padding: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: isSelected
                ? '#d32f2f'
                : isToday
                ? 'rgba(211, 47, 47, 0.3)'
                : 'transparent',
              color: isSelected
                ? '#fff'
                : isMenstrual
                ? '#ffcdd2'
                : isToday
                ? '#d32f2f'
                : '#888',
              fontWeight: isSelected ? 'bold' : isToday ? 'bold' : 'normal',
              fontSize: '14px',
            }}
          >
            {d}
          </div>
          {hasRecord && !isSelected && (
            <div
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#d32f2f',
              }}
            />
          )}
        </div>
      );
    }

    return days;
  };

  const groupedHistory = history.reduce((acc, item) => {
    if (!item.date) return acc;
    const parts = normalizeDateStr(item.date).split('-');
    if (parts.length < 2) return acc;
    const year = parseInt(parts[0]);
    const monthIdx = parseInt(parts[1]) - 1;
    const monthKey = formatYearMonth(year, monthIdx, t);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  const handleDeleteRecord = (recordId) => {
    if (window.confirm(t('history.deleteConfirm') || '确定要删除这条记录吗？')) {
      const updatedHistory = history.filter((h) => h.id !== recordId);
      setHistory(updatedHistory);
      localStorage.setItem('painscape_history', JSON.stringify(updatedHistory));
      setSelectedDateRecords((prev) => prev.filter((h) => h.id !== recordId));
      if (viewingDiary && viewingDiary.id === recordId) {
        setViewingDiary(null);
      }
      showToast('recordDeleted');
    }
  };

  const getWeekDays = () => {
    const sun = t('history.sun') || '日';
    const mon = t('history.mon') || '一';
    const tue = t('history.tue') || '二';
    const wed = t('history.wed') || '三';
    const thu = t('history.thu') || '四';
    const fri = t('history.fri') || '五';
    const sat = t('history.sat') || '六';
    return [sun, mon, tue, wed, thu, fri, sat];
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0a',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '20px',
        paddingBottom: '120px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          position: 'sticky',
          top: 0,
          background: '#0a0a0a',
          zIndex: 10,
          paddingBottom: '10px',
        }}
      >
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>
          {t('history.title')}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 🌐 语言一键切换按钮 */}
          {setTargetLanguage && (
            <button
              onClick={() => setTargetLanguage(isEn ? 'zh' : 'en')}
              style={{
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              🌐 {isEn ? '简体中文' : 'English'}
            </button>
          )}

          <button
            onClick={exportHistoryPDF}
            style={{
              padding: '6px 12px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t('history.export')}
          </button>
          <button
            onClick={onBack}
            style={{
              padding: '6px 12px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {t('history.back')}
          </button>
        </div>
      </div>

      <TrendSummary history={history} t={t} />

      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() =>
              setCalendarDate(
                new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
              )
            }
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 12px',
            }}
          >
            ‹
          </button>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
            {formatYearMonth(calendarDate.getFullYear(), calendarDate.getMonth(), t)}
          </span>
          <button
            onClick={() =>
              setCalendarDate(
                new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
              )
            }
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 12px',
            }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'flex', marginBottom: '12px' }}>
          {getWeekDays().map((day) => {
            const isWeekend = day === (t('history.sun') || '日') || day === (t('history.sat') || '六') || day === 'Sun' || day === 'Sat';
            return (
              <div
                key={day}
                style={{
                  width: '14.28%',
                  textAlign: 'center',
                  color: isWeekend ? '#d32f2f' : '#666',
                  fontSize: '12px',
                  fontWeight: isWeekend ? 'bold' : 'normal',
                }}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderCalendar()}</div>
      </div>

      {selectedDate && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>
            📅 {t('history.recordsOfDate', { date: selectedDate }) || `Records for ${selectedDate}`}
          </h3>
          {selectedDateRecords.length === 0 ? (
            <div
              style={{
                background: '#1c1c1c',
                padding: '30px 20px',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px',
              }}
            >
              🌱 {t('history.noRecordThisDay')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDateRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setViewingDiary(record)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1c1c1c',
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'transform 0.1s, background 0.2s',
                    border: '1px solid #333',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1c1c')}
                >
                  <img
                    src={record.img}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      background: '#000',
                    }}
                    alt="pain map"
                  />
                  <div style={{ marginLeft: '12px', flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                      {getPainNameDisplay(record, t)}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      {record.time}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecord(record.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background 0.2s, color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(244,67,54,0.1)';
                      e.currentTarget.style.color = '#ef5350';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#666';
                    }}
                  >
                    🗑️
                  </button>
                  <span style={{ color: '#666', fontSize: '18px', marginLeft: '4px' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderTop: '1px solid #222',
              paddingTop: '20px',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: '14px', margin: 0 }}>
              📋 {t('history.allRecords')}
            </h3>
            <button
              onClick={() => setShowGroupedView(!showGroupedView)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4caf50',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {showGroupedView ? '▲ ' + (t('history.collapseLabel') || 'Collapse') : '▼ ' + (t('history.expandLabel') || 'Expand')}
            </button>
          </div>

          {showGroupedView &&
            Object.entries(groupedHistory).map(([month, records]) => (
              <div key={month} style={{ marginBottom: '16px' }}>
                <div
                  onClick={() => toggleMonth(month)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#151515',
                    borderRadius: '10px',
                    borderLeft: `3px solid ${
                      collapsedMonths[month] ? '#666' : '#d32f2f'
                    }`,
                    cursor: 'pointer',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>
                    {month}
                  </span>
                  <span style={{ color: '#888', fontSize: '11px' }}>
                    {t('history.recordsCount', { count: records.length })} {collapsedMonths[month] ? '▶' : '▼'}
                  </span>
                </div>

                {!collapsedMonths[month] && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginLeft: '8px',
                    }}
                  >
                    {records.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => setViewingDiary(record)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: '#1c1c1c',
                          padding: '10px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#1c1c1c')}
                      >
                        <img
                          src={record.img}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            background: '#000',
                          }}
                          alt=""
                        />
                        <div style={{ marginLeft: '12px', flex: 1 }}>
                          <div
                            style={{
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: '500',
                            }}
                          >
                            {record.date}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#888',
                              marginTop: '2px',
                            }}
                          >
                            {getPainNameDisplay(record, t)} · {record.time}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(record.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#555',
                            fontSize: '13px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            transition: 'background 0.2s, color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(244,67,54,0.1)';
                            e.currentTarget.style.color = '#ef5350';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#555';
                          }}
                        >
                          🗑️
                        </button>
                        <span style={{ color: '#555', marginLeft: '4px' }}>›</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {history.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: '#555',
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📖</div>
          <p style={{ fontSize: '15px', color: '#666' }}>{t('history.empty')}</p>
        </div>
      )}

      {/* 记录详情弹窗组件 */}
      <RecordDetailModal
        viewingDiary={viewingDiary}
        onClose={() => setViewingDiary(null)}
        onDelete={handleDeleteRecord}
        t={t}
        lang={lang}
      />
    </div>
  );
}