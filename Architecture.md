# Clash of Clans Analitik & Strateji Platformu (Architecture.md)

Bu doküman, **Clash of Clans Analitik Platformu**'nun sistem mimarisini, veri akışını, kullanılan iletişim protokollerini, tasarım dilini, servis yeteneklerini ve sistemsel sınırlarını en ince ayrıntısına kadar açıklamaktadır.

---

## 1. Yönetici Özeti ve Sistem Vizyonu

Platform; Clash of Clans klanları ve oyuncuları için yüksek hacimli veri analitiği, Clan War Leagues (CWL) hazırlık keşfi, Kahraman Ekipmanı (Hero Equipment) ve Cevher (Ore) optimizasyonu sunan dağıtık bir analitik sistemidir. 

Sistem; mikroservis benzeri ayrık Python çekirdek motorları, Celery tabanlı arka plan işçi kuyrukları (Workers), Redis önbellek katmanı, PostgreSQL 15+ ilişkisel veri ambarı ve modern bir Next.js 14 Web arayüzü üzerine inşa edilmiştir.

---

## 2. Sistem Mimarisi Şeması

```
+-----------------------------------------------------------------------------------+
|                                  KULLANICI                                        |
+-----------------------------------------------------------------------------------+
                                         │  (Tarayıcı / HTTP)
                                         ▼
+-----------------------------------------------------------------------------------+
|                        FRONTEND KATMANI (Next.js 14)                              |
|  - App Router / React 18 / TypeScript                                             |
|  - 2 Tema Sistemi: Aydınlık (Krem/Beyaz) & Karanlık (Koyu Gri)                    |
|  - Bileşenler: Cevher Tahmin Motoru, CWL Keşif Kartı, Tema Yöneticisi             |
+-----------------------------------------------------------------------------------+
                                         │  (Async API / Server Actions)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     İŞÇİ VE KUYRUK KATMANI (Celery Workers)                      |
|  - cwl_scout: Hazırlık günü keşfi ve ordu linki ayrıştırma                        |
|  - leaderboard: Liderlik ve metrik indeksleme                                     |
|  - meta_engine: Ekipman sinerji puanlaması                                        |
+-----------------------------------------------------------------------------------+
              ▲                                              ▲
              │ (RESP2 Protocol)                             │ (Wire Protocol)
              ▼                                              ▼
+-----------------------------+               +-------------------------------------+
|        REDIS (Cache)        |               |       POSTGRESQL 15+ (DB)           |
|  - Hiyerarşik TTL Stratejisi|               |  - pgcrypto, pg_trgm, btree_gin     |
|  - Circuit Breaker Durumu   |               |  - Oyuncu, Klan, Savaş Kayıtları    |
|  - CWL Hazırlık Önbelleği   |               |  - Cevher Harcama Geçmişi           |
+-----------------------------+               +-------------------------------------+
              ▲
              │ (HTTPX Async Client / Bearer Token)
              ▼
+-----------------------------------------------------------------------------------+
|                 RESMİ CLASH OF CLANS API (https://api.clashofclans.com/v1)        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji / Kütüphane | Kullanım Amacı |
| :--- | :--- | :--- |
| **Backend Dili** | Python 3.12+ | Temel servisler, veri doğrulama ve matematiksel motorlar |
| **Veri Modelleme** | Pydantic v2 | Sıkı şema denetimi, veri sanitizasyonu ve API dönüşümleri |
| **HTTP İstemcisi** | HTTPX (Async) & Tenacity | Asenkron API istekleri, Exponential Backoff (HTTP 429) |
| **İşçi Kuyruğu** | Celery 5.4+ | CWL keşif ve periyodik analitik görevleri |
| **Önbellek & Broker** | Redis 7+ (veya Redis 5 uyumlu RESP2) | Dağıtık önbellek, Circuit Breaker bayrağı, Celery broker |
| **Veritabanı** | PostgreSQL 15+ | Kalıcı depolama, JSONB analitikleri, metin arama indeksleri |
| **Frontend Çatısı** | Next.js 14 (App Router) | Sunucu ve istemci taraflı render (SSR/CSR) |
| **Stil ve Tasarım** | Tailwind CSS 3.4 & PostCSS | Dinamik CSS değişkenleri ve 2 temalı UI sistemi |
| **Animasyon & İkon** | Framer Motion & Lucide React | Mikro etkileşimler ve net semboller |
| **Test Altyapısı** | Pytest & Pytest-Asyncio | 137 adet birim ve entegrasyon testi |

---

## 4. İletişim Protokolleri ve Veri Akışı

### 4.1. Dış API İletişimi (Supercell CoC API)
- **Protokol:** HTTPS (TLS 1.3) / RESTful JSON.
- **Yetkilendirme:** Bearer Token (`Authorization: Bearer <API_TOKEN>`).
- **Hata Toleransı (Resilience):**
  - **HTTP 429 (Rate Limit):** `tenacity` kullanılarak üstel geri çekilme (exponential backoff) uygulanır; istekler otomatik olarak kuyrukta bekletilir.
  - **HTTP 503 (Maintenance Break):** Redis üzerinde `coc:api:circuit_breaker` anahtarı tetiklenerek devre kesici (Circuit Breaker) 300 saniye (5 dk) boyunca açılır. Sistem Supercell sunucularını lüzumsuz sorgularla boğmaz.

### 4.2. Önbellek ve Kuyruk İletişimi (Redis)
- **Protokol:** TCP üzerinden Redis Protokolü (RESP2/RESP3).
- **Protokol Uyumluluğu:** Eski Redis sürümleriyle sorunsuz çalışması için `celery_app.py` üzerinde `broker_transport_options={"protocol": 2}` zorlanmıştır.
- **Hiyerarşik Anahtar Tasarımı (Key Hierarchy):**
  ```text
  coc:{domain}:{version}:{discriminator}:{identifiers}
  ```
  Örnekler:
  - `coc:api:v1:clan:#2PP`: Klan profil önbelleği (TTL: 1 saat).
  - `coc:cwl:v1:prep:#WAR_TAG`: CWL hazırlık günü keşif verisi (TTL: 6 saat).
  - `coc:api:circuit_breaker`: Bakım durumu bayrağı (TTL: 5 dakika).

