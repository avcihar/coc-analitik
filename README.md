# Clash of Clans (CoC) Analitik Platformu

Clash of Clans oyuncuları, klanları ve klan savaş ligi (CWL) için geliştirilmiş modern, gerçek zamanlı analitik ve meta analiz platformu.

FastAPI (Python) arka yüzü ve Next.js (TypeScript & TailwindCSS) ön yüzü, **tek bir web servisi** olarak Render üzerinde ücretsiz ve sorunsuz çalışacak şekilde tasarlanmıştır.

---

## 🌟 Öne Çıkan Özellikler

1. **Canlı Oyuncu & Klan Arama:**
   - Resmi CoC API üzerinden oyuncu profili, 6 kahraman ve kuşanılmış/açılmış ekipmanlar, evcil hayvanlar, köy ve inşaatçı üssü birlikleri.
   - Gerçek Ranked saldırı ve savunma battle log dökümü.

2. **CWL Keşif Kartı:**
   - Tur 1'den 7'ye kadar tüm CWL turları arasında gezinebilme (Savaş Günü / Hazırlık Günü sekmeleri).
   - Rakip oyuncuların en çok hangi ranked ordularını kullandığı ve **savunmada hangi orduyla 3 yıldız yediği (3★)** analizi.
   - Tek tıkla oyuna aktarılabilen gerçek ordu kopyalama linkleri (`https://link.clashofclans.com/...`).

3. **TH18 Meta & Ordu Tavsiyeleri:**
   - Dünyanın en iyi 200 TH18 oyuncusunun battlelog ve ekipman kombinasyonlarının taranması.
   - Başarı oranına göre sıralanmış en iyi 5 meta ordusu ve kahraman ekipman çifti kullanım yüzdeleri.

4. **Cevher Analizi & Simülasyon Motoru:**
   - 37 kademeli yeni lig sistemi (Titan, Efsane vb.) ile günlük yıldız bonusu, CWL ve klan savaşı gelirleriyle ekipman seviye atlatma simülasyonu.

---

## 🔤 Duvar Yazısı: Yeni Font Nasıl Eklenir?
1. Yeni fontunuzu JSON formatında (`{"A": [[0,1,...]], ...}`) hazırlayın (ince font için daha az hücreli glifler tasarlayın).
2. Dosyayı `Fonts/<font_adi>.json` olarak projeye ekleyin.
3. Terminalde `npm run build-fonts --prefix frontend` (veya `node scripts/build_bitmap_fonts.mjs`) çalıştırın.
4. Font otomatik olarak doğrulanıp "Duvar Yazısı" sayfasında listelenir.

---

## 🚀 Render'a Tek Web Servisi Olarak Deploy Rehberi (Ücretsiz Plan)

Bu proje, frontend'i Next.js static export olarak derleyip FastAPI üzerinden sunar; tek bir Render Web Service ile hem ön yüz hem arka yüz birlikte çalışır.

### Adım 1: GitHub Reponuzu Oluşturun ve Yükleyin
```bash
git init
git add .
git commit -m "feat: initial commit for render deployment"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/REPONUZ.git
git push -u origin main
```

