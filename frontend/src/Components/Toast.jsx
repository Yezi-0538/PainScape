// src/components/Toast.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Toast 轻提示组件
 * 
 * 使用方式：
 * const toast = useToast();
 * toast.show('操作成功', 'success');
 * toast.show('操作失败', 'error');
 * toast.show('提示信息', 'info');
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'info', duration = 2000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    // 自动移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    if (toasts.length === 0) return null;

    return createPortal(
      <div
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const colors = {
            success: { bg: 'rgba(76,175,80,0.9)', border: '#4caf50' },
            error: { bg: 'rgba(211,47,47,0.9)', border: '#d32f2f' },
            warning: { bg: 'rgba(255,152,0,0.9)', border: '#ff9800' },
            info: { bg: 'rgba(33,33,33,0.92)', border: '#555' },
          };

          const color = colors[toast.type] || colors.info;

          return (
            <div
              key={toast.id}
              style={{
                background: color.bg,
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-base)',
                border: `1px solid ${color.border}`,
                backdropFilter: 'blur(5px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                animation: 'toastIn 0.3s ease-out',
                maxWidth: '90vw',
                textAlign: 'center',
              }}
            >
              {toast.message}
              <style>
                {`
                  @keyframes toastIn {
                    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}
              </style>
            </div>
          );
        })}
      </div>,
      document.body
    );
  }, [toasts]);

  return {
    show,
    success: (msg, duration) => show(msg, 'success', duration),
    error: (msg, duration) => show(msg, 'error', duration),
    warning: (msg, duration) => show(msg, 'warning', duration),
    info: (msg, duration) => show(msg, 'info', duration),
    remove,
    ToastContainer,
  };
};

/**
 * 全局单例 Toast 组件（用于不需要 hook 的场景）
 */
let globalToastInstance = null;

export const Toast = {
  init: (toastInstance) => {
    globalToastInstance = toastInstance;
  },
  show: (message, type = 'info', duration = 2000) => {
    if (globalToastInstance) {
      globalToastInstance.show(message, type, duration);
    } else {
      console.warn('Toast not initialized. Call Toast.init() first.');
    }
  },
  success: (message, duration) => Toast.show(message, 'success', duration),
  error: (message, duration) => Toast.show(message, 'error', duration),
  warning: (message, duration) => Toast.show(message, 'warning', duration),
  info: (message, duration) => Toast.show(message, 'info', duration),
};

export default Toast;