-- =============================================
-- 10BTV - Supabase Tablo Kurulumu + RLS + Fonksiyonlar
-- =============================================
-- Bu SQL'i Supabase SQL Editor'da çalıştır.
-- https://supabase.com > SQL Editor > New Query
-- =============================================

-- 1) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- TABLOLAR
-- =============================================

-- USERS TABLOSU
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  is_admin INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  reward_claimed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYERS TABLOSU (oyuncular)
CREATE TABLE IF NOT EXISTS players (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  pos TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'field',
  overall INTEGER NOT NULL DEFAULT 50,
  value INTEGER NOT NULL DEFAULT 1,
  pac INTEGER NOT NULL DEFAULT 50,
  pys INTEGER NOT NULL DEFAULT 50,
  drb INTEGER NOT NULL DEFAULT 50,
  pas INTEGER NOT NULL DEFAULT 50,
  sho INTEGER NOT NULL DEFAULT 50,
  def INTEGER NOT NULL DEFAULT 50,
  div INTEGER NOT NULL DEFAULT 50,
  han INTEGER NOT NULL DEFAULT 50,
  kic INTEGER NOT NULL DEFAULT 50,
  ref INTEGER NOT NULL DEFAULT 50,
  spe INTEGER NOT NULL DEFAULT 50,
  pos_stat INTEGER NOT NULL DEFAULT 50,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  ratings TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_CARDS TABLOSU (kullanıcı kartları)
CREATE TABLE IF NOT EXISTS user_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  is_special INTEGER DEFAULT 0
);

-- =============================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================

-- USERS RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Herkes kullanıcı oluşturabilir (insert)
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);

-- Kullanıcı kendi bilgilerini görebilir
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admin herkesi görebilir
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- Kullanıcı kendi coinini güncelleyebilir (sadece artırma)
CREATE POLICY "users_update_own_coins" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admin her şeyi güncelleyebilir
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- Admin silebilir
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- PLAYERS RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Herkes oyuncuları görebilir
CREATE POLICY "players_select_all" ON players
  FOR SELECT USING (true);

-- Admin oyuncu ekleyebilir
CREATE POLICY "players_insert_admin" ON players
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- Admin oyuncu güncelleyebilir
CREATE POLICY "players_update_admin" ON players
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- Admin oyuncu silebilir
CREATE POLICY "players_delete_admin" ON players
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- USER_CARDS RLS
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi kartlarını görebilir
CREATE POLICY "user_cards_select_own" ON user_cards
  FOR SELECT USING (auth.uid() = user_id);

-- Admin tüm kartları görebilir
CREATE POLICY "user_cards_select_admin" ON user_cards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- Kullanıcı kendi kartını ekleyebilir
CREATE POLICY "user_cards_insert_own" ON user_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin kart silebilir
CREATE POLICY "user_cards_delete_admin" ON user_cards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = 1)
  );

-- =============================================
-- FONKSİYONLAR
-- =============================================

-- Kullanıcı coinini getir
CREATE OR REPLACE FUNCTION get_user_coins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_coins INTEGER;
BEGIN
  SELECT coins INTO user_coins FROM users WHERE id = auth.uid();
  RETURN COALESCE(user_coins, 0);
END;
$$;

-- Coin güncelle
CREATE OR REPLACE FUNCTION update_user_coins(new_coins INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users SET coins = new_coins WHERE id = auth.uid();
  RETURN FOUND;
END;
$$;

-- Ödül talep et (hoşgeldin 100 altın)
CREATE OR REPLACE FUNCTION claim_reward()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_coins INTEGER;
  current_claimed INTEGER;
BEGIN
  SELECT coins, reward_claimed INTO current_coins, current_claimed
  FROM users WHERE id = auth.uid();
  
  IF current_claimed = 1 THEN
    RETURN -1; -- Zaten alınmış
  END IF;
  
  UPDATE users 
  SET coins = COALESCE(current_coins, 0) + 100, reward_claimed = 1
  WHERE id = auth.uid();
  
  RETURN COALESCE(current_coins, 0) + 100;
END;
$$;

-- =============================================
-- VARSAYILAN OYUNCULARI EKLE
-- =============================================
INSERT INTO players (name, pos, role, overall, value, pac, pys, drb, pas, sho, def, div, han, kic, ref, spe, pos_stat, goals, assists, matches, ratings) VALUES
  ('Tuna AS', 'STP', 'field', 88, 121, 86, 88, 86, 86, 89, 92, 50, 50, 50, 50, 50, 50, 4, 2, 2, '[7.8,9.5]'),
  ('Enes T. E.', 'SĞA', 'field', 81, 56, 90, 68, 87, 85, 84, 70, 50, 50, 50, 50, 50, 50, 2, 2, 2, '[7.5,8.1]'),
  ('Yağız E. S.', 'DOS', 'field', 79, 40, 81, 80, 77, 80, 77, 81, 50, 50, 50, 50, 50, 50, 0, 2, 2, '[8.1,7.1]'),
  ('Mehmet Ç.', 'SLA', 'field', 79, 41, 78, 75, 82, 80, 83, 75, 50, 50, 50, 50, 50, 50, 1, 0, 2, '[6.9,7.6]'),
  ('Ayhan E. B.', 'SF', 'field', 80, 79, 78, 83, 76, 75, 84, 82, 50, 50, 50, 50, 50, 50, 7, 1, 2, '[8.9,9.0]'),
  ('PUSAT', 'STP', 'field', 79, 35, 75, 84, 78, 76, 78, 80, 50, 50, 50, 50, 50, 50, 1, 0, 2, '[6.8,7.5]'),
  ('Ege ÇELİK', 'SLK', 'field', 77, 30, 76, 82, 77, 79, 74, 71, 50, 50, 50, 50, 50, 50, 0, 1, 2, '[6.7,7.4]'),
  ('Sami Y. Y.', 'STP', 'field', 75, 31, 77, 86, 63, 69, 65, 87, 50, 50, 50, 50, 50, 50, 0, 0, 2, '[7.2,8.0]'),
  ('Yusuf ÇİÇEK', 'STP', 'field', 71, 22, 73, 73, 63, 70, 66, 82, 50, 50, 50, 50, 50, 50, 0, 1, 2, '[6.4,6.8]'),
  ('Yusuf KICI', 'SF', 'field', 71, 16, 78, 80, 55, 70, 64, 79, 50, 50, 50, 50, 50, 50, 0, 0, 1, '[6.7]'),
  ('Furkan KURU', 'STP', 'field', 61, 3, 70, 60, 55, 58, 60, 60, 50, 50, 50, 50, 50, 50, 0, 0, 2, '[5.4,4.0]'),
  ('Berkay BULUNMAZ', 'STP', 'field', 67, 10, 71, 81, 42, 65, 68, 76, 50, 50, 50, 50, 50, 50, 0, 0, 1, '[6.6]'),
  ('DALYAN', 'KLC', 'keeper', 76, 18, 50, 50, 50, 50, 50, 50, 75, 76, 77, 80, 78, 69, 0, 0, 2, '[6.8,7.8]'),
  ('Samet A. DAL', 'KLC', 'keeper', 69, 9, 50, 50, 50, 50, 50, 50, 65, 65, 70, 68, 70, 73, 0, 0, 2, '[6.5,5.2]')
ON CONFLICT DO NOTHING;

