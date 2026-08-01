import { supabase } from './supabaseClient'

/**
 * 发布帖子
 */
export async function createPost(postData) {
  if (!supabase) {
    console.warn('Supabase not available, post saved to localStorage')
    // 降级：存到 localStorage
    const localPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    localPosts.unshift({
      ...postData,
      id: 'local_' + Date.now(),
      created_at: new Date().toISOString(),
    })
    localStorage.setItem('painscape_posts', JSON.stringify(localPosts))
    return localPosts[0]
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: postData.userId,
      is_anonymous: postData.isAnonymous || false,
      text: postData.content,
      pain_tags: postData.painType ? [postData.painType] : [],
      img: postData.canvasImageUrl,
      user_experience: postData.experience || null,
      experience_tags: postData.tags || [],
    })
    .select()
    .single()

  if (error) {
    console.error('Create post error:', error)
    throw error
  }
  return data
}

/**
 * 获取帖子列表（含匿名处理）
 */
export async function getPosts(limit = 50) {
  if (!supabase) {
    // 降级：从 localStorage 读取
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
    return []
  }

  // 处理匿名：隐藏真实 user_id
  return data.map(post => ({
    ...post,
    displayName: post.is_anonymous ? '匿名用户' : null,
    // 如果是匿名，前端不展示 user_id
    user_id: post.is_anonymous ? undefined : post.user_id,
  }))
}

/**
 * 获取当前用户的帖子
 */
export async function getMyPosts(userId) {
  if (!supabase) {
    const allPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    return allPosts.filter(p => p.userId === userId)
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
    // 本地降级
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    const post = posts.find(p => p.id === postId)
    if (post) post.likes = (post.likes || 0) + 1
    localStorage.setItem('painscape_posts', JSON.stringify(posts))
    return post
  }

  const { data, error } = await supabase
    .from('posts')
    .update({ likes: supabase.raw('likes + 1') })
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
    const post = posts.find(p => p.id === postId)
    if (post) post.hugs = (post.hugs || 0) + 1
    localStorage.setItem('painscape_posts', JSON.stringify(posts))
    return post
  }

  const { data, error } = await supabase
    .from('posts')
    .update({ hugs: supabase.raw('hugs + 1') })
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
 * 删除帖子（仅限本人）
 */
export async function deletePost(postId, userId) {
  if (!supabase) {
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]')
    const filtered = posts.filter(p => p.id !== postId)
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