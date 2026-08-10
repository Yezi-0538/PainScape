// src/pages/OnboardingPage.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { BRUSHES } from '../i18n/translationsConstants';
import OnboardingTooltip from '../Components/OnboardingTooltip';


// 子组件：可折叠多选下拉框
const CollapsibleMultiSelect = ({ label, options, selectedValues, onChange, placeholder }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = React.useRef(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSelect = (value) => {
    const current = selectedValues || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange(next);
  };

  const displayText = selectedValues?.length > 0
    ? `${selectedValues.length} ${t('common.itemsSelected')}`
    : placeholder || t('common.pleaseSelect');


  return (
    <div style={{ position: 'relative', marginBottom: '12px', width: '100%' }}>
      <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <div
        ref={triggerRef}
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
  const triggerRef = React.useRef(null);

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
        ref={triggerRef}
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

// ============================================================
// 主组件
// ============================================================
export default function OnboardingPage({
  // 导航
  onBack,
  onStartDrawing,
  onSkip,
  onCommunity,
  onHistory,
  onProfile,
  onQuickLog,

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

  useEffect(() => {
    if (['basicInfo', 'medical', 'preference'].includes(showContent)) {
      setTooltipStep(showContent);
    }
  }, [showContent]);

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
        padding: '20px',
        paddingBottom: '120px',
        boxSizing: 'border-box',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      {/* Mode toggle */}
      <div
        style={{
          display: 'flex',
          background: '#141414',
          borderRadius: '20px',
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
            borderRadius: '16px',
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
            borderRadius: '16px',
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

      {/* Help button */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
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
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
                borderRadius: '16px',
                padding: '20px',
                width: '260px',
                backdropFilter: 'blur(20px)',
                zIndex: 200,
              }}
            >
              <p
                style={{
                  color: '#eee',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  margin: '0 0 12px 0',
                }}
              >
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
      </div>

      <h1 style={{ color: '#fff', marginBottom: '5px', fontSize: '2rem', marginTop: '20px' }}>
        PainScape
      </h1>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>{t('app.subtitle')}</p>
      {/*操作指引*/}
      {tooltipStep && (
        <OnboardingTooltip
          step={tooltipStep}
          onClose={() => setTooltipStep(null)}
        />
      )}
      {/* Content area */}
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        {/* STEP 1: Basic Info */}
        {showContent === 'basicInfo' && appMode !== 'general' && (
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #333',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>📋</span>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '16px',
                  margin: '8px 0 4px 0',
                  fontWeight: '500',
                }}
              >
                {t('onboarding.basicPhysiologicalTitle')}
              </h3>
              <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>
                {t('onboarding.basicPhysiologicalDesc')}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.ageGroupLabel')}
                </label>
                <select
                  value={medicalBackground.age}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, age: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                >
                  {Object.entries(t('onboarding.ageOptions') || {}).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                    {t('onboarding.heightLabel')}
                  </label>
                  <input
                    type="number"
                    placeholder={t('onboarding.heightPlaceholder')}
                    value={medicalBackground.height}
                    onChange={(e) =>
                      setMedicalBackground({ ...medicalBackground, height: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#111',
                      color: '#fff',
                      border: '1.5px solid #333',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                    {t('onboarding.weightLabel')}
                  </label>
                  <input
                    type="number"
                    placeholder={t('onboarding.weightPlaceholder')}
                    value={medicalBackground.weight}
                    onChange={(e) =>
                      setMedicalBackground({ ...medicalBackground, weight: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#111',
                      color: '#fff',
                      border: '1.5px solid #333',
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.activityLevelLabel')}
                </label>
                <select
                  value={medicalBackground.activityLevel}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, activityLevel: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '12px',
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <CollapsibleMultiSelect
                  label={t('onboarding.lifestyleTitle') || '日常习惯'}
                  options={[
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
                  placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}
                />
                <CollapsibleSingleSelect
                  label={t('onboarding.psychosocialLabel')}
                  options={[
                    { value: 'lowStress', label: t('onboarding.psychosocialLowStress') },
                    { value: 'moderateStress', label: t('onboarding.psychosocialModerateStress') },
                    { value: 'highStress', label: t('onboarding.psychosocialHighStress') },
                    { value: 'trauma', label: t('onboarding.psychosocialTrauma') },
                  ]}
                  selectedValue={medicalBackground.psychosocial}
                  onChange={(value) =>
                    setMedicalBackground({ ...medicalBackground, psychosocial: value })
                  }
                  placeholder={t('onboarding.pleaseSelect') || '不详 / 未选择'}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Medical Background */}
        {showContent === 'medical' && appMode !== 'general' && (
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #333',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>🩺</span>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '16px',
                  margin: '8px 0 4px 0',
                  fontWeight: '500',
                }}
              >
                {t('onboarding.clinicalMedicalTitle')}
              </h3>
              <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>
                {t('onboarding.medicalHintDesc')}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Menstrual History */}
              <div
                style={{
                  background: '#131313',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1.5px solid #2d2d2d',
                }}
              >
                <h4
                  style={{
                    color: '#eee',
                    margin: '0 0 12px 0',
                    fontSize: '13px',
                    borderBottom: '1px solid #222',
                    paddingBottom: '6px',
                  }}
                >
                  {t('onboarding.menstrualHistoryTitle')}
                </h4>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                    >
                      {t('onboarding.menarcheAgeLabel')}
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="20"
                      placeholder="eg：13"
                      value={medicalBackground.menarcheAge}
                      onChange={(e) =>
                        setMedicalBackground({ ...medicalBackground, menarcheAge: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#111',
                        color: '#fff',
                        border: '1.5px solid #333',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                    >
                      {t('onboarding.cycleRegularityLabel')}
                    </label>
                    <select
                      value={medicalBackground.cycleRegular}
                      onChange={(e) =>
                        setMedicalBackground({ ...medicalBackground, cycleRegular: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: '#111',
                        color: '#fff',
                        border: '1.5px solid #333',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">{t('onboarding.cycleRegularPlaceholder')}</option>
                      <option value="regular">{t('onboarding.cycleRegularRegular')}</option>
                      <option value="irregular">{t('onboarding.cycleRegularIrregular')}</option>
                      <option value="unsure">{t('onboarding.cycleRegularUnsure')}</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                  >
                    {t('onboarding.periodDurationLabel')}
                  </label>
                  <select
                    value={medicalBackground.periodDuration || ''}
                    onChange={(e) =>
                      setMedicalBackground({ ...medicalBackground, periodDuration: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#111',
                      color: '#fff',
                      border: '1.5px solid #333',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  >
                    {Object.entries(t('onboarding.periodDurationOptions') || {}).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label
                    style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                  >
                    {t('onboarding.lmpLabel')}
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
                        padding: '12px',
                        background: '#111',
                        color: '#fff',
                        border: '1.5px solid #333',
                        borderRadius: '12px',
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

                <div>
                  <label
                    style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}
                  >
                    {t('onboarding.cyclePeriodLabel')}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      t('onboarding.cyclePeriods.pre') || '经前',
                      t('onboarding.cyclePeriods.menstrual') || '经期',
                      t('onboarding.cyclePeriods.post') || '经后',
                      t('onboarding.cyclePeriods.ovulation') || '排卵期',
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => setCycleDay(cycleDay === item ? '' : item)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: cycleDay === item ? '#d32f2f' : '#111',
                          color: cycleDay === item ? '#fff' : '#888',
                          border: cycleDay === item ? 'none' : '1.5px solid #333',
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Accompanying Symptoms */}
              <div style={{ marginTop: '16px' }}>
                <label
                  style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '8px' }}
                >
                  {t('onboarding.accompanyingLabel')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {Object.entries(
                    t('onboarding.accompanyingOptions', { returnObjects: true }) || {}
                  ).map(([key, label]) => {
                    const isChecked = (medicalBackground.accompanyingSymptomsArr || []).includes(
                      key
                    );
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

              <div>
                <label
                  style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                >
                  {t('onboarding.gynecologicalDiagnosisTitle')}
                </label>
                <select
                  value={medicalBackground.diagnosed}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, diagnosed: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                >
                  {Object.entries(t('onboarding.diagnosisOptions') || {}).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                >
                  {t('onboarding.allergyLabelFull')}
                </label>
                <select
                  value={medicalBackground.allergies}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, allergies: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#111',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                >
                  {Object.entries(t('onboarding.allergyOptions') || {}).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}
                  >
                    {t('onboarding.surgicalHistoryLabel')}
                  </label>
                  <select
                    value={medicalBackground.surgicalHistory}
                    onChange={(e) =>
                      setMedicalBackground({ ...medicalBackground, surgicalHistory: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: '#111',
                      color: '#fff',
                      border: '1.5px solid #333',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  >
                    {Object.entries(t('onboarding.surgicalHistoryOptions') || {}).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <CollapsibleMultiSelect
                  label={t('onboarding.familyHistoryLabelFull')}
                  options={[
                    { value: 'mother', label: t('onboarding.familyHistoryMother') },
                    { value: 'sister', label: t('onboarding.familyHistorySister') },
                    { value: 'none', label: t('onboarding.familyHistoryNone') },
                    { value: 'unknown', label: t('onboarding.familyHistoryUnknown') },
                  ]}
                  selectedValues={medicalBackground.familyHistoryArr || []}
                  onChange={(newValues) =>
                    setMedicalBackground({ ...medicalBackground, familyHistoryArr: newValues })
                  }
                  placeholder={t('onboarding.familyHistoryPlaceholder')}
                />
              </div>

              <CollapsibleMultiSelect
                label={t('onboarding.reproductiveHistoryLabelFull')}
                options={[
                  { value: 'nulliparous', label: t('onboarding.reproductiveHistoryNulliparous') },
                  { value: 'pregnant', label: t('onboarding.reproductiveHistoryPregnant') },
                  { value: 'parous', label: t('onboarding.reproductiveHistoryParous') },
                  {
                    value: 'spontaneousAbortion',
                    label: t('onboarding.reproductiveHistorySpontaneousAbortion'),
                  },
                  {
                    value: 'inducedAbortion',
                    label: t('onboarding.reproductiveHistoryInducedAbortion'),
                  },
                ]}
                selectedValues={medicalBackground.reproductiveHistoryArr || []}
                onChange={(newValues) =>
                  setMedicalBackground({
                    ...medicalBackground,
                    reproductiveHistoryArr: newValues,
                  })
                }
                placeholder={t('onboarding.familyHistoryPlaceholder')}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Preferences */}
        {showContent === 'preference' && (
          <div
            style={{
              background: '#1c1c1c',
              borderRadius: '20px',
              padding: '20px',
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
                  fontSize: '16px',
                  margin: '8px 0 4px 0',
                  fontWeight: '500',
                }}
              >
                {t('onboarding.step3')}
              </h3>
            </div>

            <div>
              <p
                style={{
                  color: '#888',
                  fontSize: '12px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
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
              <p
                style={{
                  color: '#888',
                  fontSize: '12px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}
              >
                {t('onboarding.toneTitle')}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setTonePreference('gentle')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
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
                    padding: '12px',
                    borderRadius: '12px',
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
              <p
                style={{
                  color: '#555',
                  fontSize: '11px',
                  marginTop: '8px',
                  textAlign: 'center',
                  lineHeight: '1.4',
                }}
              >
                {t('onboarding.toneHint')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation - Medical mode */}
      {appMode !== 'general' && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '30px',
            width: '100%',
            borderTop: '1px solid #222',
            paddingTop: '20px',
          }}
        >
          {[
            { key: 'basicInfo', label: '1', title: t('onboarding.basicInfoTitle') || '基础档案' },
            { key: 'medical', label: '2', title: t('onboarding.medicalTitle') || '医疗背景' },
            { key: 'preference', label: '3', title: t('onboarding.preferenceTitle') || '干预偏好' },
          ].map((step) => (
            <button
              key={step.key}
              onClick={() => setShowContent(step.key)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: showContent === step.key ? '2px solid #d32f2f' : '1px solid #444',
                background: showContent === step.key ? 'rgba(211, 47, 47, 0.15)' : 'transparent',
                color: showContent === step.key ? '#fff' : '#666',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              title={step.title}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
          width: '100%',
        }}
      >
        {appMode === 'medical' && showContent !== 'preference' ? (
          <button
            onClick={() => {
              if (showContent === 'basicInfo') setShowContent('medical');
              else if (showContent === 'medical') setShowContent('preference');
            }}
            style={{
              width: '200px',
              padding: '14px',
              background: '#1f1f1f',
              color: '#eee',
              border: '1px solid #333',
              borderRadius: '30px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s',
            }}
          >
            {t('onboarding.nextStep') || '下一步'}
          </button>
        ) : (
          <button
            onClick={onStartDrawing}
            style={{
              width: '200px',
              padding: '14px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '30px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px',
              boxShadow: '0 4px 15px rgba(211, 47, 47, 0.3)',
              transition: 'transform 0.1s',
            }}
          >
            {t('onboarding.startDrawing')}
          </button>
        )}

        {appMode === 'medical' && showContent !== 'preference' && (
          <button
            onClick={onSkip}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '4px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
          >
            {t('onboarding.skipAndDraw') || '跳过配置，直接绘制'}
          </button>
        )}
      </div>

      {/* ===== Footer ===== */}
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
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 'var(--text-sm, 12px)',
            cursor: 'pointer',
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
          }}
          onClick={onCommunity}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
        >
          {t('onboarding.exploreCommunity')}
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 'var(--text-sm, 12px)',
            cursor: 'pointer',
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
          }}
          onClick={onHistory}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
        >
          {t('onboarding.painDiary')}
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 'var(--text-sm, 12px)',
            cursor: 'pointer',
            padding: '6px 10px',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
          }}
          onClick={onProfile}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
        >
          {t('onboarding.myProfile')}
        </button>
        <button
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#888',
            fontSize: 'var(--text-sm, 12px)',
            cursor: 'pointer',
            padding: '4px 12px',
            borderRadius: '14px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          onClick={() => setTargetLanguage(targetLanguage === 'zh' ? 'en' : 'zh')}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#ccc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = '#888';
          }}
        >
          {targetLanguage === 'zh'
            ? t('onboarding.english') || 'English'
            : t('onboarding.chinese') || '中文'}
        </button>
      </footer>
      {/* 快速记录入口 - 底部独立条幅 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          width: '88%',
          maxWidth: '380px',
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
            borderRadius: '16px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(211, 47, 47, 0.14)';
            e.currentTarget.style.borderColor = 'rgba(211, 47, 47, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(211, 47, 47, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(211, 47, 47, 0.2)';
          }}
        >
          {/* 闪电图标 */}
          <span style={{ fontSize: '18px' }}>⚡</span>

          {/* 文字 */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: '#e57373', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>
              {t('quickLog.entry')}
            </div>
            <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
              {t('quickLog.entryHint')}
            </div>
          </div>

          {/* 箭头 */}
          <span style={{ color: '#d32f2f', fontSize: '14px', marginLeft: 'auto' }}>→</span>
        </button>
      </div>
      {/* {tooltipStep && (
        <OnboardingTooltip
          step={tooltipStep}
          onClose={() => setTooltipStep(null)}
        />
      )} */}

    </div>

  );
}