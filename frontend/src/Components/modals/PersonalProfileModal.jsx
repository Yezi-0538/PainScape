// src/Components/modals/PersonalProfileModal.jsx
import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

// 子组件：多选下拉框
const ModalMultiSelect = ({ label, options, selectedValues, onChange, placeholder }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '8px',
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
            borderRadius: '8px',
            padding: '6px 0',
            maxHeight: '160px',
            overflowY: 'auto',
            zIndex: 300,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
                background: selectedValues?.includes(opt.value) ? 'rgba(211,47,47,0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedValues?.includes(opt.value)
                  ? 'rgba(211,47,47,0.1)'
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

// 子组件：单选下拉框
const ModalSingleSelect = ({ label, options, selectedValue, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#111',
          color: '#fff',
          border: '1.5px solid #333',
          borderRadius: '8px',
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
            borderRadius: '8px',
            padding: '6px 0',
            maxHeight: '160px',
            overflowY: 'auto',
            zIndex: 300,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
                background: selectedValue === opt.value ? 'rgba(211,47,47,0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#252525')}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedValue === opt.value
                  ? 'rgba(211,47,47,0.1)'
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

export default function PersonalProfileModal({
  isOpen,
  onClose,
  medicalBackground,
  setMedicalBackground,
}) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          border: '1px solid #333',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #282828',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' }}>
              {t('onboarding.profileModalTitle') || '个人档案'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* 弹窗滚动表单区域 */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <p style={{ color: '#888', fontSize: '11px', margin: '0 0 4px 0' }}>
            {t('onboarding.profileModalDesc') || '这些常态基础生理与既往病史指标将被保存，避免重复录入'}
          </p>

          {/* 年龄段 */}
          <div>
            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
              {t('onboarding.ageGroupLabel')}
            </label>
            <select
              value={medicalBackground.age || ''}
              onChange={(e) =>
                setMedicalBackground({ ...medicalBackground, age: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px',
                background: '#111',
                color: '#fff',
                border: '1.5px solid #333',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              {Object.entries(t('onboarding.ageOptions') || {}).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 身高 / 体重 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                {t('onboarding.heightLabel')}
              </label>
              <input
                type="number"
                placeholder={t('onboarding.heightPlaceholder')}
                value={medicalBackground.height || ''}
                onChange={(e) =>
                  setMedicalBackground({ ...medicalBackground, height: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#111',
                  color: '#fff',
                  border: '1.5px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
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
                value={medicalBackground.weight || ''}
                onChange={(e) =>
                  setMedicalBackground({ ...medicalBackground, weight: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#111',
                  color: '#fff',
                  border: '1.5px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* 日常活动负荷 */}
          <div>
            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
              {t('onboarding.dailyActivityLevelLabel') || '日常活动负荷'}
            </label>
            <select
              value={medicalBackground.activityLevel || ''}
              onChange={(e) =>
                setMedicalBackground({ ...medicalBackground, activityLevel: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px',
                background: '#111',
                color: '#fff',
                border: '1.5px solid #333',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              {Object.entries(t('onboarding.activityOptions') || {}).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 日常习惯 & 心理社会因素 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <ModalMultiSelect
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
              placeholder={t('onboarding.pleaseSelect') || '未选择'}
            />
            <ModalSingleSelect
              label={t('onboarding.psychosocialLabel')}
              options={[
                { value: 'lowStress', label: t('onboarding.psychosocialLowStress') },
                { value: 'moderateStress', label: t('onboarding.psychosocialModerateStress') },
                { value: 'highStress', label: t('onboarding.psychosocialHighStress') },
                { value: 'trauma', label: t('onboarding.psychosocialTrauma') },
              ]}
              selectedValue={medicalBackground.psychosocial || ''}
              onChange={(value) =>
                setMedicalBackground({ ...medicalBackground, psychosocial: value })
              }
              placeholder={t('onboarding.pleaseSelect') || '未选择'}
            />
          </div>

          {/* ===== 月经史（常态基础） ===== */}
          <div
            style={{
              background: '#111',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid #282828',
            }}
          >
            <h4 style={{ color: '#eee', margin: '0 0 12px 0', fontSize: '13px', borderBottom: '1px solid #222', paddingBottom: '6px' }}>
              {t('onboarding.menstrualHistoryTitle') || '月经史'}
            </h4>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.menarcheAgeLabel')}
                </label>
                <input
                  type="number"
                  placeholder="eg: 13"
                  value={medicalBackground.menarcheAge || ''}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, menarcheAge: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#161616',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                  {t('onboarding.cycleRegularityLabel')}
                </label>
                <select
                  value={medicalBackground.cycleRegular || ''}
                  onChange={(e) =>
                    setMedicalBackground({ ...medicalBackground, cycleRegular: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#161616',
                    color: '#fff',
                    border: '1.5px solid #333',
                    borderRadius: '8px',
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

            <div>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
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
                  background: '#161616',
                  color: '#fff',
                  border: '1.5px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                {Object.entries(t('onboarding.periodDurationOptions') || {}).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 妇科既往确诊 */}
          <div>
            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
              {t('onboarding.gynecologicalDiagnosisTitle')}
            </label>
            <select
              value={medicalBackground.diagnosed || ''}
              onChange={(e) =>
                setMedicalBackground({ ...medicalBackground, diagnosed: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px',
                background: '#111',
                color: '#fff',
                border: '1.5px solid #333',
                borderRadius: '8px',
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

          {/* 特异性抗炎药/NSAIDs过敏史 */}
          <div>
            <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
              {t('onboarding.allergyLabelFull')}
            </label>
            <select
              value={medicalBackground.allergies || ''}
              onChange={(e) =>
                setMedicalBackground({ ...medicalBackground, allergies: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px',
                background: '#111',
                color: '#fff',
                border: '1.5px solid #333',
                borderRadius: '8px',
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

          {/* 手术史与一级亲属病史 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: '#888', fontSize: '11px', display: 'block', marginBottom: '6px' }}>
                {t('onboarding.surgicalHistoryLabel')}
              </label>
              <select
                value={medicalBackground.surgicalHistory || ''}
                onChange={(e) =>
                  setMedicalBackground({ ...medicalBackground, surgicalHistory: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#111',
                  color: '#fff',
                  border: '1.5px solid #333',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              >
                {Object.entries(t('onboarding.surgicalHistoryOptions') || {}).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <ModalMultiSelect
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

          {/* 孕产/生育史 */}
          <ModalMultiSelect
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

        {/* 弹窗底部操作栏 */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #282828',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {t('common.save') || '保存并返回'}
          </button>
        </div>
      </div>
    </div>
  );
}