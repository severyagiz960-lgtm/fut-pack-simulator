# TODO - Cloudflare Pages + Supabase + localStorage Fallback

## ✅ Adım 1: Vercel/Netlify dosyalarını temizle
- `api/` klasörü silindi
- `vercel.json` silindi
- `netlify.toml` silindi
- `netlify/` klasörü silindi

## 🔄 Adım 2: Cloudflare Pages Functions oluştur (`/functions/api/`)
- `functions/api/register.js` - Kayıt (Supabase)
- `functions/api/login.js` - Giriş (Supabase + JWT)
- `functions/api/me.js` - Token doğrulama
- `functions/api/logout.js` - Çıkış

## ⏳ Adım 3: HTML fallback'leri güncelle
- `hesap-olustur.html` - Cloudflare API path'ine uygun
- `giris.html` - localStorage fallback
- `admin-kullanici-listesi.html` - localStorage admin girişi

