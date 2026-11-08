# Clash of Clans UI Redesign — Master Contract & Architecture Spec
**Proje:** CoC Analitik (TH18 Meta & In-Game UI Redesign)  
**Ana Ajan (Coordinator & Reviewer):** Antigravity  
**Tarih:** 2026-11-09  
**Durum:** Aşama 0 Tamamlandı, Aşama 1 Başlatılmaya Hazır  

---

## 1. KESİN YASAKLAR VE KORUNAN DOSYALAR (Baseline SHA-256)

Aşağıdaki dosyalar **Meta & Ordu** ve **Duvar Yazısı** sayfalarına ait olup kesinlikle **DOKUNULMAYACAKTIR**. Bu sayfalar yalnızca kabuk sekmesi olarak çağrılacak, kendi iç kahverengi pencereleri ve motorları aynen korunacaktır.

| Dosya Yolu | Baseline SHA-256 Özeti |
|---|---|
| `Fonts/cross_stitch.json` | `a312246cba85b900efae74f866321279c8289e536d51213f075d69a3f5f2487f` |
| `Fonts/plastic_canvas.json` | `80eaf42cc384cd200fcbebba657fc415734232ebd24f2793141541592a1dbd60` |
| `Fonts/tango_stitch.json` | `0790532ea8ba93c8b6c6c259d76cac234b1fd42779d428d7c7627b14c3de61c9` |
| `frontend/src/components/meta/MetaDashboardView.tsx` | `567d8603d0199bf600a9f44d6a47af12e0688917c8de515fc8fcd653fa95f972` |
| `frontend/src/components/wall/WallArtView.tsx` | `0c2ef3dfcce272dd755d9686f988ea62184998c0557f65e4f3d59ddb9f151e34` |
| `frontend/src/lib/bitmapFonts/generated.ts` | `b54ce01ab29f7e039c2de599efddc050145c12d21ab7f0d9b4a78bc9554e6166` |
| `frontend/src/lib/bitmapFonts/index.ts` | `dc7d73a74c632b17ed7b1e33d5afd0ed21b1bebf54c9daa0179dfde337cb09b8` |
| `frontend/src/lib/bitmapFonts/normalize.test.ts` | `d869a35d337746dbee9a970734f71db5e236071e273b3e9304edaeb3e2b4b5e8` |
| `frontend/src/lib/bitmapFonts/normalize.ts` | `9ce41ea0dce30421428a995832d45a9d681b737898f0f964dab19f6ada8814aa` |
| `frontend/src/lib/bitmapFonts/types.ts` | `c7757d2c5f57c1a5df51152de372e5696a9033d17487de365952bc1e76c2dc95` |
| `frontend/src/lib/wallArtEngine.test.ts` | `784b6b0e0fb562d6d14f2466967828ae02f0ab0a767e968b4da7cb2b10a214cb` |
| `frontend/src/lib/wallArtEngine.ts` | `84b35d8a6b8b392109ff5c75af8f7fc405d38d605202c73ddf3a6b01a0f57761` |
| `services/workers/leaderboard.py` | `696b46ce9c701fc2776ae14f96a298c54285ebb1a747b006a0ca2d7c6771605d` |

*Tüm süreç sonunda bu özetler tekrar hesaplanıp değişiklik olmadığı kanıtlanacaktır.*

---

## 2. DOSYA SAHİPLİĞİ VE İŞ BÖLÜMÜ

