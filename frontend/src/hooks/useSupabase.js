// src/hooks/useSupabase.js
import { useState, useEffect, useCallback } from 'react';
import { supabase, ensureSession, getOrCreateProfile, updateProfile } from '../supabaseClient';

export const useSupabase = () => {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化：匿名登录并获取档案
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const session = await ensureSession();
        if (!session || cancelled) {
          setIsReady(true);
          return;
        }

        const uid = session.user.id;
        setUserId(uid);

        const profileData = await getOrCreateProfile(uid);
        if (profileData && !cancelled) {
          setProfile(profileData);
        }
      } catch (e) {
        console.warn('Supabase init failed:', e);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // 更新档案
  const updateProfileData = useCallback(
    async (updates) => {
      if (!userId) return null;
      setIsLoading(true);
      try {
        const result = await updateProfile(userId, updates);
        if (result) setProfile(result);
        return result;
      } catch (e) {
        console.warn('Update profile failed:', e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  // 登出
  const logout = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUserId(null);
    setProfile(null);
  }, []);

  return {
    userId,
    profile,
    isReady,
    isLoading,
    updateProfile: updateProfileData,
    logout,
  };
};