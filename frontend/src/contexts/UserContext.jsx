// src/contexts/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, ensureSession, getOrCreateProfile, updateProfile } from '../services/supabaseClient';

const UserContext = createContext(null);

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
};

// 预设背景主题（与 UserProfilePage 保持一致）
export const PRESET_BACKGROUNDS = [
    { name: '曜石黑 (默认)', gradient: 'linear-gradient(135deg, #0e0e0e, #050505)', cardBg: 'linear-gradient(135deg, #1c1c1c, #141414)' },
    { name: '暗玫瑰 (急性/充血)', gradient: 'linear-gradient(135deg, #221010, #0a0505)', cardBg: 'linear-gradient(135deg, #2d1616, #1b0a0a)' },
    { name: '神秘紫 (神经/放射)', gradient: 'linear-gradient(135deg, #150f24, #080510)', cardBg: 'linear-gradient(135deg, #22183c, #120e24)' },
    { name: '深海蓝 (寒冷/发僵)', gradient: 'linear-gradient(135deg, #0a141d, #04080e)', cardBg: 'linear-gradient(135deg, #0f2231, #09151f)' }
];

export const PRESET_AVATARS = ['🩸', '🌸', '🔮', '🌿', '🧘', '🩹', '🍀', '🌙'];

// 默认用户信息
const DEFAULT_USER_INFO = {
    nickname: 'PainScape_Companion',
    email: 'user@painscape.org',
    joinDate: new Date().toISOString().split('T')[0],
    avatar: '🧘',
    bgIndex: 0,
    customAvatar: '',
    customBg: '',
    signature: '让说不出的痛，换一种方式抵达。🧘',
    followingCount: 18,
    followersCount: 142
};

export const UserProvider = ({ children }) => {
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    
    // 🌟 安全防护 1：统一全站缓存 Key 为 'painscape_user_info'
    const [userInfo, setUserInfoState] = useState(() => {
        try {
            const cached = localStorage.getItem('painscape_user_info') || localStorage.getItem('painscape_user_custom_info');
            return cached ? { ...DEFAULT_USER_INFO, ...JSON.parse(cached) } : DEFAULT_USER_INFO;
        } catch (e) {
            return DEFAULT_USER_INFO;
        }
    });

    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // 防暴锁，防止保存时后台事件冲突
    const isUpdatingRef = useRef(false);

    const resetUserInfo = useCallback(() => {
        setUserInfoState(DEFAULT_USER_INFO);
        localStorage.removeItem('painscape_user_info');
        localStorage.removeItem('painscape_user_custom_info');
    }, []);

    // 校验并同步 Supabase Profile
    const syncProfileFromSupabase = useCallback(async (sessionUser, cancelled = false) => {
        if (!sessionUser || cancelled || isUpdatingRef.current) return;
        setUserId(sessionUser.id);
        try {
            const profileData = await getOrCreateProfile(sessionUser.id);
            if (profileData && !cancelled && !isUpdatingRef.current) {
                setProfile(profileData);
                setUserInfoState(prev => {
                    const updated = {
                        ...prev,
                        nickname: profileData.nickname || prev.nickname,
                        avatar: profileData.avatar || prev.avatar,
                        signature: profileData.signature || prev.signature,
                        bgIndex: profileData.bg_index !== undefined ? Number(profileData.bg_index) : prev.bgIndex,
                        customAvatar: profileData.custom_avatar || prev.customAvatar,
                        customBg: profileData.custom_bg || prev.customBg,
                        hasSeenGuide: profileData.has_seen_guide || false,
                    };
                    localStorage.setItem('painscape_user_info', JSON.stringify(updated));
                    return updated;
                });
            }
        } catch (err) {
            console.warn('Sync profile from Supabase warning:', err);
        }
    }, []);

    // 1. 同步 userInfo 到 localStorage
    useEffect(() => {
        if (userInfo) {
            localStorage.setItem('painscape_user_info', JSON.stringify(userInfo));
        }
    }, [userInfo]);

    // 2. 初始化 Supabase 会话与监听
    useEffect(() => {
        let cancelled = false;

        const initSession = async () => {
            try {
                const session = await ensureSession();
                if (!session || cancelled) {
                    setIsReady(true);
                    return;
                }
                await syncProfileFromSupabase(session.user, cancelled);
            } catch (e) {
                console.warn('Supabase init failed, using local mode:', e);
            } finally {
                if (!cancelled) setIsReady(true);
            }
        };

        initSession();

        // 🌟 安全防护 2：只在明确的登录/登出事件触发同步，避免 Token 自动刷新引发频繁死循环
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (cancelled) return;

            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                if (!session?.user) {
                    setUserId(null);
                    setProfile(null);
                    resetUserInfo();
                } else {
                    syncProfileFromSupabase(session.user);
                }
            }
            setIsReady(true);
        });

        return () => {
            cancelled = true;
            subscription?.unsubscribe();
        };
    }, [resetUserInfo, syncProfileFromSupabase]);

    // 🌟 安全防护 3：核心修复！依赖项中剔除 userInfo，函数引用永久稳定，彻底杜绝无响应卡死！
    const updateUserInfo = useCallback(async (updates) => {
        isUpdatingRef.current = true;

        // 1. 本地函数式更新状态
        setUserInfoState(prev => {
            const newInfo = { ...prev, ...updates };
            localStorage.setItem('painscape_user_info', JSON.stringify(newInfo));
            return newInfo;
        });

        // 2. 静默提交 Supabase
        if (userId && updates) {
            try {
                const profileUpdates = {};
                if (updates.nickname !== undefined) profileUpdates.nickname = updates.nickname;
                if (updates.avatar !== undefined) profileUpdates.avatar = updates.avatar;
                if (updates.signature !== undefined) profileUpdates.signature = updates.signature;
                if (updates.bgIndex !== undefined) profileUpdates.bg_index = Number(updates.bgIndex);
                if (updates.customAvatar !== undefined) profileUpdates.custom_avatar = updates.customAvatar;
                if (updates.customBg !== undefined) profileUpdates.custom_bg = updates.customBg;
                if (updates.hasSeenGuide !== undefined) profileUpdates.has_seen_guide = updates.hasSeenGuide;

                if (Object.keys(profileUpdates).length > 0) {
                    await updateProfile(userId, profileUpdates);
                }
            } catch (e) {
                console.warn('Failed to sync profile to Supabase:', e);
            }
        }

        setTimeout(() => {
            isUpdatingRef.current = false;
        }, 500);
    }, [userId]); // 👈 依赖项仅保留 userId，函数引用稳定，绝不引发无响应！

    // 4. 登出
    const logout = useCallback(async () => {
        try {
            if (supabase) await supabase.auth.signOut();
        } catch (e) {
            console.warn('Logout error:', e);
        }
        setUserId(null);
        setProfile(null);
        resetUserInfo();
    }, [resetUserInfo]);

    // 5. 获取当前主题
    const activeBackground = PRESET_BACKGROUNDS[userInfo.bgIndex] || PRESET_BACKGROUNDS[0];

    const value = {
        userId,
        profile,
        userInfo,
        setUserInfo: updateUserInfo,
        isReady,
        isLoading,
        logout,
        activeBackground,
        PRESET_BACKGROUNDS,
        PRESET_AVATARS,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};