- **Ana Ajan:** `frontend/src/styles/game-theme.css` (yalnızca additive token'lar), `frontend/src/components/game/*` (paylaşılan bileşenler), `UI_REDESIGN.md`, koordinasyon ve kod inceleme.
- **Ajan A (Kabuk):** `frontend/src/components/shell/*`, `frontend/src/app/page.tsx`, layout, yönlendirme, arka plan.
- **Ajan B (Ana Sayfa):** `frontend/src/components/home/*` (Duyuru Panosu tasarımı, 6 araç kartı).
- **Ajan C (Oyuncu Profili):** `frontend/src/components/player/*` (Profilim & Birlikler tasarımı, battle log & ordu kopyalama).
- **Ajan D (Klan Görüntüleme):** `frontend/src/components/clan/*` (Klanım & Üyeler tasarımı, üye listesi).
- **Ajan E (Arama):** `frontend/src/components/search/*` (Oyuncu & Klan Arama panelleri).

---

## 3. ROTA VE DERİN BAĞLANTI ŞEMASI (Hash Routes)

Tüm rotalar tarayıcı geçmişi (back/forward) ve doğrudan paylaşılabilir URL'leri destekler:

1. `#/` veya `#/home`: Ana Sayfa (Duyuru Panosu)
2. `#/oyuncu`: Arama sayfası (varsayılan: Oyuncu Ara)
3. `#/oyuncu/:tag` (örn. `#/oyuncu/P89PCUPUQ`): Oyuncu Profili
4. `#/klan`: Klan Arama
5. `#/klan/:tag` (örn. `#/klan/UUJL8CYP`): Klan Görüntüleme (isteğe bağlı `?vurgula=:playerTag` ile üye yeşil vurgulanır)
6. `#/meta`: Meta & Ordu (variant="bare", kendi penceresini kullanır)
7. `#/cwl`: CWL Keşif (variant="bare")
8. `#/cevher`: Cevher Analizi (variant="bare")
9. `#/duvar`: Duvar Yazısı (variant="bare", kendi penceresini kullanır)

---

## 4. DESIGN TOKEN ÖLÇÜMLERİ (7 Referans Görselden)

| Öğe / Yüzey | Referans Görsel | Ölçülen Renk (Hex) | CSS Token / Sınıf |
|---|---|---|---|
| Krem Pencere Gövdesi | `profil.png` | `#E7E7DE` | `--game-window-cream-bg: #E7E7DE` |
| Pencere Dış Taş Çerçeve | `profil.png` | `#5A5552` / `#554E4D` | `--game-window-cream-border: #5A5552` |
| Pencere İç Eğim (Bevel) | `profil.png` | `#B8B6AF` | `--game-window-cream-bevel: #B8B6AF` |
| Aktif Üst Sekme | `profil.png` | `#E7E7DE` (gövdeyle birleşik) | `.game-tab-cream-active` |
| Pasif Üst Sekme | `profil.png` | `#7B7163` -> `#685E52` | `.game-tab-stone-inactive` |
| Mavi-Gri Bölüm Paneli | `profil.png` | `#8A97AD` -> `#6B7899` | `--game-section-blue-*`, `.game-section-panel` |
| Bölüm Paneli Kenarlık | `profil.png` | `#4C566E` | `--game-section-blue-border` |
| İstatistik Şerit Oyuğu | `profil.png` | `#313241` / `#4A4D7B` | `--game-section-blue-inset` |
| Efsane Lig Turnuva Paneli | `profil.png` | `#6F599A` -> `#493F75` | `--game-tournament-purple-*`, `.game-tournament-panel` |
| Gri/Gümüş Düğme (Ara) | `sosyal-oyuncu-ara.png` | `#EFECE5` -> `#B2AFA7` | `.game-btn-silver` |
| Yeşil Düğme | `klan-ara.png`, `profil.png` | `#9CE04A` -> `#519E23` | `.game-btn-panel-green` |
| Giriş Kutusu Arka Planı | `sosyal-oyuncu-ara.png` | `#FFFFFF` | `.game-input-container` |
| Giriş Kutusu `#` Öneki | `sosyal-oyuncu-ara.png` | `#7B7163` (16px+) | `.game-input-tag-prefix` |
| Alt Düğme Şeridi (Segmented) | `profil.png` | Aktif `#D8D7CE`, Pasif `#757472` | `.game-segmented-bar`, `.game-segmented-item` |
| Üye Vurgu Rengi | `klanim-uyeler.png` | `#E2F0D9` (açık yeşil zemin) | `.game-member-highlight` |

---

## 5. PAYLAŞILAN BİLEŞENLER ENVANTERİ (`components/game/*`)

1. `GameWindow`: Krem in-game pencere (`variant="cream"`) veya şeffaf sarmalayıcı (`variant="bare"`).
2. `GameTabBar` / `GameTab`: Üst sekme çubuğu ve sekmeler (krem aktif ve taş pasif sekmeleri destekler).
3. `SectionPanel`: Mavi-gri CoC profil ve birlik bölüm paneli (`title`, `icon`, `rightBadge` destekli).
4. `GameInput`: `#` önekli, iOS auto-zoom engelli (font >= 16px) oyun giriş alanı.
5. `GraySegmented`: Alt segment kontrolü (Asıl Köy, İnşaatçı Üssü, Klan Başkenti).
6. `TownHallImage`: `docs/Town Halls` manifest'inden dinamik BB görseli, TH11 rozetli yer tutucu.
7. `ClanBadge`: `referrerPolicy="no-referrer"` ve lazy loading destekli klan rozeti.
8. `SkeletonBlock`: Oyun temalı yumuşak yükleme iskeleti.

---

## 6. MEVCUT ÖZELLİKLER ENVANTERİ (KORUNMASI ZORUNLU)

Yeni tasarımda hiçbir özellik kaybolmayacaktır:
1. **Oyuncu Profili:**
   - Deneyim seviyesi yıldızı, oyuncu adı, etiket (#...), klan içi rol (Türkçe).
   - Klan adı, seviyesi ve rozeti.
   - Kazanılan savaş yıldızları (`warStars`).
   - Geçerli lig, mevcut kupa, en yüksek kupa (`bestTrophies`).
   - Bağışlanan ve alınan birlik sayıları, saldırı ve savunma zaferleri.
   - Efsane lig turnuva istatistikleri (varsa göster, yoksa gizle).
   - "Ekipmanları Cevher Analizine Aktar" butonu (`onImportPlayerToOre`).
   - Ranked Savaş Geçmişi (Battle Log): Saldırılar, savunmalar, yüzdeler, yıldızlar, çözümlenen ordular (`armyShareCode`), orduyu panoya kopyalama linki (`buildCopyArmyLink`).
   - Tüm Birlikler, Kahramanlar (aktif ekipmanları ve kilidi açık ekipmanları), Hayvanlar, Büyüler ve Kuşatma Makineleri (seviye ve MAX rozetleri).
2. **Klan Görüntüleme:**
   - Klan adı, etiketi, açıklaması, seviyesi, klan puanı, savaş ligi, konumu, dili, katılım türü, gereken kupa/BB seviyesi.
   - "CWL'de Keşfet" butonu (`onScoutClanInCwl`).
   - Herkese açık savaş günlüğü (varsa).
   - Üye listesi (sıralama: kupa, bağış, isim; seviye, lig ikonu, BB görseli, rol, bağışlar).
   - Üyeye tıklayınca oyuncu profiline yönlendirme; profilden gelindiyse yeşil satır vurgusu.
3. **Arama:**
   - Son 5 arama geçmişi (`localStorage`).
   - Oyuncu etiketi normalizasyonu (`#` temizleme/ekleme, büyük harf, O->0 dönüşümü).
   - Klan adı / etiketi araması, arama seçenekleri filtre paneli.
   - Türkçe açıklayıcı hata durumları (404, 429, geçersiz etiket, sunucu hatası).
4. **Belediye Binası Varlıkları:**
   - `docs/Town Halls` klasöründen kopyalanan 17 adet görsel (`frontend/public/town-halls/`).
   - TH11 görseli eksik olduğu için seviye rozetli oyun kutusu yer tutucusu.
   - TH17 için `Town_Hall17-1.webp` eşleşmesi.

---

## 7. İLERLEME GÜNLÜĞÜ

- [x] **AŞAMA 0: Hazırlık & Baseline**
  - 7 referans ekran görüntüsü incelendi ve pikselleri ölçüldü.
  - Baseline SHA-256 özetleri çıkarıldı (13 korunan dosya).
  - Baseline ekran görüntüleri alındı (`baseline_meta_1920.png`, `baseline_meta_stats.png`, `baseline_duvar_1920.png`).
  - Arka plan görseli (`docs/bacground/BG_2026_HammerJam_BuilderSwarm.webp` -> 205 KB) `frontend/public/background.webp` olarak yerleştirildi.
  - Belediye Binası görselleri `frontend/public/town-halls/` altına kopyalandı ve `townHallsManifest.ts` üretildi.
  - Ortak yeni bileşenler (`GameWindow`, `SectionPanel`, `GameInput`, `GraySegmented`, `TownHallImage`, `ClanBadge`, `SkeletonBlock`) yazıldı ve `components/game/index.ts` üzerinden dışa aktarıldı.
  - `game-theme.css` additive olarak güncellendi.
  - Production derlemesi ve wallArtEngine testleri (15/15) doğrulandı.
- [x] **AŞAMA 1: Ajan A (Kabuk: Arka Plan, Üst/Alt Sekme Şeridi, Gezinme)**
  - Arka plan görseli (`/background.webp`) cover & ortalı, koyu degrade katmanı ve iOS Safari uyumlu pseudo-element ile bağlandı.
  - 6'lı oyun içi sekme şeridi entegre edildi; `variant="cream"` (krem birleşik) ve `variant="bare"` (bağımsız tek pencere) çift pencere engeliyle kuruldu.
  - Mobilde alta sabit güvenli alan (safe-area) destekli sekme çubuğu ve "Daha..." bottom sheet'i hazırlandı.
- [x] **AŞAMA 2: Panellerin Uygulanması (Paralel Uzmanlar)**
  - **Ajan B (Ana Sayfa):** Duyuru panosu düzeni, altın/kahverengi bilgi şeridi, 6 adet ahşap araç kutucuğu (`klanlar-duyuru.png` referansı).
  - **Ajan C (Oyuncu Profili):** Profilim (`profil.png` & `profil-birlikler.png`), deneyim rozeti, rol, lig, kupa, efsane turnuva paneli, Belediye Binası görseli, hero ekipmanları, birlikler/büyüler/petler, ranked savaş geçmişi ve ordu kopyalama.
  - **Ajan D (Klan Görüntüleme):** Klanım (`klanim.png` & `klanim-uyeler.png`), klan rozeti, anahtar:değer bilgi tablosu, CWL analiz butonu, üye listesi (sıralama, lig ikonu, BB görseli, bağışlar, `?vurgula=ETIKET` yeşil vurgusu).
  - **Ajan E (Arama):** Oyuncu Ara (`sosyal-oyuncu-ara.png`, `#` giriş, gri Ara butonu, etiket normalizasyonu, son aramalar) ve Klan Ara (`klan-ara.png`, yeşil Ara ve Arama Seçenekleri filtre paneli).
- [x] **AŞAMA 3: Entegrasyon, Regresyon & Son Doğrulama**
  - Tüm rotalar (`#/home`, `#/oyuncu`, `#/oyuncu/:tag`, `#/klan`, `#/klan/:tag`) eksiksiz bağlandı.
  - Ölü kod `PlayerClanSearchView.tsx` başarıyla temizlendi.
  - 13 korunan dosyanın tamamının SHA-256 hash'leri baseline ile %100 birebir doğrulandı (0 bayt sapma).
  - TSX içinde ham hex kullanımı sıfırlandı (yalnızca CSS değişkenleri & semantic sınıflar).
  - `npm run build --prefix frontend` (Exit 0, 0 hata) ve tüm birim testleri (15/15 wall art, 4/4 normalizer) başarıyla geçti.
  - Tüm panellerin masaüstü (1920×1080) ve mobil (390×844) ekran görüntüleri alındı ve doğrulandı.
- [x] **AŞAMA 4: Revizyon ve Eksik Panellerin CoC Temasına Geçirilmesi (4 Paralel Ajan)**
  - **Ajan 1 (Shell & Duvar Fix):** `GameHeaderTabs` masaüstü kaydırma/scrollbar davranışı kaldırıldı. `WallArtView` altındaki mükerrer disclaimer çizgisi (`border-t border-app-border/40`) kaldırıldı.
  - **Ajan 2 (CWL Keşif):** `ScoutedArmyCard.tsx` oyun içi ahşap savaş odası temasına uyarlandı (`game-panel-wood`, altın başlıklar, yeşil `game-btn-green` ordu kopyalama butonları, TownHall seviye görselleri).
  - **Ajan 3 (Cevher Analizi):** `OreCalculatorView.tsx` CoC ahşap/kristal temasına geçirildi. Özel Parlak (Mavi), Işıltılı (Mor), Yıldızlı (Altın) kristal SVG rozetleri ve altın düğmeli 3D oyun kaydırıcıları eklendi.
  - **Ajan 4 (Bütünleşik Sekmeler & Lig İkonları):** Arama ("Oyuncu Ara / Klan Ara"), Profil ve Klan ("Asıl Köy / İnşaatçı Üssü / Klan Başkenti") sub-tab'ları en üste yapışık ve alt panelle kesintisiz bütünleşik hale getirildi. `whitespace-nowrap` ile iki satıra kırılma engellendi. Klan üye listesine 37 modern lig kademe sembolü entegre edildi (`leagueHelper.ts`).
  - Next.js production build (0 hata), `wallArtEngine.test.ts` (15/15) ve mobil 390px kontrolleri başarıyla doğrulandı.