### Adım 2: Render.com Üzerinde Web Servisi Oluşturun
1. [dashboard.render.com](https://dashboard.render.com) adresine gidin.
2. **New +** butonuna basıp **Web Service** seçin.
3. GitHub reponuzu seçin.
4. Aşağıdaki ayarları uygulayın:
   - **Name:** `coc-analytics`
   - **Region:** `Frankfurt (EU Central)` veya size en yakın bölge
   - **Branch:** `main`
   - **Runtime:** `Python`
   - **Build Command:** `./build.sh`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan Type:** `Free`

*(Alternatif olarak reponuzdaki `render.yaml` sayesinde **New + -> Blueprint** seçerek tek tıkla da başlatabilirsiniz).*

### Adım 3: Ortam Değişkenlerini (Environment Variables) Tanımlayın
Render paneli **Environment** sekmesinde şu değişkenleri ekleyin:

| Değişken | Değer / Açıklama | Zorunlu mu? |
|---|---|---|
| `COC_API_TOKEN` | Clash of Clans API token'ınız veya proxy token'ınız. | **Evet** |
| `COC_API_BASE` | CoC API adresi. Doğrudan Supercell için: `https://api.clashofclans.com/v1`<br>Render dinamik IP'si için proxy kullanıyorsanız: `https://cocproxy.royaleapi.dev/v1` | İsteğe bağlı (Varsayılan: Supercell) |
| `REDIS_URL` | Redis bağlantı adresi (örn: `redis://red-xxx:6379`). **Boş bırakırsanız bellek içi TTL önbelleğe düşer.** | **Hayır (Opsiyonel)** |
| `PYTHON_VERSION` | `3.12.7` | Evet |
| `CORS_ORIGINS` | `*` | Evet |

> [!IMPORTANT]
> **API 403 Forbidden ve IP Kısıtlaması:**
> Resmi Supercell API anahtarları tek bir statik IP adresine bağlanır. Render ücretsiz planında giden IP dinamik olduğu için doğrudan `https://api.clashofclans.com/v1` kullanırken 403 hatası alabilirsiniz.
> Bu sorunu çözmek için ücretsiz **RoyaleAPI CoC Proxy** kullanabilir ve Render'da `COC_API_BASE=https://cocproxy.royaleapi.dev/v1` tanımlayabilirsiniz.

### Adım 4: Dağıtımı Başlatın (Deploy)
**Save Changes** veya **Deploy** butonuna tıklayın.
- `build.sh` sırasıyla Python bağımlılıklarını kuracak (`requirements.txt`), ardından Next.js ön yüzünü `out/` dizinine derleyecektir.
- Backend başladığında `/health` rotası sistem durumunu (`{"status": "ok", "cache": "in-memory"}`) dönecektir.

---

## ⚡ Performans & Free Plan Optimizasyonları

- **Soğuk Başlangıç (Cold Start) Koruması:** Render uyku modundan uyandığında veya ilk açılışta ağır meta analizi HTTP isteklerini kilitlemez. Arka plan görevi (`asyncio.create_task`) olarak çalışır ve kullanıcıya arayüzde *"Veriler hazırlanıyor..."* durumu gösterilir.
- **Bellek Koruma (Free 512MB RAM):** 200 oyuncunun ham battle log kayıtları işlenip meta istatistikler ve ordu tavsiyeleri çıkarıldıktan sonra ham profiller anında bellekten atılır (`del` & `gc.collect()`). Yalnızca özet istatistik cache'te tutulur.
- **Dahili In-Memory Cache:** `REDIS_URL` tanımlanmadığında veya Redis çöktüğünde sistem hata vermez, dahili TTL'li bellek içi önbellekleme devreye girer.
- **Hız Sınırı & Bounded Concurrency:** CoC API çağrıları eşzamanlı maksimum 10 istekle sınırlandırılmıştır (`asyncio.Semaphore(10)`). 429 veya 503 durumlarında üstel geri çekilme (exponential backoff) uygulanır.

---

## 💻 Yerel Geliştirme (Local Development)

### 1. Ortam Dosyasını Hazırlayın
```bash
cp .env.example .env
# .env dosyasını açıp geçerli COC_API_TOKEN bilginizi girin
```

### 2. Python Backend'i Başlatın
```bash
pip install -r requirements.txt
python main.py
# veya: uvicorn main:app --reload --port 8000
```

### 3. Frontend'i Production Modunda Test Edin (Tek Servis Olarak)
```bash
cd frontend
npm install
npm run build
cd ..
python main.py
```
Tarayıcınızda `http://localhost:8000` adresine gittiğinizde uygulamanın hem frontend'i hem backend API'si tek port üzerinden kusursuz çalışacaktır.

### 4. Testleri Çalıştırın
```bash
python -m pytest
```