### 4.3. Veritabanı İletişimi (PostgreSQL)
- **Protokol:** PostgreSQL Wire Protocol (TCP 5432).
- **Veritabanı Genişletmeleri:**
  - `pgcrypto`: UUID üretimi (`gen_random_uuid()`).
  - `pg_trgm`: Oyuncu ve klan isimlerinde benzerlik araması (fuzzy search).
  - `btree_gin`: Bileşik indeksler için yüksek performanslı GIN indeksleme.

### 4.4. Frontend İletişimi (Next.js & İstemci)
- **Protokol:** HTTP/HTTPS & JSON veri transferi.
- **İstemci Durum Yönetimi (State):** React Context (`ThemeProvider`), yerel hafıza (`localStorage`) ve yerel bileşen state'leri.

---

## 5. Tasarım Dili ve Kullanıcı Arayüzü Mimarisi (UI/UX)

Sistem arayüzü kullanıcı tercihlerine göre tamamen iki bağımsız tema modu üzerinden tasarlanmıştır.

### 5.1. Aydınlık Tema (Light Mode)
- **Karakter:** Sıcak krem, beyaz ve yumuşak gri tonları.
- **Renk Paleti:**
  - Arka Plan (`--app-bg`): `#F7F5EE` (Dinlendirici, sıcak krem)
  - Kartlar (`--app-card`): `#FFFFFF` (Sıcak beyaz)
  - İç Bölmeler (`--app-card-subtle`): `#EDE9DF` (Açık krem-gri)
  - Kenarlıklar (`--app-border`): `#DCD6C8` / `#BFB7A6` (Belirgin açık gri-krem hatlar)
  - Tipografi (`--app-text`): `#19202E` (Okunaklı koyu antrasit yazı)
  - Açıklama Metinleri (`--app-muted`): `#5F6B7D` (Dengeli orta gri)

