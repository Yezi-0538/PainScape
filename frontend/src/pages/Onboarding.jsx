// src/pages/OnboardingPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n/i18nContext';
import OnboardingTooltip from '../Components/OnboardingTooltip';
import PersonalProfileModal from '../Components/modals/PersonalProfileModal';
import PeriodScienceFullPage from '../Components/PeriodScienceFullPage';

// 子组件：可折叠多选下拉框
const CollapsibleMultiSelect = ({ label, options, selectedValues, onChange, placeholder }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSelect = (value) => {
    const current = selectedValues || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange(next);
  };

  const displayText = selectedValues?.length > 0
    ? `${selectedValues.length} ${t('common.itemsSelected') || '项已选'}`
    : placeholder || t('common.pleaseSelect') || '请选择';

  return (
    <div style={{ position: 'relative', marginBottom: '12px', width: '100%' }}>
      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div
        onClick={toggleOpen}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '10px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          minHeight: '40px',
        }}
      >
        <span style={{ color: selectedValues?.length > 0 ? '#fff' : '#888' }}>{displayText}</span>
        <span style={{ color: '#888', fontSize: '11px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            background: '#1a1a1a',
            border: '1.5px solid #444',
            borderRadius: '10px',
            padding: '6px 0',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '8px 12px',
                color: selectedValues?.includes(opt.value) ? '#d32f2f' : '#ccc',
                fontSize: '12px',
                cursor: 'pointer',
                background: selectedValues?.includes(opt.value) ? 'rgba(211,47,47,0.08)' : 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedValues?.includes(opt.value)
                  ? 'rgba(211,47,47,0.08)'
                  : 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 子组件：可折叠单选下拉框
const CollapsibleSingleSelect = ({ label, options, selectedValue, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSelect = (value) => {
    onChange(value);
    setIsOpen(false);
  };

  const selectedLabel = options.find((opt) => opt.value === selectedValue)?.label || '';
  const displayText = selectedValue ? selectedLabel : placeholder || '请选择';

  return (
    <div style={{ position: 'relative', marginBottom: '12px', width: '100%' }}>
      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div
        onClick={toggleOpen}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '10px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          minHeight: '40px',
        }}
      >
        <span style={{ color: selectedValue ? '#fff' : '#888' }}>{displayText}</span>
        <span style={{ color: '#888', fontSize: '11px' }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            background: '#1a1a1a',
            border: '1.5px solid #444',
            borderRadius: '10px',
            padding: '6px 0',
            maxHeight: '180px',
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              style={{
                padding: '8px 12px',
                color: selectedValue === opt.value ? '#d32f2f' : '#ccc',
                fontSize: '12px',
                cursor: 'pointer',
                background: selectedValue === opt.value ? 'rgba(211,47,47,0.08)' : 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedValue === opt.value
                  ? 'rgba(211,47,47,0.08)'
                  : 'transparent';
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function OnboardingPage({
  // 导航
  onBack,
  onStartDrawing,
  onSkip,
  onCommunity,
  onHistory,
  onProfile,
  onQuickLog,
  onOpenHealing,

  // App 模式
  appMode,
  setAppMode,

  // 显示内容
  showContent,
  setShowContent,

  // 医疗背景
  medicalBackground,
  setMedicalBackground,

  // 用户偏好
  userPrefs,
  setUserPrefs,

  // 语气偏好
  tonePreference,
  setTonePreference,

  // 周期
  cycleDay,
  setCycleDay,

  // 身体模式
  setBodyMode,

  // 语言
  targetLanguage,
  setTargetLanguage,

  // 其他
  showGuide,
  setShowGuide,
}) {
  const { t } = useI18n();
  const [tooltipStep, setTooltipStep] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const containerRef = useRef(null);
  const [showFullScience, setShowFullScience] = useState(false);
  // 用户自建科普数据持久化（与 ResultPage 共享同一缓存）
  const [userTips, setUserTips] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('painscape_user_period_tips') || '[]');
    } catch {
      return [];
    }
  });

  const handleUserTipsChange = (newTips) => {
    setUserTips(newTips);
    localStorage.setItem('painscape_user_period_tips', JSON.stringify(newTips));
  };

  useEffect(() => {
    if (['basicInfo', 'preference'].includes(showContent)) {
      setTooltipStep(showContent);
    }
  }, [showContent]);

  // 滚动到顶部的函数
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 切换到基础信息页
  const goToBasicInfo = () => {
    setShowContent('basicInfo');
    setTimeout(scrollToTop, 100);
  };

  // 切换到偏好页
  const goToPreference = () => {
    setShowContent('preference');
    setTimeout(scrollToTop, 100);
  };

  // 或者通用的切换函数
  const switchContent = (page) => {
    setShowContent(page);
    setTimeout(scrollToTop, 100);
  };
  const togglePref = (key) => {
    if (key === 'alone') {
      setUserPrefs(['alone']);
    } else {
      const next = userPrefs.filter((p) => p !== 'alone');
      if (next.includes(key)) {
        setUserPrefs(next.filter((p) => p !== key));
      } else {
        setUserPrefs([...next, key]);
      }
      if (next.length === 0) setUserPrefs(['care']);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        pointerEvents: 'auto',
        background: '#0a0a0a',
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'var(--space-xl)',
        paddingBottom: '120px',
        boxSizing: 'border-box',
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
      }}
    >
      {/* 模式切换 Tabs */}
      <div
        style={{
          display: 'flex',
          background: '#141414',
          borderRadius: 'var(--radius-lg)',
          padding: '3px',
          width: '100%',
          maxWidth: '320px',
          border: '1px solid #2d2d2d',
          boxSizing: 'border-box',
          marginTop: '10px',
          marginBottom: '10px',
        }}
      >
        <button
          onClick={() => {
            setAppMode('medical');
            setShowContent('basicInfo');
          }}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            background: appMode === 'medical' ? '#d32f2f' : 'transparent',
            color: appMode === 'medical' ? '#fff' : '#666',
            transition: 'all 0.2s',
          }}
        >
          🏥 {t('modeSelection.medicalTab')}
        </button>
        <button
          onClick={() => {
            setAppMode('general');
            setBodyMode('front');
            setShowContent('preference');
          }}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            background: appMode === 'general' ? '#4caf50' : 'transparent',
            color: appMode === 'general' ? '#fff' : '#666',
            transition: 'all 0.2s',
          }}
        >
          🎨 {t('modeSelection.generalTab')}
        </button>
      </div>

      {/* 帮助指引按钮 */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
        <button
          onClick={() => setShowGuide(!showGuide)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#888',
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            borderRadius: '50%',
            fontSize: 'var(--text-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ?
        </button>
        {showGuide && (
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '0',
              background: 'rgba(20,20,20,0.97)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xl)',
              width: '260px',
              backdropFilter: 'blur(20px)',
              zIndex: 200,
            }}
          >
            <p style={{ color: '#eee', fontSize: 'var(--text-base)', fontWeight: 'bold', margin: '0 0 12px 0' }}>
              {t('onboarding.guideTitle')}
            </p>
            {t('onboarding.guideItems').map(([title, desc], idx) => (
              <div key={idx} style={{ marginBottom: '8px' }}>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{title}</span>
                <p style={{ color: '#888', fontSize: '11px', margin: '2px 0 0 0' }}>{desc}</p>
              </div>
            ))}
            <button
              onClick={() => setShowGuide(false)}
              style={{
                marginTop: '8px',
                width: '100%',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#666',
                padding: '6px',
                borderRadius: '10px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {t('onboarding.gotIt')}
            </button>
          </div>
        )}
      </div>

      <h1 style={{ color: '#fff', marginBottom: '5px', fontSize: '2rem', marginTop: '20px' }}>
        PainScape
      </h1>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>{t('app.subtitle')}</p>

      {/* 操作指引 Tooltip */}
      {tooltipStep && (
        <OnboardingTooltip
          step={tooltipStep}
          onClose={() => setTooltipStep(null)}
        />
      )}

      {/* 主表单内容区域 */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* ===== STEP 1: 基础信息 (合并与精简后的第1页) ===== */}
        {showContent === 'basicInfo' && appMode !== 'general' && (
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              border: '1px solid #333',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>📋</span>
              <h3
                style={{
                  color: '#fff',
                  fontSize: 'var(--text-md)',
                  margin: '8px 0 4px 0',
                  fontWeight: '500',
                }}
              >
                {t('onboarding.basicInfoTitle') || '基础信息'}
              </h3>
              <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>
                {t('onboarding.basicInfoDesc') || '采集本次痛经动态指标，辅助精准诊断'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. 近期活动负荷 */}
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.recentActivityLevelLabel') || '近期活动负荷'}
                </label>
                <select
                  value={medicalBackground.activityLevel || ''}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, activityLevel: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                  }}
                >
                  {Object.entries(t('onboarding.activityOptions') || {}).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. 近期习惯 & 3. 近期压力状况 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <CollapsibleMultiSelect
                  label={t('onboarding.recentLifestyleTitle') || '近期习惯'}
                  options={[
                    { value: 'normal', label: t('onboarding.lifestyleNormal') },
                    { value: 'sleepShort', label: t('onboarding.lifestyleSleepShort') },
                    { value: 'sleepIrregular', label: t('onboarding.lifestyleSleepIrregular') },
                    { value: 'smoking', label: t('onboarding.lifestyleSmoking') },
                    { value: 'alcohol', label: t('onboarding.lifestyleAlcohol') },
                    { value: 'caffeine', label: t('onboarding.lifestyleCaffeine') },
                    { value: 'coldFood', label: t('onboarding.lifestyleColdFood') },
                    { value: 'spicy', label: t('onboarding.lifestyleSpicy') },
                    { value: 'weightLoss', label: t('onboarding.lifestyleWeightLoss') },
                  ]}
                  selectedValues={medicalBackground.lifestyleArr || []}
                  onChange={(newValues) =>
                    setMedicalBackground({ ...medicalBackground, lifestyleArr: newValues })
                  }
                  placeholder={t('onboarding.pleaseSelect') || '未选择'}
                />
                <CollapsibleSingleSelect
                  label={t('onboarding.recentPsychosocialLabel') || '近期压力状况 (可选)'}
                  options={[
                    { value: 'lowStress', label: t('onboarding.psychosocialOptions.lowStress') },
                    { value: 'moderateStress', label: t('onboarding.psychosocialOptions.moderateStress') },
                    { value: 'highStress', label: t('onboarding.psychosocialOptions.highStress') },
                    { value: 'trauma', label: t('onboarding.psychosocialOptions.trauma') },
                  ]}
                  selectedValue={medicalBackground.psychosocial || ''}
                  onChange={(value) =>
                    setMedicalBackground({ ...medicalBackground, psychosocial: value })
                  }
                  placeholder={t('onboarding.pleaseSelect') || '未选择'}
                />
              </div>

              {/* 4. 末次月经第一天 (LMP) */}
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.lmpLabel') || '末次月经第一天 (LMP)'}
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="date"
                    className="dark-date-input"
                    value={medicalBackground.lastPeriod || ''}
                    onChange={(e) =>
                      setMedicalBackground({ ...medicalBackground, lastPeriod: e.target.value })
                    }
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === 'function') {
                          e.target.showPicker();
                        }
                      } catch (err) {
                        console.warn('showPicker not supported', err);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-md)',
                      background: '#111',
                      color: '#fff',
                      border: '1.5px solid #333',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                  />
                </div>
                <style>{`
                  .dark-date-input::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    cursor: pointer;
                    opacity: 0.8;
                    padding: 4px;
                  }
                  .dark-date-input {
                    color-scheme: dark;
                  }
                `}</style>
              </div>

              {/* 5. 当前处于什么时期 */}
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                  {t('onboarding.cyclePeriodLabel') || '当前处于什么时期'}
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    t('onboarding.cyclePeriods.pre') || '月经前期',
                    t('onboarding.cyclePeriods.menstrual') || '月经期',
                    t('onboarding.cyclePeriods.post') || '月经后期',
                    t('onboarding.cyclePeriods.ovulation') || '排卵期',
                  ].map((item) => (
                    <button
                      key={item}
                      onClick={() => setCycleDay(cycleDay === item ? '' : item)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-lg)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: cycleDay === item ? '#d32f2f' : '#111',
                        color: cycleDay === item ? '#fff' : '#888',
                        border: cycleDay === item ? 'none' : '1.5px solid #333',
                        transition: 'all 0.2s',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. 伴随症状 (可多选) */}
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}>
                  {t('onboarding.accompanyingLabel') || '伴随症状 (可多选)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(
                    t('onboarding.accompanyingOptions', { returnObjects: true }) || {}
                  ).map(([key, label]) => {
                    const isChecked = (medicalBackground.accompanyingSymptomsArr || []).includes(key);
                    return (
                      <label
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px',
                          background: isChecked ? 'rgba(211,47,47,0.1)' : '#111',
                          border: isChecked ? '1px solid #d32f2f' : '1px solid #333',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: isChecked ? '#fff' : '#888',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const current = medicalBackground.accompanyingSymptomsArr || [];
                            const next = current.includes(key)
                              ? current.filter((v) => v !== key)
                              : [...current, key];
                            setMedicalBackground({
                              ...medicalBackground,
                              accompanyingSymptomsArr: next,
                            });
                          }}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 7. 其他症状 (请填写) */}
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  {t('onboarding.accompanyingOther') || '其他症状 (请填写)'}
                </label>
                <input
                  type="text"
                  placeholder={t('onboarding.accompanyingOtherPlaceholder') || '例如：嗜睡、心慌、背痛...'}
                  value={medicalBackground.accompanyingOther || ''}
                  onChange={(e) =>
                    setMedicalBackground({
                      ...medicalBackground,
                      accompanyingOther: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 8. 个人档案弹窗触发按钮 */}
              <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #282828' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px dashed #555',
                    borderRadius: '10px',
                    color: '#ccc',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d32f2f';
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.background = 'rgba(211, 47, 47, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#555';
                    e.currentTarget.style.color = '#ccc';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📋</span>
                  <span style={{ fontWeight: '500' }}>
                    {t('onboarding.openProfileModalBtn') || '完善个人档案 (常态生理/病史/过敏等)'}
                  </span>
                  <span style={{ color: '#888', fontSize: '11px', marginLeft: 'auto' }}>›</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 2: 干预偏好 (原第3页) ===== */}
        {showContent === 'preference' && (
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-xl)',
              border: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '28px' }}>🎯</span>
              <h3
                style={{
                  color: '#fff',
                  fontSize: 'var(--text-md)',
                  margin: '8px 0 4px 0',
                  fontWeight: '500',
                }}
              >
                {t('onboarding.preferenceTitle') || '干预偏好'}
              </h3>
            </div>

            <div>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                {t('onboarding.preferenceHint')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['alone', 'care', 'comfort'].map((p, i) => (
                  <button
                    key={p}
                    onClick={() => togglePref(p)}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      textAlign: 'center',
                      background: userPrefs.includes(p) ? 'rgba(211, 47, 47, 0.1)' : '#111',
                      border: userPrefs.includes(p) ? '1.5px solid #d32f2f' : '1.5px solid #333',
                      color: userPrefs.includes(p) ? '#fff' : '#888',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '13px',
                      fontWeight: userPrefs.includes(p) ? 'bold' : 'normal',
                    }}
                  >
                    {t(`onboarding.preferences.${i}.title`)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2d2d2d', paddingTop: '16px' }}>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                {t('onboarding.toneTitle')}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setTonePreference('gentle')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: tonePreference === 'gentle' ? 'rgba(76, 175, 80, 0.15)' : '#111',
                    color: tonePreference === 'gentle' ? '#fff' : '#888',
                    border: tonePreference === 'gentle' ? '1.5px solid #4caf50' : '1.5px solid #333',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('onboarding.toneGentle')}
                </button>
                <button
                  onClick={() => setTonePreference('direct')}
                  style={{
                    flex: 1,
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    background: tonePreference === 'direct' ? 'rgba(33, 150, 243, 0.15)' : '#111',
                    color: tonePreference === 'direct' ? '#fff' : '#888',
                    border: tonePreference === 'direct' ? '1.5px solid #2196f3' : '1.5px solid #333',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('onboarding.toneDirect')}
                </button>
              </div>
              <p style={{ color: '#555', fontSize: '11px', marginTop: '8px', textAlign: 'center', lineHeight: '1.4' }}>
                {t('onboarding.toneHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2 步导航指示器（医疗模式下）- 修复椭圆 */}
      {appMode !== 'general' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'clamp(12px, 4vw, 20px)',
            marginTop: 'clamp(16px, 3vw, 24px)',
            width: '100%',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            paddingTop: 'clamp(14px, 3vw, 20px)',
          }}
        >
          {[
            { key: 'basicInfo', label: '1' },
            { key: 'preference', label: '2' },
          ].map((step, index) => {
            const isActive = showContent === step.key;
            const isCompleted = index === 0 && showContent === 'preference';

            return (
              <button
                key={step.key}
                onClick={() => {
                  setShowContent(step.key);
                  setTimeout(scrollToTop, 50);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  minWidth: '38px',
                  minHeight: '38px',
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  lineHeight: 1,
                  background: isActive
                    ? 'linear-gradient(135deg, #d32f2f, #c62828)'
                    : isCompleted
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#fff' : isCompleted ? '#4caf50' : '#555',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : isCompleted ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: isActive
                    ? '0 4px 20px rgba(211, 47, 47, 0.3)'
                    : isCompleted
                      ? '0 0 0 2px rgba(76, 175, 80, 0.2)'
                      : 'none',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  position: 'relative',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = isCompleted
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = isCompleted ? '#66bb6a' : '#aaa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = isCompleted
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = isCompleted ? '#4caf50' : '#555';
                  }
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.92)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
                }}
                title={step.key === 'basicInfo'
                  ? (t('onboarding.step1') || '基础信息')
                  : (t('onboarding.step2') || '干预偏好')
                }
              >
                {isCompleted ? (
                  // ✅ 用 SVG 代替 ✓ 字符，保证正方形
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: 'block' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.label
                )}

                {/* 连接线 */}
                {index === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '-18px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '2px',
                      background: isCompleted || isActive
                        ? 'linear-gradient(90deg, #4caf50, #d32f2f)'
                        : 'rgba(255,255,255,0.06)',
                      borderRadius: '2px',
                      transition: 'all 0.5s ease',
                      flexShrink: 0,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 底部操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px',
          width: '100%',
          maxWidth: '480px',
          justifyContent: 'center',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        {appMode !== 'general' && showContent === 'basicInfo' && (
          <>
            <button
              onClick={() => {
                onBack?.();
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'transparent',
                border: '1px solid #444',
                color: '#888',
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                fontWeight: '500',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                transition: 'all 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#ccc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#888';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {t('common.back') || '返回'}
            </button>
            <button
              onClick={() => {
                setShowContent('preference');
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 2,
                padding: '14px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #d32f2f, #c62828)',
                border: 'none',
                color: '#fff',
                fontSize: 'clamp(14px, 3.8vw, 17px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                boxShadow: '0 4px 16px rgba(211, 47, 47, 0.25)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(211, 47, 47, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(211, 47, 47, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {t('onboarding.nextStep') || '下一步 →'}
            </button>
          </>
        )}

        {appMode !== 'general' && showContent === 'preference' && (
          <>
            <button
              onClick={() => {
                setShowContent('basicInfo');
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'transparent',
                border: '1px solid #444',
                color: '#888',
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                fontWeight: '500',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                transition: 'all 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#ccc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#888';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {t('common.back') || '返回'}
            </button>

            <button
              onClick={() => {
                onStartDrawing?.();
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 2,
                padding: '14px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #43a047, #2e7d32)',
                border: 'none',
                color: '#fff',
                fontSize: 'clamp(14px, 3.8vw, 17px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.25)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(76, 175, 80, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {t('onboarding.startDrawing') || '开始绘制 ✨'}
            </button>
          </>
        )}

        {appMode === 'general' && (
          <>
            <button
              onClick={() => {
                setShowContent('preference');
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #444',
                color: '#888',
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                fontWeight: '500',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                transition: 'all 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666';
                e.currentTarget.style.color = '#ccc';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444';
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {t('common.back') || '返回'}
            </button>
            
            {/* 进入自愈舱按钮 */}
            <button
              onClick={() => onOpenHealing?.()}
              style={{
                flex: 1.3,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #1e88e5, #1565c0)',
                border: 'none',
                color: '#fff',
                fontSize: 'clamp(13px, 3.5vw, 16px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                boxShadow: '0 4px 16px rgba(33, 150, 243, 0.25)',
                transition: 'all 0.25s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
               e.currentTarget.style.boxShadow = '0 4px 16px rgba(33, 150, 243, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {t('onboarding.enterHealing') || '进入自愈舱'}
            </button>

            <button
              onClick={() => {
                onStartDrawing?.();
                setTimeout(scrollToTop, 50);
              }}
              style={{
                flex: 2,
                padding: '14px 20px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #43a047, #2e7d32)',
                border: 'none',
                color: '#fff',
                fontSize: 'clamp(14px, 3.8vw, 17px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: 'var(--btn-min-touch)',
                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.25)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitTapHighlightColor: 'transparent',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(76, 175, 80, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(76, 175, 80, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {t('onboarding.startDrawing')}
            </button>
          </>
        )}
        {/* ✅ 新增：跳过按钮 - 在所有模式下都显示（除了偏好设置页） */}
        {appMode !== 'general' && showContent === 'basicInfo' && (
          <button
            onClick={() => {
              if (onSkip) {
                onSkip();
              }
            }}
            style={{
              flex: 0.8,
              padding: '14px 12px',
              borderRadius: 'var(--radius-lg)',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#555',
              fontSize: 'clamp(12px, 3vw, 14px)',
              fontWeight: '400',
              cursor: 'pointer',
              minHeight: 'var(--btn-min-touch)',
              transition: 'all 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.opacity = '0.7';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {t('onboarding.skipAndDraw') || '跳过 → 直接绘制'}
          </button>
        )}
      </div>

      {/* 科普入口文字 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginTop: '16px',
          marginBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setShowFullScience(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '16px',
            transition: 'all 0.2s ease',
            letterSpacing: '0.3px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef5350';
            e.currentTarget.style.background = 'rgba(239, 83, 80, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#999';
            e.currentTarget.style.background = 'none';
          }}
        >
          <span>💡</span>
          <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            {t('onboarding.learnMyPeriod') || (targetLanguage === 'en' ? 'Learn about my period' : '了解我的经期')}
          </span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>›</span>
        </button>
      </div>

      {/* 页脚导航链接 */}
      <footer
        style={{
          marginTop: '40px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '16px',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <button
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', padding: '6px 10px' }}
          onClick={onCommunity}
        >
          {t('onboarding.exploreCommunity')}
        </button>
        <button
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', padding: '6px 10px' }}
          onClick={onHistory}
        >
          {t('onboarding.painDiary')}
        </button>
        <button
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer', padding: '6px 10px' }}
          onClick={onProfile}
        >
          {t('onboarding.myProfile')}
        </button>
        <button
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#888',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 12px',
            borderRadius: '14px',
          }}
          onClick={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
        >
          {targetLanguage === 'zh' ? 'English' : '中文'}
        </button>
      </footer>

      {/* 快速记录底部悬浮入口 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          width: '88%',
          maxWidth: 'var(--container-sm)',
        }}
      >
        <button
          onClick={() => onQuickLog?.()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 20px',
            background: 'rgba(211, 47, 47, 0.08)',
            border: '1px solid rgba(211, 47, 47, 0.2)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚡</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#e57373', fontSize: '13px', fontWeight: '600' }}>
              {t('quickLog.entry')}
            </div>
            <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
              {t('quickLog.entryHint')}
            </div>
          </div>
          <span style={{ color: '#d32f2f', fontSize: '14px', marginLeft: 'auto' }}>→</span>
        </button>
      </div>

      {/* 个人档案弹窗 */}
      <PersonalProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        medicalBackground={medicalBackground}
        setMedicalBackground={setMedicalBackground}
      />

      {/* 全屏经期科普界面 */}
      {showFullScience && (
        <PeriodScienceFullPage
          onBack={() => setShowFullScience(false)}
          userTips={userTips}
          onUserTipsChange={handleUserTipsChange}
        />
      )}
    </div>
  );
}