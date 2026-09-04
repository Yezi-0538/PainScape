// src/pages/HealingPage.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { telemetry } from '../services/telemetry';

export default function HealingPage({
  onBack,
  onOpenHealingSpace,
  medicalBackground = {},
  dominantPain = 'twist',
}) {
  const { t, lang } = useI18n();

  // 四大具身体感调理卡片配置
  const healingModules = [
    {
      key: 'breathing',
      icon: '🌬️',
      title: t('healing.breathing.title') || '骨盆释压呼吸调理',
      subtitle: t('healing.breathing.description') || '4-7-8 与箱式平缓呼吸，调节副交感神经，缓解平滑肌痉挛',
      color: '#4caf50',
      badge: lang === 'en' ? 'Vagus Nerve' : '迷走神经调谐',
    },
    {
      key: 'posture',
      icon: '🧘',
      title: t('healing.meditation.title') || '骨盆拉伸与体位松弛',
      subtitle: t('healing.meditation.description') || '婴儿式、仰卧束角式与猫牛式伸展，释放骨盆底张力',
      color: '#ab47bc',
      badge: lang === 'en' ? 'Pelvic Stretch' : '骨盆底减压',
    },
    {
      key: 'acupressure',
      icon: '💆',
      title: t('healing.acupressure.title') || '特异穴位物理按揉',
      subtitle: t('healing.acupressure.description') || '三阴交、血海、合谷脉冲式揉按，促进盆腔循环',
      color: '#2196f3',
      badge: lang === 'en' ? 'Acupressure' : '经络循行',
    },
    {
      key: 'thermal',
      icon: '🔥',
      title: t('healing.heatPack.title') || '局部热敷与食疗温补',
      subtitle: t('healing.heatPack.description') || '40-42℃ 持续温透下腹及腰骶部，舒张平滑肌微小血管',
      color: '#ff9800',
      badge: lang === 'en' ? 'Thermal Therapy' : '温经散寒',
    },
  ];

  // 舒缓日常建议列表
  const tips = lang === 'en' ? [
    'Lie in a side-lying fetal position with a pillow between knees to minimize abdominal muscular tension.',
    'Sip ginger or red-date warm tea in small intervals; avoid sudden large-volume fluid intake.',
    'Maintain a calm space with dim lighting and warm amber hues to de-escalate pain hypersensitivity.',
  ] : [
    '采取侧卧屈膝抱枕体位（侧卧胎儿位），最大限度减轻腹壁平滑肌与盆腔底韧带张力。',
    '小口慢饮温热红糖姜枣茶或温开水，忌快速大口饮水引起胃肠反射性痉挛。',
    '保持室温 24-26℃，调暗周围光源为暖橙色，降低中枢神经对痛觉的敏化反应。',
  ];

  const handleModuleClick = (moduleKey) => {
    // 埋点
    try {
      telemetry.logReportEvent({
        outputType: 'selfcare',
        event_type: 'entered_selfcare',
        extra: { healing_tab: moduleKey, entry: 'healing_cabin_page' }
      });
    } catch (e) {
      console.warn('Telemetry error:', e);
    }
    
    if (onOpenHealingSpace) {
      onOpenHealingSpace(moduleKey);
    }
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-xl) 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid #333',
            color: '#aaa',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← {t('common.back') || '返回'}
        </button>

        <div style={{ textAlign: 'right' }}>
          <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, fontWeight: '600' }}>
            🌿 {lang === 'en' ? 'Somatic Healing Space' : '具身自愈静疗舱'}
          </h2>
          <span style={{ color: '#666', fontSize: '11px' }}>
            {lang === 'en' ? 'Non-pharmacological Relief Hub' : '非药物物理减痛·即时调理'}
          </span>
        </div>
      </div>

      {/* 介绍横幅 */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, rgba(33,150,243,0.12), rgba(156,39,176,0.12))',
          border: '1px solid rgba(33,150,243,0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          boxSizing: 'border-box',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>🧘‍♀️</span>
          <h4 style={{ color: '#90caf9', margin: 0, fontSize: '14px', fontWeight: '600' }}>
            {lang === 'en' ? 'Calm the Storm Within' : '感受躯体呼吸，让紧张与绞坠感自然消退'}
          </h4>
        </div>
        <p style={{ color: '#bbb', fontSize: '12.5px', lineHeight: '1.65', margin: 0 }}>
          {lang === 'en'
            ? 'Access scientifically grounded somatic exercises right away without drawing a pain map. Select a module below to enter targeted audio-guided healing.'
            : '无需完成漫长绘图，当下即可直接启动具身减痛干预。通过呼吸神经调谐、骨盆拉伸、特异反射穴位与热力疗法阻断痛觉中枢恶性回路。'}
        </p>
      </div>

      {/* 四大核心调理入口 */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ color: '#888', fontSize: '12px', fontWeight: '600', paddingLeft: '4px' }}>
          {lang === 'en' ? 'INTERACTIVE SOMATIC SESSIONS' : '四大具身体感交互静疗'}
        </div>

        {healingModules.map((item) => (
          <div
            key={item.key}
            onClick={() => handleModuleClick(item.key)}
            style={{
              background: '#141414',
              border: '1px solid #282828',
              borderLeft: `4px solid ${item.color}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.borderColor = '#444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#141414';
              e.currentTarget.style.borderColor = '#282828';
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: `${item.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  {item.title}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: item.color,
                    background: `${item.color}18`,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontWeight: '500',
                  }}
                >
                  {item.badge}
                </span>
              </div>
              <p style={{ color: '#888', fontSize: '11.5px', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                {item.subtitle}
              </p>
            </div>

            <span style={{ color: '#555', fontSize: '18px', fontWeight: '300' }}>›</span>
          </div>
        ))}
      </div>

      {/* 舒缓自愈手记卡片 */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#141414',
          border: '1px solid #262626',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          boxSizing: 'border-box',
          marginBottom: '30px',
        }}
      >
        <h4 style={{ color: '#ab47bc', fontSize: '13px', margin: '0 0 12px 0', fontWeight: '600' }}>
          💡 {lang === 'en' ? 'Immediate Gentle Self-Care' : '静息调养要诀'}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tips.map((tipText, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                color: '#ccc',
                fontSize: '12px',
                lineHeight: '1.6',
              }}
            >
              <span style={{ color: '#ab47bc', fontSize: '14px' }}>•</span>
              <span>{tipText}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}