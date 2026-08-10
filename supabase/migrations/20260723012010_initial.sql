-- ============================================================
-- PainScape 初始数据库迁移
-- 创建时间: 2026-07-23 01:20:10
-- 更新时间: 2026-08-10 (修复 RLS 策略)
-- ============================================================

-- 1. 创建 profiles 表（用户档案）
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY,
  -- 用户资料字段
  nickname    TEXT DEFAULT 'PainScape_Companion',
  avatar      TEXT DEFAULT '🧘',
  signature   TEXT DEFAULT '让说不出的痛，换一种方式抵达。🧘',
  bg_index    INTEGER DEFAULT 0,
  custom_avatar TEXT,
  custom_bg   TEXT,
  has_seen_guide BOOLEAN DEFAULT FALSE,  -- 新增：首次引导标记
  -- 原有字段
  language    TEXT NOT NULL DEFAULT 'zh',
  app_mode    TEXT NOT NULL DEFAULT 'medical',
  tone_preference TEXT NOT NULL DEFAULT 'gentle',
  medical_background JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. 创建 pain_records 表（疼痛记录）
CREATE TABLE IF NOT EXISTS pain_records (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pain_data   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按用户查询疼痛记录
CREATE INDEX IF NOT EXISTS idx_pain_records_user_id
  ON pain_records (user_id);

-- 索引：按时间排序
CREATE INDEX IF NOT EXISTS idx_pain_records_created_at
  ON pain_records (created_at DESC);

-- 3. 创建 posts 表（社区帖子）
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text          TEXT,
  img           TEXT,
  pain_tags     TEXT[],
  analogy       TEXT,
  likes         INTEGER DEFAULT 0,
  hugs          INTEGER DEFAULT 0,
  helpful_votes INTEGER DEFAULT 0,
  user_experience TEXT,
  experience_tags TEXT[],
  is_anonymous  BOOLEAN DEFAULT TRUE,
  lang          TEXT DEFAULT 'zh',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- posts 自动更新触发器
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- posts 索引
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pain_tags ON posts USING GIN (pain_tags);

-- 4. 启用行级安全（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles 行级安全策略
-- ============================================================

-- 用户只能查看自己的档案
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- 用户只能插入自己的档案
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- 用户只能更新自己的档案
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- pain_records 行级安全策略
-- ============================================================

-- 用户只能查看自己的疼痛记录
DROP POLICY IF EXISTS "Users can view own pain records" ON pain_records;
CREATE POLICY "Users can view own pain records"
  ON pain_records FOR SELECT
  USING (user_id = auth.uid());  -- ✅ 添加分号

-- 用户只能插入自己的疼痛记录
DROP POLICY IF EXISTS "Users can insert own pain records" ON pain_records;
CREATE POLICY "Users can insert own pain records"
  ON pain_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户只能删除自己的疼痛记录
DROP POLICY IF EXISTS "Users can delete own pain records" ON pain_records;
CREATE POLICY "Users can delete own pain records"
  ON pain_records FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- posts 行级安全策略
-- ============================================================

-- 任何人都可以查看帖子（公开社区）
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

-- 用户只能插入自己的帖子
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 用户只能更新自己的帖子
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 用户只能删除自己的帖子
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (user_id = auth.uid());