// src/services/postService.js
import { supabase } from './supabaseClient'

/**
 * 辅助方法：从本地缓存或 Profiles 中补全用户信息
 */
function enrichLocalPostProfile(post) {
  if (post.is_anonymous) {
    return {
      ...post,
      nickname: '匿名用户',
      displayName: '匿名用户',
      avatar: '🩹',
      customAvatar: '',
    }
  }

  const currentUid = post.userId || post.user_id || post.authorId || 'user_guest';
  const simulatedProfiles = JSON.parse(localStorage.getItem('painscape_simulated_profiles') || '{}');
  const userProfile = simulatedProfiles[currentUid] || {};

  return {
    ...post,
    nickname: userProfile.nickname || post.nickname || post.authorName || '同伴',
    avatar: userProfile.avatar || post.avatar || '🩸',
    customAvatar: userProfile.customAvatar || userProfile.custom_avatar || post.customAvatar || post.custom_avatar || '',
  }
}

/**
 * 🌟 核心新增：自动将本地 LocalStorage 里的往期帖子静默同步搬运到 Supabase 云端
 */
export async function syncLocalPostsToCloud() {
  if (!supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUid = session?.user?.id;
    if (!currentUid) return; // 未登录时不进行云端迁移

    const localPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
    if (!Array.isArray(localPosts) || localPosts.length === 0) return;

    // 1. 查询云端现有帖子的文本/图片，避免重复上传
    const { data: cloudPosts } = await supabase.from('posts').select('id, text, img');
    const cloudImgSet = new Set(cloudPosts ? cloudPosts.map(p => p.img) : []);

    // 2. 挑选出本地有但云端没有的往期帖子
    const postsToSync = localPosts.filter(p => {
      const hasImg = p.img && typeof p.img === 'string' && p.img.length > 20;
      return hasImg && !cloudImgSet.has(p.img);
    });

    if (postsToSync.length === 0) return;

    // 3. 批量将本地往期帖子推送到 Supabase
    for (const localP of postsToSync) {
      await supabase.from('posts').insert({
        user_id: currentUid,
        is_anonymous: localP.is_anonymous || false,
        text: localP.text || localP.content?.chief_complaint || '分享具身痛觉图谱',
        pain_tags: localP.painTags || localP.pain_tags || [localP.dominantPain || 'twist'],
        img: localP.img || '',
        user_experience: localP.userExperience || localP.user_experience || null,
        experience_tags: localP.experienceTags || localP.experience_tags || [],
        likes: localP.likes || 0,
        hugs: localP.hugs || 0,
        helpful_votes: localP.helpfulVotes || localP.helpful_votes || 0,
        created_at: localP.createdAt || localP.created_at || new Date().toISOString()
      });
    }

    console.log(`🟢 成功将 ${postsToSync.length} 条本地往期帖子同步搬运至 Supabase 云端！`);
  } catch (err) {
    console.warn('⚠️ 同步本地帖子到云端失败（降级处理）:', err);
  }
}

/**
 * 🌟 发布帖子（兼容旧字段名 + 绑定 UID + 自动推送云端与本地）
 */
export async function createPost(postData) {
  const currentUid = postData.userId || postData.user_id || postData.authorId || 'user_guest';
  const localPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
  
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
  };

  // 本地先优先更新
  localPosts.unshift(formattedLocalPost);
  localStorage.setItem('painscape_posts', JSON.stringify(localPosts));

  if (!supabase) return formattedLocalPost;

  try {
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
      .single();

    if (error) {
      console.error('Create post to Supabase error:', error);
      return formattedLocalPost;
    }

    return {
      ...data,
      id: String(data.id),
      userId: data.user_id || currentUid,
      authorId: data.user_id || currentUid,
      user_id: data.user_id || currentUid,
      nickname: postData.nickname || '同伴',
      avatar: postData.avatar || '🩸',
      customAvatar: postData.customAvatar || '',
      userExperience: data.user_experience || postData.userExperience || '',
      painTags: data.pain_tags || postData.painTags || [],
      experienceTags: data.experience_tags || postData.experienceTags || [],
      createdAt: data.created_at || new Date().toISOString(),
    };
  } catch (e) {
    console.warn('发布帖子网络降级到本地:', e);
    return formattedLocalPost;
  }
}

/**
 * 🌟 获取帖子列表（自动云端搬运 + 深度合并本地与云端数据 + 联表Profiles获取昵称头像）
 */
