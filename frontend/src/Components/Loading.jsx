// src/components/Loading.jsx
import React from 'react';

/**
 * 全局加载遮罩组件
 * 
 * @param {boolean} isLoading - 是否显示加载状态
 * @param {string} message - 加载提示文字
 * @param {string} subMessage - 副提示文字
 * @param {string} hint - 额外提示（如"大模型生成中，预计需要30秒"）
 */
const Loading = ({
  isLoading,
  message = '加载中...',
  subMessage = '请稍候',
  hint = '',
}) => {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 旋转加载动画 */}
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid #d32f2f',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* 主提示 */}
      <p
        style={{
          color: '#fff',
          marginTop: '20px',
          letterSpacing: '2px',
          fontSize: '14px',
        }}
      >
        {message}
      </p>

      {/* 副提示 */}
      {subMessage && (
        <p
          style={{
            color: '#666',
            fontSize: '12px',
            marginTop: '8px',
          }}
        >
          {subMessage}
        </p>
      )}

      {/* 额外提示（如大模型生成耗时说明） */}
      {hint && (
        <p
          style={{
            color: '#555',
            fontSize: '11px',
            marginTop: '12px',
            maxWidth: '280px',
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Loading;