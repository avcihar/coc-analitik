# Proje Kuralları (PROJECT_RULES)

Bu dosya, CoC Analitik projesi üzerinde çalışacak yeni agent pencereleri için kalıcı proje belleğidir. Tüm geliştirme ve tasarım adımlarında aşağıdaki kurallara uyulur:

1. **Altın Referans Sayfalar ve Korunan Dosyalar (Yalnızca Açık Talimatla Değiştirilir)**
   - **Meta & Ordu** ve **Duvar Yazısı** sayfaları tasarım dilinin altın referansıdır. Aşağıdaki dosyalar kullanıcıdan açık talimat gelmedikçe **değiştirilmez**:
     - Bileşenler: `frontend/src/components/meta/MetaDashboardView.tsx`, `frontend/src/components/wall/WallArtView.tsx`
     - Motor ve font kütüphaneleri: `frontend/src/lib/wallArtEngine.ts`, `frontend/src/lib/bitmapFonts/*` (`generated.ts`, `index.ts`, `normalize.ts`, `types.ts`), `scripts/build_bitmap_fonts.mjs`, `scripts/build_bitmap_fonts.py`
     - Font ve duvar varlıkları: `Fonts/*` (`cross_stitch.json`, `plastic_canvas.json`, `tango_stitch.json`), `frontend/public/bitmap-fonts/index.json`, `frontend/public/walls/Wall19.webp`
     - İlgili backend uçları ve servisleri: `api_server/main.py` içindeki `/api/v1/rankings/players`, `/api/v1/meta/top-analysis`, `/api/v1/meta/dashboard` uçları ve `services/meta_engine/equipment_meta.py`
     - İlgili testler: `frontend/src/lib/metaStats.test.ts`, `frontend/src/lib/wallArtEngine.test.ts`, `frontend/src/lib/bitmapFonts/normalize.test.ts`, `services/meta_engine/tests/test_equipment_meta.py`, `tests/test_bitmap_fonts.py`, `tests/test_wall_art_grid.py`

2. **Gerçek Veri İlkesi (Sahte/Uydurma Veri Yok)**
   - Arayüzde sahte, örnek veya uydurma veri gösterilmez.
   - CoC API yanıtında bulunmayan alanlar arayüzde yer almaz.
   - Oyunda olup API'de bulunmayan işlevler (ör. oyuncu sırası, Düzenle/Ayrıl düğmeleri) arayüze eklenmez.

3. **API Güvenliği ve Cache Kullanımı**
   - Clash of Clans API anahtarı yalnızca sunucuda (`api_server` / `.env`) tutulur, istemciye sızdırılmaz.
   - Yeni API çağrıları minimumda tutulur; mümkün olan her yerde mevcut cache katmanı kullanılır.

4. **Supercell İçerik ve Telif Politikası**
   - Supercell görselleri hotlink edilmez ve harici kaynaklardan otomatik kopyalanmaz; kullanıcı kendi dosyalarını ilgili klasöre yerleştirir.
   - Repo özeldir. Sitenin altında *"Supercell ile bağlantılı değildir, Fan Content Policy kapsamındadır"* notu korunur.

5. **Görsel/Font/İkon Politikası (AI Üretimi Yasak)**
   - AI ile üretilmiş ikon, font veya görsel **kullanılmaz**.
   - İhtiyaç duyulan varlıklar `design/ASSET_NEEDS.md` dosyasında listelenir; kullanıcı bunları kendisi indirip belirtilen hedef klasöre koyar.
   - Mevcut yerel **Lilita One** font dosyası korunur.

6. **Dil, Mobil Öncelik ve Erişilebilirlik**
   - Arayüz dili **Türkçe**dir.
   - Tasarım **mobil (390px) öncelikli** yapılır.
   - Dokunma hedefleri (buton, sekme, tıklanabilir öğeler) en az **44px** yüksekliğinde/boyutunda olmalıdır.
   - Giriş alanlarının (`input`, `select`, `textarea`) yazı boyutu mobilde yakınlaştırmayı tetiklememek için en az **16px** olmalıdır.
   - Hiçbir ekran genişliğinde **yatay taşma** (`horizontal overflow`) olmamalıdır.

7. **Tasarım Token'ları ve Stil Kuralları**
   - Renkler yalnızca CSS/tasarım token'larından gelir; bileşenlerde ham hex kodu kullanılmaz.
   - Mevcut `--game-*` token değerleri **değiştirilmez**, yalnızca ihtiyaç halinde yeni token'lar eklenir.

8. **Çalışma Disiplini ve Onay**
   - Her aşama sonunda **durulur ve rapor verilir**; önce kod/tasarım incelenip raporlanır, onay sonrası uygulanır.
   - Büyük değişiklikler öncesinde kullanıcıya `git commit` veya `git tag` alması hatırlatılır.