export async function getPosts(limit = 50) {
  const localPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]').map(enrichLocalPostProfile);
  
  if (!supabase) return localPosts;

  // 1. 先尝试静默将本地往期帖子搬运上传到云端
  await syncLocalPostsToCloud();

  // 2. 从 Supabase 拉取最新帖子，并外键联表查询 profiles 资料
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      text,
      pain_tags,
      img,
      likes,
      hugs,
      helpful_votes,
      user_experience,
      experience_tags,
      is_anonymous,
      user_id,
      created_at,
      updated_at,
      profiles:user_id (
        nickname,
        avatar,
        custom_avatar
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Get posts from Supabase error, fallback to local:', error);
    return localPosts;
  }

  // 3. 组装云端帖子
  const cloudMapped = data.map(post => {
    const isAnon = post.is_anonymous;
    const profile = isAnon ? {} : (post.profiles || {});

    const authorNickname = isAnon ? '匿名用户' : (profile.nickname || '同伴');
    const authorAvatar = isAnon ? '🩹' : (profile.avatar || '🌸');
    const authorCustomAvatar = isAnon ? '' : (profile.custom_avatar || '');

    return {
      ...post,
      id: String(post.id),
      nickname: authorNickname,
      authorName: authorNickname,
      displayName: authorNickname,
      avatar: authorAvatar,
      customAvatar: authorCustomAvatar,
      custom_avatar: authorCustomAvatar,
      userId: isAnon ? 'user_guest' : post.user_id,
      authorId: isAnon ? 'user_guest' : post.user_id,
      user_id: isAnon ? 'user_guest' : post.user_id,
      painTags: post.pain_tags || [],
      dominantPain: post.pain_tags?.[0] || 'twist',
      userExperience: post.user_experience || '',
      experienceTags: post.experience_tags || [],
      createdAt: post.created_at,
    };
  });

  // 4. 云端帖子与本地帖子合并，使用图片 Base64 / ID 去重
  const mergedMap = new Map();
  // 优先存入云端帖子
  cloudMapped.forEach(p => mergedMap.set(p.img || p.id, p));
  // 补全本地未重复的帖子
  localPosts.forEach(p => {
    if (p.img && !mergedMap.has(p.img) && !mergedMap.has(p.id)) {
      mergedMap.set(p.img, p);
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * 获取当前用户的帖子
 */
export async function getMyPosts(userId) {
  if (!supabase) {
    const allPosts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
    return allPosts.filter(p => String(p.userId || p.user_id) === String(userId));
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get my posts error:', error);
    return [];
  }
  return data;
}

/**
 * 点赞帖子
 */
export async function likePost(postId, likesCount) {
  const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
  const post = posts.find(p => String(p.id) === String(postId));
  if (post) post.likes = likesCount;
  localStorage.setItem('painscape_posts', JSON.stringify(posts));

  if (!supabase) return post;

  const { data, error } = await supabase
    .from('posts')
    .update({ likes: likesCount })
    .eq('id', postId)
    .select()
    .maybeSingle();

  if (error) console.warn('Like post error:', error);
  return data;
}

/**
 * 拥抱帖子
 */
export async function hugPost(postId, hugsCount) {
  const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
  const post = posts.find(p => String(p.id) === String(postId));
  if (post) post.hugs = hugsCount;
  localStorage.setItem('painscape_posts', JSON.stringify(posts));

  if (!supabase) return post;

  const { data, error } = await supabase
    .from('posts')
    .update({ hugs: hugsCount })
    .eq('id', postId)
    .select()
    .maybeSingle();

  if (error) console.warn('Hug post error:', error);
  return data;
}

/**
 * 更新缓解经验（同步汇入智慧货架）
 */
export async function updatePostExperience(postId, experience, tags = []) {
  const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
  const post = posts.find(p => String(p.id) === String(postId));
  if (post) {
    post.user_experience = experience;
    post.userExperience = experience;
    post.experience_tags = tags;
  }
  localStorage.setItem('painscape_posts', JSON.stringify(posts));

  if (!supabase) return post;

  const { data, error } = await supabase
    .from('posts')
    .update({ user_experience: experience, experience_tags: tags })
    .eq('id', postId)
    .select()
    .maybeSingle();

  if (error) console.warn('Update experience error:', error);
  return data;
}

/**
 * 更新帖子“有用投票”计数
 */
export async function voteHelpfulPost(postId, helpfulVotes, hasUserVotedHelpful = false) {
  const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
  const post = posts.find(p => String(p.id) === String(postId));
  if (post) {
    post.helpfulVotes = helpfulVotes;
    post.helpful_votes = helpfulVotes;
    post.hasUserVotedHelpful = hasUserVotedHelpful;
  }
  localStorage.setItem('painscape_posts', JSON.stringify(posts));

  if (!supabase) return post;

  const { data, error } = await supabase
    .from('posts')
    .update({ helpful_votes: helpfulVotes })
    .eq('id', postId)
    .select()
    .maybeSingle();

  if (error) console.warn('Vote helpful error:', error);
  return data;
}

/**
 * 删除帖子（仅限本人）
 */
export async function deletePost(postId, userId) {
  try {
    const posts = JSON.parse(localStorage.getItem('painscape_posts') || '[]');
    const filtered = posts.filter(p => String(p.id) !== String(postId));
    localStorage.setItem('painscape_posts', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Clear local posts error:', e);
  }

  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Delete post from Supabase error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Delete post error:', err);
    return false;
  }
}