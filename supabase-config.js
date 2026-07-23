// =============================================
// 10BTV - SUPABASE BAĞLANTI AYARLARI
// =============================================
// Bu dosyayı düzenleyerek kendi Supabase bilgilerini gir.
// Supabase Dashboard > Settings > API bölümünden bulabilirsin.

window.SUPABASE_CONFIG = {
  // Supabase proje URL (örnek: https://xxx.supabase.co)
  url: 'https://fjelalizohhxezleyrtv.supabase.co',

  // Supabase anon/public key (örnek: eyJhbGciOiJIUzI1NiIs...)
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZWxhbGl6b2hoeGV6bGV5cnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjgyNjEsImV4cCI6MjA5OTcwNDI2MX0.MwXUAtd2idJPbMsBlTvqDdm9m3lYkZ1XaIqPkZAX4dY',

  // Tablo isimleri (değiştirmediysen aynen bırak)
  tables: {
    users: 'users',
    players: 'players',
    userCards: 'user_cards'
  }
};

