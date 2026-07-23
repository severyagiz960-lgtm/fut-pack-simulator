// =============================================
// 10BTV - SUPABASE CLIENT (Doğrudan Tarayıcı)
// =============================================
// Bu dosya tüm Supabase işlemlerini yönetir.
// server.js veya herhangi bir backend API gerektirmez.
// =============================================

(function() {
  'use strict';

  // --- Supabase CDN'den yükle ---
  if (typeof window.supabase === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = initSupabase;
    document.head.appendChild(script);
  } else {
    initSupabase();
  }

  function initSupabase() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes('YOUR_SUPABASE')) {
      console.warn('⚠️ Supabase ayarları eksik! supabase-config.js dosyasını düzenleyin.');
      return;
    }

    const { createClient } = window.supabase;
    const supabase = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: '10BTV_supabase_auth'
      }
    });

    // =============================================
    // 10BTV SUPABASE API
    // =============================================
    const sb = {
      client: supabase,

      // ----- AUTH -----
      async register(username, password) {
        // Önce username'in benzersiz olduğunu kontrol et
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          return { ok: false, message: 'Bu kullanıcı adı zaten alınmış.' };
        }

        // Supabase Auth kullanarak email yerine username ile kayıt
        // Supabase Auth email gerektirir, o yüzden username@10btv.local kullan
        const email = `${username}@10btv.local`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { username: username }
          }
        });

        if (authError) {
          return { ok: false, message: authError.message };
        }

        // Kullanıcıyı users tablosuna ekle (coins ile)
        const userId = authData.user?.id;
        if (userId) {
          // Yeni kullanıcı oluştur (is_admin = 0, coins = 0)
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              username: username,
              is_admin: 0,
              coins: 100, // Hoşgeldin bonusu
              reward_claimed: 0,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Kullanıcı oluşturma hatası:', insertError);
            return { ok: false, message: 'Kullanıcı oluşturulamadı.' };
          }
        }

        return { ok: true, username: username };
      },

      async login(username, password) {
        const email = `${username}@10btv.local`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          return { ok: false, message: 'Kullanıcı adı veya parola hatalı.' };
        }

        // Kullanıcı bilgilerini users tablosundan al
        const userId = data.user?.id;
        let isAdmin = false;
        if (userId) {
          const { data: userData } = await supabase
            .from('users')
            .select('is_admin, username')
            .eq('id', userId)
            .maybeSingle();
          
          if (userData) {
            isAdmin = userData.is_admin === 1;
          }
        }

        return {
          ok: true,
          username: data.user?.user_metadata?.username || username,
          isAdmin: isAdmin
        };
      },

      async logout() {
        const { error } = await supabase.auth.signOut();
        return { ok: !error, message: error?.message };
      },

      async getSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        // users tablosundan kullanıcı bilgisi
        const userId = session.user.id;
        const { data: userData } = await supabase
          .from('users')
          .select('username, is_admin, coins')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) return null;

        return {
          userId: userId,
          username: userData.username,
          isAdmin: userData.is_admin === 1,
          coins: userData.coins || 0
        };
      },

      async getCurrentUser() {
        const session = await this.getSession();
        return session;
      },

      async onAuthChange(callback) {
        supabase.auth.onAuthStateChange((event, session) => {
          callback(event, session);
        });
      },

      // ----- PLAYERS -----
      async getPlayers() {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('overall', { ascending: false });

        if (error) {
          console.error('Oyuncu yükleme hatası:', error);
          return null;
        }
        return { ok: true, players: data };
      },

      async getPlayer(id) {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) return null;
        return { ok: true, player: data };
      },

      // ----- USER CARDS -----
      async getMyCards(userId) {
        const { data, error } = await supabase
          .from('user_cards')
          .select('*, player:players(*)')
          .eq('user_id', userId)
          .order('opened_at', { ascending: false });

        if (error) {
          console.error('Kart yükleme hatası:', error);
          return null;
        }
        return { ok: true, cards: data || [] };
      },

      // ----- COINS -----
      async getCoins(userId) {
        const { data, error } = await supabase
          .from('users')
          .select('coins')
          .eq('id', userId)
          .maybeSingle();

        if (error || !data) return { ok: false, coins: 0 };
        return { ok: true, coins: data.coins || 0 };
      },

      async updateCoins(userId, newCoins) {
        const { error } = await supabase
          .from('users')
          .update({ coins: newCoins })
          .eq('id', userId);

        return { ok: !error, message: error?.message };
      },

      // ----- PACK OPENING -----
      async openPack(userId, packId) {
        // Paket fiyatları
        const prices = { 1: 50, 2: 300, 3: 1000, 4: 3000, 5: 10000 };
        const price = prices[packId];
        if (!price) return { ok: false, message: 'Geçersiz paket.' };

        // Kullanıcının coinini kontrol et
        const coinResult = await this.getCoins(userId);
        if (!coinResult.ok || coinResult.coins < price) {
          return { ok: false, message: 'Yetersiz altın!' };
        }

        // Rastgele oyuncu seç (overall aralığına göre)
        let minOvr = 50, maxOvr = 99;
        switch(packId) {
          case 1: minOvr = 50; maxOvr = 70; break; // Bronz
          case 2: minOvr = 70; maxOvr = 75; break; // Gümüş
          case 3: minOvr = 75; maxOvr = 80; break; // Altın
          case 4: minOvr = 80; maxOvr = 85; break; // Seçkin
          case 5: minOvr = 85; maxOvr = 99; break; // Efsane
        }

        const { data: players, error: playerError } = await supabase
          .from('players')
          .select('*')
          .gte('overall', minOvr)
          .lte('overall', maxOvr);

        if (playerError || !players || players.length === 0) {
          return { ok: false, message: 'Bu aralıkta oyuncu bulunamadı.' };
        }

        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const isSpecial = Math.random() < 0.08 ? 1 : 0; // %8 özel kart

        // Karta ekle
        const { error: cardError } = await supabase
          .from('user_cards')
          .insert({
            user_id: userId,
            player_id: randomPlayer.id,
            is_special: isSpecial,
            opened_at: new Date().toISOString()
          });

        if (cardError) {
          console.error('Kart ekleme hatası:', cardError);
          return { ok: false, message: 'Kart eklenemedi.' };
        }

        // Coin düş
        const newCoins = coinResult.coins - price;
        await this.updateCoins(userId, newCoins);

        return {
          ok: true,
          coins: newCoins,
          player: randomPlayer,
          is_special: isSpecial
        };
      },

      // ----- CLAIM REWARD (Hoşgeldin 100 altın) -----
      async claimReward(userId) {
        // Kullanıcının reward_claimed durumunu kontrol et
        const { data: userData } = await supabase
          .from('users')
          .select('coins, reward_claimed')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) return { ok: false, message: 'Kullanıcı bulunamadı.' };
        if (userData.reward_claimed === 1) {
          return { ok: false, message: 'Bu ödül zaten alınmış.' };
        }

        const newCoins = (userData.coins || 0) + 100;
        const { error } = await supabase
          .from('users')
          .update({ coins: newCoins, reward_claimed: 1 })
          .eq('id', userId);

        if (error) return { ok: false, message: 'Ödül alınamadı.' };

        return { ok: true, coins: newCoins };
      },

      // ----- ADMIN: USERS -----
      async adminGetUsers() {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return null;
        return { ok: true, users: data };
      },

      async adminUpdatePassword(userId, newPassword) {
        // Supabase Auth üzerinden şifre değiştir
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword
        });
        return { ok: !error, message: error?.message };
      },

      async adminAddCoins(userId, amount) {
        const { data: userData } = await supabase
          .from('users')
          .select('coins')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) return { ok: false, message: 'Kullanıcı bulunamadı.' };

        const newCoins = (userData.coins || 0) + amount;
        const { error } = await supabase
          .from('users')
          .update({ coins: newCoins })
          .eq('id', userId);

        return { ok: !error, message: error?.message };
      },

      async adminDeleteUser(userId) {
        // Önce user_cards temizle
        await supabase.from('user_cards').delete().eq('user_id', userId);
        // users tablosundan sil
        const { error } = await supabase.from('users').delete().eq('id', userId);
        return { ok: !error, message: error?.message };
      },

      // ----- ADMIN: PLAYERS -----
      async adminCreatePlayer(data) {
        const { error } = await supabase.from('players').insert(data);
        return { ok: !error, message: error?.message };
      },

      async adminUpdatePlayer(id, data) {
        const { error } = await supabase.from('players').update(data).eq('id', id);
        return { ok: !error, message: error?.message };
      },

      async adminDeletePlayer(id) {
        // Önce user_cards temizle
        await supabase.from('user_cards').delete().eq('player_id', id);
        const { error } = await supabase.from('players').delete().eq('id', id);
        return { ok: !error, message: error?.message };
      }
    };

    // Global olarak tanımla
    window._supabase = supabase;
    window.SB = sb;
    console.log('✅ 10BTV Supabase client başlatıldı.');
  }

})();