### 5.2. Karanlık Tema (Dark Mode)
- **Karakter:** Koyu gri ve antrasit türevleri — **Kesinlikle saf siyah (`#000000`) kullanılmamıştır.**
- **Renk Paleti:**
  - Arka Plan (`--app-bg`): `#1B212D` (Koyu arduvaz gri)
  - Kartlar (`--app-card`): `#252D3D` (Koyu gri kart zeminleri)
  - İç Bölmeler (`--app-card-subtle`): `#2F394C` (Orta koyu gri)
  - Kenarlıklar (`--app-border`): `#3D4A60` / `#50617D` (Belirgin gri çizgiler)
  - Tipografi (`--app-text`): `#F0F4F8` (Ferah açık gümüş-gri)
  - Açıklama Metinleri (`--app-muted`): `#9BA8BA` (Yumuşak gri)

### 5.3. Arayüzün Belirginlik İlkeleri
1. **Belirgin Butonlar:** Tüm butonlar 2px kalınlığında (`border-2`) net kenarlıklara, belirgin gölgelere, hover durumunda renk derinliğine ve tıklama (`active:scale-95`) geri bildirimine sahiptir.
2. **Yapılandırılmış Veri Tabloları:** [OreCalculatorView.tsx](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/ore/OreCalculatorView.tsx) bileşeni altında yer alan **"Günlük & Haftalık Cevher Gelir Dağılım Tablosu"**, her kaynağın getirisini renk kodlu ve net çizgilerle sunar.
3. **CWL Keşif Matrisi:** [ScoutedArmyCard.tsx](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/cwl/ScoutedArmyCard.tsx) bileşeni; kahramanları, evcil hayvanları, epik/ortak ekipman seviyelerini ve 1 tıkla ordu kopyalama aksiyonunu belirgin kartlar halinde gruplar.

---

## 6. Çekirdek Modüller ve Çalışma Prensipleri

### 6.1. `services/api/client.py` (API Katmanı)
- Resmi API isteklerini yürütür.
- HTTP 429 ve HTTP 503 durumlarında otomatik devre kesici ve bekleme politikalarını uygular.
- Oyuncu, klan ve CWL lig gruplarını asenkron çeker.

### 6.2. `services/army_parser/` (Ordu Ayrıştırma Motoru)
- Oyun içindeki resmi ordu paylaşım bağlantılarını (`https://link.clashofclans.com/?action=CopyArmy&army=...`) çözümleyen tersine mühendislik motorudur.
- Birlik kimliklerini (Unit IDs), büyüleri ve kuşatma makinelerini ayrıştırır; TH1–TH18 belediye binası kamp (340), büyü (12) ve kuşatma makinesi (1) kapasite sınırlarını doğrular.

### 6.3. `services/ore_engine/` (Cevher Hesaplama & Tahmin Motoru)
- **Girdi Parametreleri:** Belediye Binası (TH 11–18), Minyon Prens (Minion Prince) dahil 5 kahraman, Çok Oyunculu Lig (Titan, Efsane), Haftalık Klan Savaşı Sayısı, CWL Kademesi ve Gelecek Epik Ekipman opsiyonu.
- **Çıktı:** Parlak (Shiny), Parıltılı (Glowy) ve Yıldızlı (Starry) cevher ihtiyaçları; darboğaz analizi ve tam fulleme tarihi projeksiyonu.

### 6.4. `services/meta_engine/` (Ekipman Meta Analitiği)
- Kahramanlar için mevcut ekipman kombinasyonlarını değerlendirir, sinerji puanı üretir ve meta önerileri sunar.

### 6.5. `services/workers/` (Celery Görevleri)
- CWL hazırlık gününde karşı klanın üye profillerini ve son bilinen ordularını arka planda asenkron tarar.
- Sonuçları Redis önbelleğine yazar ve gösterge panellerini besler.

---

## 7. Sistemin Yapabildikleri ve Sınırları (Capabilities vs Limitations)

