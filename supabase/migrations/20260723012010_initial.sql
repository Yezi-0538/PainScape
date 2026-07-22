-- ============================================================
-- PainScape 初始数据库迁移
-- 创建时间: 2026-07-23 01:20:10
-- ============================================================

-- 1. 创建 profiles 表（用户档案）
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY,
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

-- 3. 启用行级安全（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_records ENABLE ROW LEVEL SECURITY;

-- profiles 行级安全策略：用户只能访问自己的档案
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- pain_records 行级安全策略：用户只能访问自己的记录
CREATE POLICY "Users can view own pain records"
  ON pain_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pain records"
  ON pain_records FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own pain records"
  ON pain_records FOR DELETE
  USING (user_id = auth.uid());
