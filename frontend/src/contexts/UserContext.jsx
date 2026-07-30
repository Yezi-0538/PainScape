// src/contexts/UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    const [userInfo, setUserInfo] = useState(() => {
        const cached = localStorage.getItem('painscape_user_custom_info');
        return cached ? JSON.parse(cached) : DEFAULT_USER_INFO;
    });
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 1. 同步 userInfo 到 localStorage
    useEffect(() => {
        localStorage.setItem('painscape_user_custom_info', JSON.stringify(userInfo));
    }, [userInfo]);

    // 2. 初始化 Supabase 匿名登录
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const session = await ensureSession();
                if (!session || cancelled) {
                    setIsReady(true);
                    return;
                }
                setUserId(session.user.id);
                const profileData = await getOrCreateProfile(session.user.id);
                if (profileData && !cancelled) {
                    setProfile(profileData);
                    // 从 Supabase 回填用户信息
                    if (profileData.nickname || profileData.avatar || profileData.signature) {
                        setUserInfo(prev => ({
                            ...prev,
                            nickname: profileData.nickname || prev.nickname,
                            avatar: profileData.avatar || prev.avatar,
                            signature: profileData.signature || prev.signature,
                            bgIndex: profileData.bg_index !== undefined ? profileData.bg_index : prev.bgIndex,
                            customAvatar: profileData.custom_avatar || prev.customAvatar,
                            customBg: profileData.custom_bg || prev.customBg,
                        }));
                    }
                }
            } catch (e) {
                console.warn('Supabase init failed, using local mode:', e);
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // 3. 更新用户信息（本地 + Supabase）
    const updateUserInfo = useCallback(async (updates) => {
        const newInfo = { ...userInfo, ...updates };
        setUserInfo(newInfo);

        // 同步到 Supabase
        if (userId) {
            try {
                await updateProfile(userId, {
                    nickname: newInfo.nickname,
                    avatar: newInfo.avatar,
                    signature: newInfo.signature,
                    bg_index: newInfo.bgIndex,
                    custom_avatar: newInfo.customAvatar,
                    custom_bg: newInfo.customBg,
                });
            } catch (e) {
                console.warn('Failed to sync profile to Supabase:', e);
            }
        }
    }, [userInfo, userId]);

    // 4. 登出
    const logout = useCallback(async () => {
        try {
            if (supabase) await supabase.auth.signOut();
        } catch (e) {
            console.warn('Logout error:', e);
        }
        setUserId(null);
        setProfile(null);
    }, []);

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