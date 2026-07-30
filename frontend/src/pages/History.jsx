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

// ============================================================
// 子组件：趋势摘要
// ============================================================
const TrendSummary = ({ history, t }) => {
  if (history.length < 2) return null;

  const recent = history.slice(0, 5);
  const typeFreq = recent.reduce((acc, r) => {
    acc[r.painName] = (acc[r.painName] || 0) + 1;
    return acc;
  }, {});
  const sortedTypes = Object.entries(typeFreq).sort((a, b) => b[1] - a[1]);
  const dominant = sortedTypes.length > 0 ? sortedTypes[0] : ['未知', 0];

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
            {dominant[0]}
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
// 主组件
// ============================================================
export default function HistoryPage({
  // 导航
  onBack,

  // 数据
  history,
  setHistory,

  // 日历
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

  // 查看日记
  viewingDiary,
  setViewingDiary,

  // 工具
  exportHistoryPDF,
  showToast,
}) {
    const { t } = useI18n(); 
  const [collapsedMonths, setCollapsedMonths] = useState({});

  const toggleMonth = (month) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [month]: !prev[month],
    }));
  };

  // ===== 日历渲染 =====
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

  // ===== 分组历史 =====
  const groupedHistory = history.reduce((acc, item) => {
    if (!item.date) return acc;
    const parts = normalizeDateStr(item.date).split('-');
    if (parts.length < 2) return acc;
    const monthKey = `${parts[0]}年${parts[1]}月`;
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  // ===== 删除记录 =====
  const handleDeleteRecord = (recordId) => {
    if (window.confirm(t('history.deleteConfirm'))) {
      const updatedHistory = history.filter((h) => h.id !== recordId);
      setHistory(updatedHistory);
      localStorage.setItem('painscape_history', JSON.stringify(updatedHistory));
      setSelectedDateRecords((prev) => prev.filter((h) => h.id !== recordId));
      setViewingDiary(null);
      showToast('recordDeleted');
    }
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0a',
        width: '100vw',
        minHeight: '100vh',
        overflowY: 'auto',
        padding: '20px',
        paddingBottom: '100px',
        boxSizing: 'border-box',
      }}
    >
      {/* 头部 */}
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
        <div style={{ display: 'flex', gap: '12px' }}>
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

      {/* 趋势 */}
      <TrendSummary history={history} t={t} />

      {/* 日历 */}
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
            {calendarDate.getFullYear()}年 {calendarDate.getMonth() + 1}月
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
          {[
            t('history.sun') || '日',
            t('history.mon') || '一',
            t('history.tue') || '二',
            t('history.wed') || '三',
            t('history.thu') || '四',
            t('history.fri') || '五',
            t('history.sat') || '六',
          ].map((day) => (
            <div
              key={day}
              style={{
                width: '14.28%',
                textAlign: 'center',
                color: day === '日' || day === '六' ? '#d32f2f' : '#666',
                fontSize: '12px',
                fontWeight: day === '日' || day === '六' ? 'bold' : 'normal',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderCalendar()}</div>
      </div>

      {/* 选中日期记录 */}
      {selectedDate && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>
            📅 {selectedDate} 的记录
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
                      {record.painName}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      {record.time}
                    </div>
                  </div>
                  <span style={{ color: '#666', fontSize: '18px' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 全部记录 */}
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
              {showGroupedView ? '▲ 收起' : '▼ 展开'}
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
                    {records.length}条 {collapsedMonths[month] ? '▶' : '▼'}
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
                        }}
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
                            {record.painName} · {record.time}
                          </div>
                        </div>
                        <span style={{ color: '#555' }}>›</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}