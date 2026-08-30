// src/pages/DraftBox.jsx
import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/i18nContext';
import { telemetry } from '../services/telemetry';

export default function DraftBox({
    onBack,
    onOpenDraft,
    onDeleteDraft,
    onGenerateFromDraft,
    currentUserId,
    isGuest,
    showToast,
    t,
}) {
    const { lang, toggleLang } = useI18n(); // 新增：获取语言切换功能
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        loadDrafts();
    }, [currentUserId]);

    const loadDrafts = () => {
        setLoading(true);
        try {
            const localDrafts = JSON.parse(localStorage.getItem('paintScape_drafts') || '[]');
            setDrafts(localDrafts);
            
            telemetry.logDraftBoxViewed({
                fromPage: 'draft_box',
                draftCount: localDrafts.length
            });
        } catch (err) {
            console.error('加载本地草稿失败:', err);
            showToast('draftBox.loadFailed');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (draftId) => {
        // ✅ 先找到对应的草稿
        const draft = drafts.find(d => d.id === draftId);
        if (!draft) return;

        // ✅ 计算画笔数量和粒子数量（在 try 块之前）
        const brushCount = draft.draft_data?.brushCounts
            ? Object.values(draft.draft_data.brushCounts).reduce((a, b) => a + b, 0)
            : 0;
        const particleCount = draft.draft_data?.particlePositions?.length || 0;

        const success = await onDeleteDraft(draftId);
        if (success) {
            setDrafts(drafts.filter(d => d.id !== draftId));
            setConfirmDelete(null);
            showToast('draftbox.deleteSuccess');

            // ✅ 埋点：用户删除了一个草稿
            telemetry.logDraftDeleted({
                draftId,
                brushCount,
                particleCount
            });
        }
    };

    const handleGenerate = (draft) => {
        const brushCount = draft.draft_data?.brushCounts
            ? Object.values(draft.draft_data.brushCounts).reduce((a, b) => a + b, 0)
            : 0;
        const particleCount = draft.draft_data?.particlePositions?.length || 0;

        // ✅ 埋点：用户从草稿生成报告
        telemetry.logDraftGenerated({
            draftId: draft.id,
            brushCount,
            particleCount
        });

        if (onGenerateFromDraft) {
            onGenerateFromDraft(draft);
        }
    };

    const handleOpen = (draft) => {
        const brushCount = draft.draft_data?.brushCounts
            ? Object.values(draft.draft_data.brushCounts).reduce((a, b) => a + b, 0)
            : 0;
        const particleCount = draft.draft_data?.particlePositions?.length || 0;

        // ✅ 埋点：用户打开草稿继续编辑
        telemetry.logDraftOpened({
            draftId: draft.id,
            brushCount,
            particleCount
        });

        if (onOpenDraft) {
            onOpenDraft(draft);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    };

    const getDraftPreview = (draft) => {
        const brushCounts = draft.draft_data?.brushCounts || {};
        const brushes = Object.keys(brushCounts).filter(k => brushCounts[k] > 0);
        if (brushes.length === 0) return t('draftBox.emptyPreview') || '无笔触记录';
        return brushes.map(b => t(`brushes.${b}.label`) || b).join('、');
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 30,
                background: 'rgba(8,8,8,0.98)',
                backdropFilter: 'blur(12px)',
                padding: 'var(--space-xl)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* 顶部导航 */}
            <div
                style={{
                    width: '100%',
                    maxWidth: 'var(--container-max)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-xl)',
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #333',
                        color: '#fff',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        fontSize: 'var(--text-base)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ←
                </button>

                <h2 style={{ color: '#fff', margin: 0, fontSize: 'var(--text-lg)' }}>
                    📋 {t('draftBox.title')}
                </h2>

                {/* 右侧按钮组：语言切换 + 刷新 */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* 语言切换按钮 */}
                    <button
                        onClick={toggleLang}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1.5px solid #444',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#888',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#666';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#444';
                            e.currentTarget.style.color = '#888';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        {lang === 'zh' ? 'EN' : '中'}
                    </button>

                    {/* 刷新按钮 */}
                    <button
                        onClick={loadDrafts}
                        disabled={loading}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1.5px solid #444',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            fontSize: '18px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#888',
                            transition: 'all 0.3s ease',
                            opacity: loading ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.borderColor = '#666';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#444';
                            e.currentTarget.style.color = '#888';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        <span
                            style={{
                                display: 'inline-block',
                                animation: loading ? 'spin 1s linear infinite' : 'none',
                                transform: loading ? 'none' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            ⟳
                        </span>
                    </button>
                </div>
            </div>

            {/* 内容 */}
            {loading ? (
                <div style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
                    {t('common.loading') || '加载中...'}
                </div>
            ) : drafts.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#666',
                    }}
                >
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <p style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                        {t('draftBox.empty')}
                    </p>
                    <p style={{ fontSize: 'var(--text-sm)', margin: '8px 0 0 0', color: '#444' }}>
                        {t('draftBox.emptyHint')}
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        width: '100%',
                        maxWidth: 'var(--container-max)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-md)',
                    }}
                >
                    {drafts.map((draft) => (
                        <div
                            key={draft.id}
                            style={{
                                background: '#161616',
                                border: '1px solid #2a2a2a',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#444';
                                e.currentTarget.style.background = '#1e1e1e';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#2a2a2a';
                                e.currentTarget.style.background = '#161616';
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#ffb74d', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                                            📝 {t('draftBox.draft')}
                                        </span>
                                        <span style={{ color: '#666', fontSize: 'var(--text-xs)' }}>
                                            {formatTime(draft.updated_at || draft.created_at)}
                                        </span>
                                    </div>
                                    <p style={{ color: '#aaa', fontSize: 'var(--text-sm)', margin: '6px 0 0 0' }}>
                                        {getDraftPreview(draft)}
                                    </p>
                                    {draft.draft_data?.particlePositions?.length > 0 && (
                                        <p style={{ color: '#555', fontSize: 'var(--text-xs)', margin: '4px 0 0 0' }}>
                                            {draft.draft_data.particlePositions.length} {t('draftBox.particles')}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerate(draft);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#4caf50',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: '500',
                                            minHeight: '32px',
                                        }}
                                    >
                                        {t('draftBox.generate')}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpen(draft);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'rgba(255,255,255,0.06)',
                                            color: '#888',
                                            border: '1px solid #333',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--text-xs)',
                                            minHeight: '32px',
                                        }}
                                    >
                                        {t('draftBox.edit')}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDelete(draft.id);
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'transparent',
                                            color: '#555',
                                            border: '1px solid #2a2a2a',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            fontSize: 'var(--text-xs)',
                                            minHeight: '32px',
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 删除确认弹窗 */}
            {confirmDelete && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => setConfirmDelete(null)}
                >
                    <div
                        style={{
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: 'var(--radius-md)',
                            padding: '24px',
                            maxWidth: '320px',
                            width: '85%',
                            textAlign: 'center',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p style={{ color: '#ccc', fontSize: '15px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                            {t('draftBox.confirmDelete')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #444',
                                    color: '#888',
                                    padding: '8px 24px',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    minHeight: '40px',
                                }}
                                onClick={() => setConfirmDelete(null)}
                            >
                                {t('common.cancel') || '取消'}
                            </button>
                            <button
                                style={{
                                    background: '#d32f2f',
                                    border: 'none',
                                    color: '#fff',
                                    padding: '8px 24px',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    minHeight: '40px',
                                }}
                                onClick={() => handleDelete(confirmDelete)}
                            >
                                {t('common.delete') || '删除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}