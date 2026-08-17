// src/services/scienceService.js
import { supabase } from './supabaseClient';

/**
 * 保存用户科普到云端
 */
export async function saveUserScienceTip(userId, tip) {
  if (!supabase || !userId) {
    // 离线模式：保存到 localStorage
    saveToLocal(tip);
    return tip;
  }

  try {
    const { data, error } = await supabase
      .from('user_science_tips')
      .insert({
        user_id: userId,
        title_zh: tip.title_zh || '',
        title_en: tip.title_en || '',
        desc_zh: tip.desc_zh || '',
        desc_en: tip.desc_en || '',
        tag_zh: tip.tag_zh || '',
        tag_en: tip.tag_en || '',
        created_lang: tip.createdLang || 'zh',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('保存科普到云端失败，降级到本地:', error);
      saveToLocal(tip);
      return tip;
    }

    return { ...tip, id: data.id, cloudId: data.id };
  } catch (e) {
    console.warn('保存科普失败，降级到本地:', e);
    saveToLocal(tip);
    return tip;
  }
}

/**
 * 获取用户科普列表
 */
export async function getUserScienceTips(userId) {
  // 先从本地读取
  const localTips = getLocalTips();

  if (!supabase || !userId) {
    return localTips;
  }

  try {
    const { data, error } = await supabase
      .from('user_science_tips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('从云端获取科普失败:', error);
      return localTips;
    }

    // 合并云端和本地数据（去重）
    const merged = [...data, ...localTips];
    const seen = new Set();
    return merged.filter(item => {
      const key = item.id || item.cloudId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch (e) {
    console.warn('获取科普失败:', e);
    return localTips;
  }
}

// 本地存储辅助函数
function saveToLocal(tip) {
  const tips = JSON.parse(localStorage.getItem('user_science_tips') || '[]');
  tips.unshift(tip);
  localStorage.setItem('user_science_tips', JSON.stringify(tips));
}

function getLocalTips() {
  return JSON.parse(localStorage.getItem('user_science_tips') || '[]');
}