// src/Components/EditableBlock.jsx
import React, { useState } from 'react';
import { useI18n } from '../i18n/i18nContext';

/**
 * 可编辑文本块组件
 * 点击文本进入编辑模式，失焦后保存
 * 
 * @param {string} fieldKey - 字段唯一标识
 * @param {string} defaultValue - 默认值
 * @param {string} color - 文本颜色
 * @param {object} style - 额外样式
 * @param {function} onSave - 保存回调 (fieldKey, newValue) => void
 * @param {string} placeholder - 占位文本
 */
const EditableBlock = ({
  fieldKey,
  defaultValue = '',
  color = '#ccc',
  style = {},
  onSave,
  placeholder,
}) => {
  const { t } = useI18n();
  const _placeholder = placeholder || t('resultLabels.clickToEdit');
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);

  // 当 defaultValue 变化时同步更新（父组件数据变化时）
  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleBlur = () => {
    setIsEditing(false);
    if (onSave && value !== defaultValue) {
      onSave(fieldKey, value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setValue(defaultValue);
      setIsEditing(false);
    }
    // Ctrl+Enter 或 Cmd+Enter 保存并退出
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={_placeholder}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '13px',
          lineHeight: '1.6',
          resize: 'vertical',
          minHeight: '60px',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      title={t('resultLabels.clickToEditTitle')}
      style={{
        color,
        fontSize: '13px',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        cursor: 'text',
        padding: '6px 8px',
        borderRadius: '6px',
        border: '1px dashed transparent',
        transition: 'border-color 0.2s',
        minHeight: '28px',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#555';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'transparent';
      }}
    >
      {value || _placeholder}
      <span
        style={{
          marginLeft: '6px',
          fontSize: '10px',
          color: '#555',
          verticalAlign: 'middle',
        }}
      >
        ✏️
      </span>
    </div>
  );
};

export default EditableBlock;