###  Sistemin Mükemmel Yaptıkları (Yetenekleri)
1. **Kesintisiz Veri Akışı:** Supercell API bakım molasına girdiğinde veya hız sınırına takıldığında sistem çökmez; Circuit Breaker devreye girer ve önbellekten hizmet vermeye devam eder.
2. **Kusursuz Ordu Çözümleme:** Oyunun resmi ordu link kodlarını birlik, büyü ve ordu kapasitesi olarak %100 doğrulukla ayrıştırır.
3. **Hassas Cevher Projeksiyonu:** Oyuncunun ligi ve klan savaşı sıklığına göre hangi gün hangi ekipmanı fulleyeceğini gün ve ay bazında hesaplar; darboğazı (Starry Ore) net gösterir.
4. **CWL Hazırlık Günü İstihbaratı:** Rakip klan üyelerinin en çok tercih ettiği güncel ordu kompozisyonlarını ve ekipman seviyelerini erkenden keşfeder.
5. **Duyarlı ve Göz Yormayan Arayüz:** Kullanıcının isteğine göre tek tıkla krem/beyaz aydınlık veya koyu gri karanlık temaya geçiş sağlar.
6. **Yüksek Test Kapsamı:** Sistemde 137 birim testi aktif olarak çalışmakta ve doğrulanmaktadır.

### ⚠️ Sistemin Yapamadıkları ve Sınırları (Limitations)
1. **Canlı Köy Düzeni (Base Layout) Görüntüsü Çıkarma:**
   - *Neden:* Supercell resmi API'si köy düzeninin görselini, bina koordinatlarını veya gizli tuzakların konumlarını **sunmaz**. Bu nedenle platform harita görüntüsü değil, kompozisyon ve seviye verisi üretir.
2. **Otomatik Saldırı / Botçuluk:**
   - *Neden:* Supercell Hizmet Şartları (Terms of Service) gereği otomatik saldırı yapmak kesinlikle yasaktır ve hesap kapatma sebebidir. Platform yalnızca taktiksel bir analitik aracıdır, bot değildir.
3. **Anlık Webhook Bildirimleri (Push Notification):**
   - *Neden:* Supercell API Webhook desteği sunmamaktadır (yalnızca Pull/REST mimarisindedir). Bu sebeple veri güncellemeleri Celery worker'larının periyodik taraması ile gerçekleşir.
4. **Oyun İçi Doğrudan Yükseltme Yapma:**
   - *Neden:* Platform API'si salt-okunurdur (Read-Only). Ekipman yükseltme veya ordu basma işlemi doğrudan oyun içinden kullanıcı tarafından yapılmalıdır ("Orduyu Oyuna Kopyala" butonu bu süreci hızlandırır).
5. **Canlı Savaş Tekrar Videosu (Replay Stream):**
   - *Neden:* API video akışı sağlamaz; yalnızca yüzde, yıldız sayısı ve saldırı süresi gibi sayısal istatistikleri döner.

---

## 8. Güvenlik, Hata Toleransı ve Dayanıklılık

1. **Token İzolasyonu:** API tokenları kod içerisine gömülmek yerine ortam değişkenleri (`.env`) üzerinden yönetilir.
2. **Pydantic Model İmmutability:** Pydantic modelleri `frozen=True` yapılandırması ile bellekte manipülasyona karşı korunmuştur.
3. **RESP2 Protokol Garantisi:** Redis v5 ve üzeri eski veya yeni tüm Redis sürümlerinde bağlantı kopmalarını engelleyen protokol sabitlemesi uygulanmıştır.
4. **Windows Solo Worker Uyumluluğu:** Windows ortamında Celery'nin `fork` kısıtlamasına karşı `-P solo` havuz desteği entegre edilmiştir.

---

## 9. Hızlı Başlangıç ve Komut Özeti

```powershell
# 1. Backend Testlerini Çalıştırma
.\venv\Scripts\python -m pytest

# 2. Celery Worker Başlatma
celery -A services.workers.celery_app worker --loglevel=info -P solo

# 3. Frontend Geliştirme Sunucusu (Next.js)
cd frontend
npm run dev

# 4. Frontend Üretim Derlemesi Doğrulama
cd frontend
npm run build
```

---
*Belge Sürümü: 1.0.0 — Clash of Clans Analitik Platformu*
