// src/services/postService.js
import { supabase } from './supabaseClient'

/**
 * 发布帖子（兼容旧字段名 + 强绑定 UID + 本地降级）
 */
export async function createPost(postData) {
  const currentUid = postData.userId || postData.user_id || postData.authorId || 'user_guest';
  const localPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
  
  const formattedLocalPost = {
    ...postData,
    id: postData.id || 'local_' + Date.now(),
    userId: currentUid,
    authorId: currentUid,
    user_id: currentUid,
    nickname: postData.nickname || postData.authorName || '同伴',
    avatar: postData.avatar || '🩸',
    customAvatar: postData.customAvatar || '',
    userExperience: postData.userExperience || postData.experience || null,
    user_experience: postData.userExperience || postData.experience || null,
    created_at: new Date().toISOString(),
  }

  if (!supabase) {
    console.warn('Supabase not available, post saved to localStorage')
    localPosts.unshift(formattedLocalPost)
    localStorage.setItem('painscape_posts', JSON.stringify(localPosts))
    return formattedLocalPost
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: currentUid,
      is_anonymous: postData.isAnonymous || false,
      text: postData.text || postData.content || '',
      pain_tags: postData.painTags || (postData.painType ? [postData.painType] : []),
      img: postData.img || postData.canvasImageUrl || '',
      user_experience: postData.userExperience || postData.experience || null,
      experience_tags: postData.experienceTags || postData.tags || [],
    })
    .select()
    .single()

  if (error) {
    console.error('Create post error:', error)
    localPosts.unshift(formattedLocalPost)
    localStorage.setItem('painscape_posts', JSON.stringify(localPosts))
    return formattedLocalPost
  }

  return {
    ...data,
    userId: currentUid,
    authorId: currentUid,
    nickname: postData.nickname || '同伴',
    avatar: postData.avatar || '🩸',
    customAvatar: postData.customAvatar || '',
    userExperience: data.user_experience || postData.userExperience || '',
  }
}

/**
 * 获取帖子列表（含匿名处理 + 数据字段双向兼容）
 */
export async function getPosts(limit = 50) {
  if (!supabase) {
    return JSON.parse(localStorage.getItem('painscape_posts') || '[]')
  }

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      text,
      pain_tags,
      img,
      likes,
      hugs,
      user_experience,
      experience_tags,
      is_anonymous,
      user_id,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get posts error:', error)
    return JSON.parse(localStorage.getItem('painscape_posts') || '[]')
  }

  return data.map(post => ({
    ...post,
    id: String(post.id),
    userId: post.is_anonymous ? undefined : post.user_id,
    authorId: post.is_anonymous ? undefined : post.user_id,
    displayName: post.is_anonymous ? '匿名用户' : null,
    user_id: post.is_anonymous ? undefined : post.user_id,
    painTags: post.pain_tags || [],
    dominantPain: post.pain_tags?.[0] || 'twist',
    userExperience: post.user_experience || '',
    experienceTags: post.experience_tags || [],
    createdAt: post.created_at,
  }))
}

/**
 * 获取当前用户的帖子
 */
export async function getMyPosts(userId) {
  if (!supabase) {
    const allPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    return allPosts.filter(p => p.userId === userId || p.user_id === userId)
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my posts error:', error)
    return []
  }
  return data
}

/**
 * 点赞帖子
 */
export async function likePost(postId, userId) {
  if (!supabase) {
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    const post = posts.find(p => String(p.id) === String(postId))
    if (post) post.likes = (post.likes || 0) + 1
    localStorage.setItem('painscape_posts', JSON.stringify(posts))
    return post
  }

  const { data, error } = await supabase
    .from('posts')
    .update({ likes: supabase.raw ? supabase.raw('likes + 1') : 1 })
    .eq('id', postId)
    .select()
    .single()

  if (error) {
    console.error('Like post error:', error)
    return null
  }
  return data
}

/**
 * 拥抱帖子
 */
export async function hugPost(postId) {
  if (!supabase) {
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    const post = posts.find(p => String(p.id) === String(postId))
    if (post) post.hugs = (post.hugs || 0) + 1
    localStorage.setItem('painscape_posts', JSON.stringify(posts))
    return post
  }

  const { data, error } = await supabase
    .from('posts')
    .update({ hugs: supabase.raw ? supabase.raw('hugs + 1') : 1 })
    .eq('id', postId)
    .select()
    .single()

  if (error) {
    console.error('Hug post error:', error)
    return null
  }
  return data
}

/**
 * 🌟 更新缓解经验（同步汇入智慧货架）
 */
export async function updatePostExperience(postId, experience, tags = []) {
  const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
  const post = posts.find(p => String(p.id) === String(postId))
  if (post) {
    post.user_experience = experience
    post.userExperience = experience
    post.experience_tags = tags
  }
  localStorage.setItem('painscape_posts', JSON.stringify(posts))

  if (!supabase) return post

  const { data, error } = await supabase
    .from('posts')
    .update({ user_experience: experience, experience_tags: tags })
    .eq('id', postId)
    .select()
    .single()

  if (error) {
    console.error('Update experience error:', error)
    return null
  }
  return data
}

/**
 * 删除帖子（仅限本人）
 */
export async function deletePost(postId, userId) {
  if (!supabase) {
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    const filtered = posts.filter(p => String(p.id) !== String(postId))
    localStorage.setItem('painscape_posts', JSON.stringify(filtered))
    return true
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)

  if (error) {
    console.error('Delete post error:', error)
    return false
  }
  return true
}