# TODO - Vercel API + localStorage Fallback

## ✅ Adım 1: `vercel.json` oluştur
- Vercel yönlendirme kuralları (Netlify.toml benzeri)

## ✅ Adım 2: `api/register.js` oluştur
- Vercel Serverless Function - Supabase kayıt

## ✅ Adım 3: `api/login.js` oluştur
- Vercel Serverless Function - Supabase giriş

## ✅ Adım 4: `api/me.js` oluştur
- Vercel Serverless Function - Token doğrulama

## ✅ Adım 5: `api/logout.js` oluştur
- Vercel Serverless Function - Çıkış

## ✅ Adım 6: `hesap-olustur.html` güncelle
- API çalışmazsa localStorage'a kaydet (fallback)

## ✅ Adım 7: `giris.html` güncelle
- localStorage kullanıcılarını kontrol et (fallback) - ek fonksiyonlar eklendi

## ✅ Adım 8: `admin-kullanici-listesi.html` güncelle
- localStorage admin girişi (fallback) - localAdminLogin ve API hatasında fallback eklendi

