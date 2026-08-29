// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://odhkzjtyetyssaeousxp.supabase.co"
const supabaseAnonKey = "sb_publishable_-A7KlWwhbAuqG5guJLkq6g_DDIsSasT"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in .env. Using mock mode.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null

/**
 * 匿名登录 Supabase，返回 session
 */
export async function ensureSession() {
  if (!supabase) return null

  // 尝试恢复已有 session
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  // 匿名登录
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Supabase anonymous login failed:', error.message)
    return null
  }
  return data.session
}

/**
 * 获取或创建用户档案
 * 使用 maybeSingle 避免 406 错误
 */
export async function getOrCreateProfile(userId) {
  if (!supabase) return null;

  const { data: existing, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return existing;

  // 创建符合 UserProfilePage 初始化的默认档案
  const defaultProfile = {
    id: userId,
    nickname: "PainScape_Companion",
    avatar: "🩸",
    signature: "让说不出的痛，换一种方式抵达。🧘",
    language: 'zh',
    app_mode: 'medical',
    created_at: new Date().toISOString(),
  };

  const { data: created } = await supabase
    .from('profiles')
    .insert(defaultProfile)
    .select()
    .maybeSingle();

  return created;
}
/**
 * 更新用户档案
 */
export async function updateProfile(userId, updates) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Profile update error:', error);
      return null;
    }
    return data;
  } catch (err) {
    // 🌟【关键拦截】：捕获 ERR_CERT_DATABASE_CHANGED / Failed to fetch 网络错误，防止崩溃
    console.warn('⚠️ 网络连接异常或代理拦截 (updateProfile):', err.message);
    return null;
  }
}

/**
 * 保存疼痛记录
 */
export async function savePainRecord(userId, record) {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('pain_records')
    .insert({
      user_id: userId,
      record_data: record,
      created_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('Pain record save error:', error)
    return null
  }
  return data
}

/**
 * 获取用户的疼痛记录历史
 */
export async function getPainRecords(userId, limit = 50) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('pain_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Pain records fetch error:', error)
    return []
  }
  return data
}
