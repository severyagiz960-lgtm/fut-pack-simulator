-- =============================================
-- 10BTV - Supabase Tablo Kurulumu
-- =============================================
-- Bu SQL'i Supabase SQL Editor'da çalıştır.
-- https://supabase.com > SQL Editor > New Query

-- 1) USERS TABLOSU (zaten varsa atla)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  reward_claimed INTEGER DEFAULT 0
);

-- 2) PLAYERS TABLOSU (oyuncular)
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

-- 3) USER_CARDS TABLOSU (kullanıcı kartları)
CREATE TABLE IF NOT EXISTS user_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  is_special INTEGER DEFAULT 0
);

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

-- Admin kullanıcısını ekle (eğer yoksa)
INSERT INTO users (username, password_hash, is_admin) 
VALUES ('admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 1)
ON CONFLICT (username) DO NOTHING;
-- Şifre: 1234 (SHA256 hash ile)
