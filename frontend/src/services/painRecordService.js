// src/services/painRecordService.js
import { supabase } from './supabaseClient';

/**
 * 格式化云端记录为前端 History 结构
 */
export function formatCloudRecord(cloudRow) {
  if (!cloudRow) return null;
  const painData = cloudRow.pain_data || {};
  return {
    ...painData,
    id: String(painData.id || cloudRow.id),
    cloudId: cloudRow.id,
    userId: cloudRow.user_id,
    created_at: cloudRow.created_at || painData.created_at || new Date().toISOString(),
  };
}

/**
 * 🌟 核心函数 1：将本地的游客历史记录批量搬运绑定到登录账号
 */
export async function syncLocalHistoryToCloud(userId) {
  if (!supabase || !userId || userId.startsWith('guest_') || userId === 'user_guest') {
    return [];
  }

  try {
    const localHistory = JSON.parse(localStorage.getItem('painscape_history') || '[]');
    if (!Array.isArray(localHistory) || localHistory.length === 0) {
      return [];
    }

    // 筛选出属于游客/未绑定的记录
    const guestRecords = localHistory.filter(r => 
      !r.userId || r.userId.startsWith('guest_') || r.userId === 'user_guest'
    );

    if (guestRecords.length === 0) return [];

    console.log(`⏳ 正在将 ${guestRecords.length} 条本地游客记录同步至云端...`);

    const inserts = guestRecords.map(r => ({
      user_id: userId,
      record_data: {
        ...r,
        userId: userId,
      },
      created_at: r.created_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('pain_records')
      .insert(inserts)
      .select();

    if (error) {
      console.warn('⚠️ 批量同步游客记录失败:', error.message);
      return [];
    }

    console.log('🟢 游客记录已全部成功搬迁至云端！');
    return data || [];
  } catch (err) {
    console.warn('⚠️ 同步本地记录到云端异常:', err);
    return [];
  }
}

/**
 * 🌟 核心函数 2：从云端拉取当前用户的全部记录并格式化
 */
export async function fetchUserPainRecords(userId, limit = 100) {
  if (!supabase || !userId || userId.startsWith('guest_') || userId === 'user_guest') {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('pain_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ 拉取云端记录失败:', error.message);
      return [];
    }

    return (data || []).map(formatCloudRecord).filter(Boolean);
  } catch (err) {
    console.warn('⚠️ 获取云端历史记录网络异常:', err);
    return [];
  }
}

/**
 * 🌟 核心函数 3：合并云端记录与本地缓存（优先云端，去重）
 */
export function mergeHistoryRecords(cloudRecords = [], localRecords = [], currentUserId = null) {
  const map = new Map();

  // 1. 优先放入云端记录
  cloudRecords.forEach(r => {
    if (r && r.id) {
      map.set(String(r.id), r);
    }
  });

  // 2. 补入本地尚未同步但当前用户新增的记录
  localRecords.forEach(r => {
    if (r && r.id && !map.has(String(r.id))) {
      // 保证用户 ID 一致
      if (!currentUserId || r.userId === currentUserId) {
        map.set(String(r.id), r);
      }
    }
  });

  // 按日期时间倒序排序
  return Array.from(map.values()).sort((a, b) => {
    const tA = new Date(`${a.date || ''} ${a.time || ''}`).getTime() || 0;
    const tB = new Date(`${b.date || ''} ${b.time || ''}`).getTime() || 0;
    return tB - tA;
  });
}

/**
 * 🌟 核心函数 4：保存单条新记录到云端
 */
export async function saveRecordToCloud(userId, recordData) {
  if (!supabase || !userId || userId.startsWith('guest_') || userId === 'user_guest') {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('pain_records')
      .insert({
        user_id: userId,
        record_data: {
          ...recordData,
          userId,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('⚠️ 单条记录上传云端失败:', error.message);
      return null;
    }
    return formatCloudRecord(data);
  } catch (err) {
    console.warn('⚠️ 保存记录至云端网络异常:', err);
    return null;
  }
}

/**
 * 🌟 核心函数 5：从云端删除指定记录
 */
export async function deleteRecordFromCloud(recordId, userId) {
  if (!supabase || !userId || userId.startsWith('guest_') || userId === 'user_guest') {
    return true;
  }

  try {
    // 兼容 pain_data 中的 id 匹配或主键 id 匹配
    const { error } = await supabase
      .from('pain_records')
      .delete()
      .eq('user_id', userId)
      .filter('record_data->>id', 'eq', String(recordId));

    if (error) {
      console.warn('⚠️ 云端删除记录失败:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('⚠️ 云端删除记录异常:', err);
    return false;
  }
}