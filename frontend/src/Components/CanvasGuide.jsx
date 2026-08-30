// src/Components/CanvasGuide.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/i18nContext';

const CanvasGuide = ({ onComplete }) => {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState('bottom');
  
  const totalSteps = 5;  // ✅ 改为 5 步
  const guideShownRef = useRef(false);

  // 各步骤对应的目标元素选择器
  const stepTargets = [
    '.canvas-area',           // Step 1: 画布区域
    '.brush-section',         // Step 2: 画笔选择
    '.color-section',         // Step 3: 颜色选择
    '.top-bar-actions',       // Step 4: 顶部操作按钮
    '.side-tools',            // Step 5: 右侧工具栏（新增）
  ];

  // 各步骤的 tooltip 位置
  const tooltipPositions = ['center', 'top', 'top', 'bottom', 'left'];

  useEffect(() => {
    // 检查是否已看过引导
    const hasSeen = localStorage.getItem('paintScape_canvas_guide_shown') === 'true';
    if (hasSeen) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    // 延迟执行，等待 DOM 渲染完成
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 400);

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [currentStep]);

  const updateTargetPosition = () => {
    const selector = stepTargets[currentStep];
    const element = document.querySelector(selector);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setTooltipPosition(tooltipPositions[currentStep] || 'bottom');
    } else {
      // 如果元素不存在，尝试再次查找
      setTimeout(() => {
        const el = document.querySelector(selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
        }
      }, 200);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setTimeout(updateTargetPosition, 150);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTimeout(updateTargetPosition, 150);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('paintScape_canvas_guide_shown', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const stepKey = `canvasGuide.step${currentStep + 1}`;
  const title = t(`${stepKey}.title`);
  const description = t(`${stepKey}.description`);
  const isLastStep = currentStep === totalSteps - 1;

  // 如果目标元素不存在，显示居中引导
  if (!targetRect) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎨</div>
          <h3 style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
            {title}
          </h3>
          <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            {description}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #444',
                borderRadius: '10px',
                color: '#888',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {t('canvasGuide.skip')}
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '8px 24px',
                background: isLastStep 
                  ? 'linear-gradient(135deg, #4caf50, #388e3c)' 
                  : 'linear-gradient(135deg, #d32f2f, #c62828)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {isLastStep ? t('canvasGuide.finish') : t('canvasGuide.next')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 计算高亮区域
  const padding = 12;
  const highlightStyle = {
    position: 'fixed',
    top: Math.max(0, targetRect.top - padding),
    left: Math.max(0, targetRect.left - padding),
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: '12px',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
    border: '2px solid rgba(255,255,255,0.12)',
    pointerEvents: 'none',
    zIndex: 9998,
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // 计算 tooltip 位置
  const getTooltipStyle = () => {
    const base = {
      position: 'fixed',
      zIndex: 9999,
      maxWidth: '360px',
      width: '90%',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '16px',
      padding: '20px 22px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      animation: 'fadeInUp 0.3s ease',
      pointerEvents: 'auto',
    };

    const gap = 16;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let top, left, transform;

    if (tooltipPosition === 'center') {
      top = '50%';
      left = '50%';
      transform = 'translate(-50%, -50%)';
    } else if (tooltipPosition === 'left') {
      // 右侧工具栏：显示在左边（屏幕右侧空间小）
      left = targetRect.left - gap - 320;
      top = targetRect.top + targetRect.height / 2;
      transform = 'translateY(-50%)';
      
      if (left < 20) {
        left = targetRect.right + gap;
        transform = 'translateY(-50%)';
      }
      if (top + 200 > screenHeight) {
        top = screenHeight - 220;
      }
      if (top < 20) {
        top = 20;
      }
    } else if (tooltipPosition === 'top') {
      top = targetRect.top - gap - 200;
      left = targetRect.left + targetRect.width / 2;
      transform = 'translateX(-50%)';
      
      if (top < 20) {
        top = targetRect.bottom + gap;
        transform = 'translateX(-50%)';
      }
    } else {
      top = targetRect.bottom + gap;
      left = targetRect.left + targetRect.width / 2;
      transform = 'translateX(-50%)';
      
      if (top + 250 > screenHeight) {
        top = targetRect.top - gap - 200;
        transform = 'translateX(-50%)';
      }
    }

    if (left < 20) left = 20;
    if (left > screenWidth - 20) left = screenWidth - 20;

    return { ...base, top, left, transform };
  };

  const tooltipStyle = getTooltipStyle();

  const renderStepDots = () => (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '12px' }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === currentStep ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i === currentStep ? '#d32f2f' : 'rgba(255,255,255,0.15)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );

  const stepLabel = t('canvasGuide.step', { current: currentStep + 1, total: totalSteps });

  return (
    <>
      <div style={highlightStyle} />
      <div style={tooltipStyle}>
        <div style={{ fontSize: '10px', color: '#888', letterSpacing: '1px', marginBottom: '6px', fontWeight: '500' }}>
          {stepLabel}
        </div>
        <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: '0 0 6px 0', lineHeight: '1.3' }}>
          {title}
        </h4>
        <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.6', margin: '0 0 16px 0', whiteSpace: 'pre-line' }}>
          {description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#888',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                {t('canvasGuide.prev')}
              </button>
            )}
            <button
              onClick={handleSkip}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                color: '#555',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#888'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#555'; }}
            >
              {t('canvasGuide.skip')}
            </button>
          </div>
          <button
            onClick={handleNext}
            style={{
              padding: '8px 20px',
              background: isLastStep 
                ? 'linear-gradient(135deg, #4caf50, #388e3c)' 
                : 'linear-gradient(135deg, #d32f2f, #c62828)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLastStep 
                ? '0 2px 12px rgba(76,175,80,0.3)' 
                : '0 2px 12px rgba(211,47,47,0.25)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          >
            {isLastStep ? t('canvasGuide.finish') : t('canvasGuide.next')}
          </button>
        </div>
        {renderStepDots()}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default CanvasGuide;