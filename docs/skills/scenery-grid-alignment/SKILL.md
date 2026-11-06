---
name: scenery-grid-alignment
description: Clash of Clans köy sahnelerinin (sceneries) 44x44 inşa alanı köşe koordinatlarını ölçme, homografi matrisi ile grid hizalama ve izometrik duvar texture'larını render etme kılavuzu.
---

# Clash of Clans Sahne ve Izgara Hizalama Kılavuzu (Scenery Grid Alignment)

Bu skill, Clash of Clans köy sahnesi arka planları (sceneries) üzerine 44×44 inşa ızgarasını tam oturtmak, duvar texture'larını izometrik derinlik sıralamasıyla çizmek ve yeni sahneler eklemek için gereken matematiksel, geometrik ve pratik yöntemleri tanımlar.

---

## 1. Amaç ve Ne Zaman Okunmalı?

Bu doküman aşağıdaki durumlarda mutlaka okunmalıdır:
1. **Yeni bir köy sahnesi (scenery) eklendiğinde:** Örneğin yaz sahnesi, korsan sahnesi, cadılar bayramı sahnesi vb. için 44×44 inşa alanının tepe noktalarının (`top`, `right`, `bottom`, `left`) piksel koordinatları çıkarılacağı zaman.
2. **Önizleme tahtası (Preview Board) güncellendiğinde:** Sahne veya duvar çizim mantığı, koordinat dönüşümleri ya da fareyle sürükleme işlevleri değiştirileceği zaman.
3. **Grid hizalama hatası oluştuğunda:** Duvarlar köydeki binaların/çimlerin dışına taşıyorsa veya perspektif açısında kayma varsa.

---

## 2. Harita Yapısı (50×50 Harita, 3 Karelik Yasak Çeper, 44×44 İnşa Alanı)

Clash of Clans Ana Köy haritası iki ana bölgeden oluşur:
1. **Toplam Harita Boyutu (50×50 Kare):** Görseldeki tüm yeşil adayı kapsar.
2. **Yasak Sınır Şeridi (3 Karelik Dış Çeper - Border):**
   - Haritanın en dış kenarlarından içeriye doğru **3 kare derinliğinde** koyu renkli bir çim/ağaç/kaya bandı bulunur.
   - Bu alan engellerin (çam ağacı, kaya, çalı vb.) ve etkinlik süslerinin çıktığı yerdir.
   - **Oyunda bu alana hiçbir bina veya duvar yerleştirilemez!**
3. **Aktif İnşa Alanı (44×44 Kare):**
   - Koyu çeperin içerisindeki daha açık yeşil renkteki elmas alandır.
   - Toplam $50 - (3 + 3) = 44$ karedir.
   - Izgara ve duvar yazısı şablonu **yalnızca ve kesinlikle bu açık yeşil 44×44 alana oturmalıdır**.

```
  ◄─── 3 kare ───►◄──────────── 44 kare İnşa Alanı ────────────►◄─── 3 kare ───►
 ┌────────────────┬────────────────────────────────────────────┬────────────────┐
 │  Koyu Sınır   │            Açık Yeşil Çim Alanı             │  Koyu Sınır   │
 │ (Bina konamaz) │         (Duvar ve binaların dizildiği yer) │ (Bina konamaz) │
 └────────────────┴────────────────────────────────────────────┴────────────────┘
 ◄────────────────────────────── Toplam 50 Kare ────────────────────────────────►
```

---

## 3. Köşe Ölçümü Adım Adım (Gerçek Ölçüm Süreci)

Ölçüm sürecinde uygulanan adımlar ve kullanılan komutlar:

### Adım 1: Görsel Boyutlarını Dinamik Okuma
Görsel boyutu kodda asla sabit varsayılmamalıdır:
```bash
python -c "import cv2; img = cv2.imread('frontend/public/sceneries/Scenery_Ingame_Winter.webp'); print(img.shape)"
# Çıktı: (2545, 3705, 3) -> Genişlik: 3705 px, Yükseklik: 2545 px
```

### Adım 2: Dikey Profil Örneklemesi ve Renk Analizi
Koyu dış sınır ile açık yeşil iç elmas arasındaki renk geçişi dikey simetri ekseni boyunca analiz edilir:
* Açık yeşil çim dokusu (HSV & BGR):
  - `Hue`: 32..37 (sarımsı parlak yeşil)
  - `Saturation`: 120..200
  - `Value`: 150..220
  - `Red`: $\ge 140$ (sarı-yeşil çimende kırmızı bileşen yüksektir)
* Koyu çeper dokusu:
  - `Hue`: 39..44 (orman/gölge yeşili)
  - `Red`: $< 130$

### Adım 3: Açık Yeşil Elmasın Segmentasyonu ve Morfolojik Filtreleme
Açık yeşil pikseller maskelenir, kenar ve delikler `cv2.morphologyEx` (Close + Open) operasyonları ile temizlenerek inşa adasının en büyük konturu çıkarılır.

### Adım 4: Gradyan Tepe Noktaları ile Uç Doğrulaması
Merkezden 4 yöne (yukarı, sağ, aşağı, sol) doğru giderken renk gradyanının ($\Delta \text{Hue}$ ve $\Delta \text{Red}$) en yüksek olduğu piksel koordinatları bulunur:
* Üst uçta $y = 265$ civarında koyu çimden açık yeşile sert geçiş.
* Alt uçta $y = 2085$ civarında açık yeşilden koyu gölgeye geçiş.
* Sol uçta $x = 682$ civarında açık yeşile giriş.
* Sağ uçta $x = 3107$ civarında koyu çime çıkış.

### Adım 5: İzometrik Afin Simetri Kısıtı ile 4 Tepe Noktası Hesabı
Clash of Clans ortografik izometrik projeksiyon kullandığı için karşılıklı kenarlar kesinlikle paraleldir:
* $\text{Merkez } X = \frac{\text{Right.x} + \text{Left.x}}{2} = \frac{3107.0 + 682.0}{2} = 1894.5\text{ px}$
* $\text{Merkez } Y = \frac{\text{Top.y} + \text{Bottom.y}}{2} = \frac{265.5 + 2084.5}{2} = 1175.0\text{ px}$
* $\text{Top.x} = \text{Bottom.x} = 1894.5\text{ px}$
* $\text{Right.y} = \text{Left.y} = 1175.0\text{ px}$

---

## 4. Ölçümü Sağlama Yöntemleri

### A) 4/3 Oranı Kuralı (Sanity Check)
Clash of Clans'ın 3D kamera projeksiyonunda 45° döndürülmüş kare bir ızgaranın piksel sınır kutusu (bounding box) oranı **kesin olarak 4/3 ($\approx 1.3333$)** olmalıdır:
$$\frac{\text{Genişlik}}{\text{Yükseklik}} = \frac{3107.0 - 682.0}{2084.5 - 265.5} = \frac{2425.0}{1819.0} \approx 1.33315 \approx \frac{4}{3}$$
Eğer ölçülen alanın genişlik/yükseklik oranı 1.33'ten belirgin şekilde uzaksa ($\pm 0.05$ üzeri sapma), köşelerden biri yanlışlıkla dış çepere kaymış demektir.

### B) Aday Sınır Kalınlıklarını Karşılaştırma
Eğer 50×50'lik tüm adanın dış sınırları $W_{\text{outer}} = 3013$, $H_{\text{outer}} = 2195$ ise:
* $b = 3\text{ karelik sınır}$ için iç alan oranı: $\frac{44}{50} = 0.880$
* Beklenen iç genişlik: $3013 \times 0.88 = 2651\text{ px}$
* Gerçek görselde orman ve taşlık kayalıkların çimene girdiği derinliğe göre sınır 3.5–3.8 karelik bir piksel alanını kaplayabilmektedir ($2425\text{ px}$).

### C) Debug Izgara ile Görsel Doğrulama
Kodda `showDebugGrid = true` yapıldığında:
* Kırmızı 4 kenarlı çokgen tam olarak açık yeşil elmasın kenarlarına teğet olmalıdır.
* `(0,0)`, `(43,0)`, `(43,43)` ve `(0,43)` etiketli 4 köşe hücresi açık yeşil alanın 4 sivri ucuna tam oturmalıdır.

---

## 5. Doğrulanmış Kış Sahnesi (Winter Scenery) Ölçüleri

* **Dosya Yolu:** `docs/Sceneries/Scenery_Ingame_Winter.webp` ve `frontend/public/sceneries/Scenery_Ingame_Winter.webp`
* **Görsel Doğal Çözünürlüğü:** `3705 × 2545` px
* **Köşe Koordinatları ([`frontend/src/lib/assetsConfig.ts`](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/lib/assetsConfig.ts)):**
  - **Top (Üst - Grid 0,0):** `(x: 1894.5, y: 265.5)`
  - **Right (Sağ - Grid 44,0):** `(x: 3107.0, y: 1175.0)`
  - **Bottom (Alt - Grid 44,44):** `(x: 1894.5, y: 2084.5)`
  - **Left (Sol - Grid 0,44):** `(x: 682.0, y: 1175.0)`
* **Hücre Adım Vektörleri (Tile Steps):**
  - Sütun (Col) Adımı: $\vec{V}_{\text{col}} = (+27.5568,\ +20.6705)\text{ px}$
  - Satır (Row) Adımı: $\vec{V}_{\text{row}} = (-27.5568,\ +20.6705)\text{ px}$
  - Karo Yatay Genişliği (`cellW`): $\approx 55.11\text{ px}$

### Grid Köşeleri ile Sahne Eşleme Tablosu:
| Grid Koordinatı `(col, row)` | Köşe Adı | Sahne Piksel Koordinatı `(X, Y)` | Açıklama |
| :--- | :--- | :--- | :--- |
| `(0, 0)` | **Top** | `(1894.5, 265.5)` | En üst tepe noktası (Kuzey ucu) |
| `(44, 0)` | **Right** | `(3107.0, 1175.0)` | En sağ tepe noktası (Doğu ucu) |
| `(44, 44)` | **Bottom** | `(1894.5, 2084.5)` | En alt tepe noktası (Güney ucu) |
| `(0, 44)` | **Left** | `(682.0, 1175.0)` | En sol tepe noktası (Batı ucu) |

---

## 6. Homografi ve Ters Dönüşüm Fonksiyonları

Konum: [`frontend/src/lib/assetsConfig.ts`](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/lib/assetsConfig.ts)

### A) İleri Yön Eşleme: `mapGridToScenery(col, row, buildArea)`
Grid üzerindeki herhangi bir kesirli veya tamsayı `(col, row)` koordinatını sahne pikseline çevirir:
$$u = \frac{\text{col}}{44.0}, \quad v = \frac{\text{row}}{44.0}$$
$$P(u, v) = (1-u)(1-v)\cdot\text{top} + u(1-v)\cdot\text{right} + uv\cdot\text{bottom} + (1-u)v\cdot\text{left}$$
Hücre merkezini bulmak için `(col + 0.5, row + 0.5)` verilir.

### B) Ters Yön Eşleme: `mapSceneryToGrid(px, py, buildArea)`
Sürükle-bırak sırasında fare veya dokunmatik piksel koordinatını `(px, py)` grid koordinatına çevirir:
$$\vec{V}_r = \text{right} - \text{top}, \quad \vec{V}_l = \text{left} - \text{top}$$
$$\Delta = (px - \text{top.x},\ py - \text{top.y})$$
$$\text{det} = V_{rx} V_{ly} - V_{ry} V_{lx}$$
$$u = \frac{\Delta_x V_{ly} - \Delta_y V_{lx}}{\text{det}}, \quad v = \frac{V_{rx} \Delta_y - V_{ry} \Delta_x}{\text{det}}$$
$$\text{col} = u \times 44.0, \quad \text{row} = v \times 44.0$$

---

## 7. Duvar Texture'ı (Wall Sprite) Çizim Kuralları

Konum: [`frontend/src/components/wall/WallArtView.tsx`](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/wall/WallArtView.tsx)

1. **Sprite Dosyası:** `Wall19.webp` (`58 × 73` piksel, RGBA).
2. **Ölçekleme:**
   - Sprite'ın alt zemin gövdesi genişliği $54\text{ px}$'dir.
   - Hücre genişliği $cellW = \text{hypot}(\vec{V}_{\text{col}} - \vec{V}_{\text{row}}) \approx 55.11\text{ px}$.
   - `wallScale = (cellW * 1.02) / 54.0` (küçük boşlukları önlemek için %2 taşma payı).
3. **Taban Temas Noktası (Anchor Point):**
   - Duvarlar 3D dikildiği için sprite'ın alt tabanının hücre merkezine basması, sur başlığının ise yukarı doğru yükselmesi gerekir:
   - `anchorX = wallW / 2.0` (yatay merkez)
   - `anchorY = wallH * (60.0 / 73.0)` (görselin 73 pikselinin 60. pikseli yer temas noktasıdır)
   - Çizim: `ctx.drawImage(wallImg, center.x - anchorX, center.y - anchorY, wallW, wallH)`
4. **İzometrik Derinlik Sıralaması (Painter's Order):**
   - Arkadaki duvarların öndekilerin altında kalması için dolu hücreler kesinlikle şu sırada sıralanmalıdır:
   ```ts
   filledCells.sort((a, b) => (a.r + a.c) - (b.r + b.c) || a.r - b.r);
   ```
5. **Görüntü Kalitesi:**
   - Canvas'ta `ctx.imageSmoothingEnabled = true` ve `ctx.imageSmoothingQuality = "high"` kullanılmalıdır.

---

## 8. Canvas ve Responsive Konteyner Kuralları

1. **Doğal Piksel Çözünürlüğü:**
   - Canvas çözünürlüğü daima sahnenin doğal çözünürlüğüne eşitlenir: `canvas.width = 3705; canvas.height = 2545;`.
2. **CSS ile Kilitli En/Boy Oranı:**
   ```tsx
   style={{ width: "100%", maxWidth: "800px", height: "auto", aspectRatio: "3705 / 2545" }}
   ```
   Bu sayede pencere daralsa veya büyüse bile arka plan görseli, ızgara çizgileri ve duvar dokuları tek bir katman olarak orantılı ölçeklenir; hiçbir kayma (*drift*) meydana gelmez.
3. **Sürükleme Oranlama Hesabı:**
   - Ekran üzerindeki fare tıklaması canvas doğal pikseline oranlanarak dönüştürülür:
   ```ts
   const rect = canvas.getBoundingClientRect();
   const scaleX = canvas.width / rect.width;
   const scaleY = canvas.height / rect.height;
   const mousePixelX = (e.clientX - rect.left) * scaleX;
   const mousePixelY = (e.clientY - rect.top) * scaleY;
   const gridPt = mapSceneryToGrid(mousePixelX, mousePixelY, buildArea);
   ```

---

## 9. Debug Modu (Nasıl Açılır ve Neye Bakılır?)

1. **Nasıl Açılır?**
   - Önizleme tahtası başlığındaki **"Debug Izgara"** butonu tıklanarak açılır (varsayılan: Kapalı).
2. **Nelere Bakılır?**
   - **Kırmızı Çerçeve:** Açık yeşil çim elmasın 4 kenarını tam çevrelemelidir. Koyu çime veya ormana taşmamalıdır.
   - **Beyaz Izgara Çizgileri:** 44 satır ve 44 sütun çizgisi eşit aralıklı olmalıdır.
   - **Köşe Hücreleri:** Amber rengiyle boyanmış `(0,0)`, `(43,0)`, `(43,43)` ve `(0,43)` hücreleri tam olarak açık yeşil elmasın 4 köşesine oturmalıdır.

---

## 10. Yeni Sahne Ekleme Kontrol Listesi

Yeni bir sahne eklerken sırasıyla bu adımları izleyin:

- [ ] 1. Sahne görselini `docs/Sceneries/<Sahne_Adi>.webp` konumuna ekleyin.
- [ ] 2. Görseli `frontend/public/sceneries/<Sahne_Adi>.webp` altına kopyalayın.
- [ ] 3. `scripts/measure_buildarea.py --image ...` çalıştırarak bir başlangıç tahmini alın.
- [ ] 4. Açık yeşil alanın 4 tepe noktasını tespit edin ve $\frac{\text{Genişlik}}{\text{Yükseklik}} \approx 1.3333$ sağlama kuralını kontrol edin.
- [ ] 5. `frontend/src/lib/assetsConfig.ts` içine yeni sahne konfigürasyonunu ekleyin.
- [ ] 6. Arayüzde "Debug Izgara"yı açarak kırmızı sınırın ve 4 köşe hücresinin açık yeşil sınıra oturduğunu gözle doğrulayın.
- [ ] 7. Duvar yazısı yazıp fareyle sürükleyerek 4 köşeye kadar sürüklemenin sorunsuz çalıştığını test edin.

---

## 11. Karşılaşılan Sorunlar ve Çözümleri

### Sorun: Izgaranın Koyu Yeşil Çimlere ve Ağaçlara Taşması
* **Sebep:** Ölçümün, haritanın 3 karelik yasak sınır şeridini (50×50 ada) inşa alanı sanmasından kaynaklanır.
* **Çözüm:** Koyu yeşil çim dışarıda bırakılmalı; yalnızca açık yeşil iç elmas alan (44×44) ölçülmelidir.

### Sorun: 3D Önizlemede Duvarların Birbirini Kesmesi veya Ters Örtmesi
* **Sebep:** Çizim döngüsünün grid sırasıyla (`r = 0..44, c = 0..44`) düz çizilmesidir.
* **Çözüm:** Hücreler çizilmeden önce mutlaka `(row + col)` derinlik sıralamasına (`painter's sort`) tabi tutulmalıdır.

### Sorun: Pencere Yeniden Boyutlandırıldığında Duvarların Zemin Üzerinde Kayması
* **Sebep:** Canvas boyutu ile arka plan görselinin farklı CSS/DPR oranlarında ölçeklenmesidir.
* **Çözüm:** Canvas doğrudan görselin doğal piksel boyutunda (`3705x2545`) tutulmalı ve CSS'te `aspectRatio: "3705 / 2545"` konteyner ile sarılmalıdır.

---

## 12. Yapılmaması Gerekenler

1. **Köşeleri Başka Sahneden Kopyalamayın:** Her Clash of Clans sahnesinin çözünürlüğü ve kırpma (crop) oranı farklı olabilir; afin oranlama formülü uygulanmalıdır.
2. **Koyu Çeperi İnşa Alanına Katmayın:** Koyu yeşil çim oyunda inşa edilemez bölgedir.
3. **Elle Rastgele Ofset ve Ölçekleme Eklemeyin:** `mapGridToScenery` ve `mapSceneryToGrid` saf lineer afin cebire dayanır; araya keyfi `+ 10px` gibi sabitler eklemek ters dönüşümü ve sürüklemeyi bozar.
4. **Görsel Boyutlarını Hardcode Etmeyin:** Her zaman `naturalWidth` ve `naturalHeight` üzerinden çalışın.
5. **War Base (Klan Savaşı) Sahnelerini Ana Köy Sanmayın:** Savaş üsleri farklı ızgara yapısına sahiptir, ana köy sahne seçicisine eklenmemelidir.

---

## 13. Çoklu Sahne Mimarisi ve Görsel Analiz ile Ölçüm Yöntemi

### 13.1 Kritik Düzeltme: "Evrensel Kamera" Varsayımının Yanlışlığı
Önceki versiyonda yer alan *"Supercell'in 3D render motoru tüm ana köy sahnelerinde aynı ortografik kamera açısını ve kış sahnesine göre orantılı boyutları kullanır"* varsayımı **tamamen yanlıştır ve geçersiz kılınmıştır**.

* **Neden Yanlış?**
  1. **Farklı Kamera Mesafeleri (Zoom/Focal Length):** Örneğin Barbarian Odyssey sahnesinde köy alanı devasa bir Cthulhu tapınağının ortasındaki küçük bir avludur (elmas genişliği yalnızca 919 px iken, eski formül 2425 px genişlik atıyordu).
  2. **Farklı Merkez Konumları:** Fire & Ice sahnesinde zemin $y = 1279.5$ seviyesindeyken eski formül $y = 1343.5$ atayarak ızgarayı güneye kaydırıyordu.
  3. **Standart Dışı Geometriler:** Glory Arena ve Football sahnelerinde köy elması yerine futbol sahası ve sekizgen tribünler yer almaktadır; bu sahnelerde 44×44 elmas bulunmamaktadır.
  4. *"70 sahnenin tamamında 4/3 sağlandı"* iddiası, formülün kendi ürettiği koordinatları doğrulayan totolojik bir hesap olduğu için gerçeği yansıtmamıştır.

Bu nedenle $W/3705$ ölçekleme ve $\Delta Y$ formülü bütünüyle kaldırılmış; her sahne görsel analiz, karo deseni (checkerboard) otokorelasyonu ve sınır kontrastı ile bağımsız olarak ölçülmüştür.

---

### 13.2 Karo Deseni (Checkerboard Periodicity) ile Ölçüm Yöntemi

Clash of Clans köylerinde inşa edilebilir 44×44 zemin periyodik dama (checkerboard) desenine sahiptir. Bu özellik piksel seviyesinde nesnel ölçüm sağlar:

1. **2D Otokorelasyon (2D FFT):**
   Merkez bölgeden alınan yama üzerinde Fourier analizi yapılarak karo periyodu ($dx, dy$) saptanır:
   $$F(u, v) = \mathcal{F}\{I(x, y) - \mu\}$$
   $$R(x, y) = \mathcal{F}^{-1}\{|F(u, v)|^2\}$$
2. **Köşe Eksen Vektörleri:**
   Otokorelasyon tepe noktalarından sütun ($\vec{V}_{\text{col}} = (+dx, +dy)$) ve satır ($\vec{V}_{\text{row}} = (-dx, +dy)$) adım vektörleri çıkarılır.
3. **İzometrik Oran Doğrulaması:**
   Eksenlerin $\frac{dx}{dy} \approx \frac{4}{3} \approx 1.333$ geometrik oranını sağladığı kontrol edilir.
4. **44×44 Elmas Boyutları:**
   $$\text{Diamond Width} = 44 \times dx$$
   $$\text{Diamond Height} = 44 \times dy$$
5. **Dış 3 Karelik Sınır ile İç Alan Ayrımı:**
   Harita 50×50 kare olup dıştaki 3'er karelik sınır bina konulamaz yasak alandır. Ölçülen elmas bu koyu çeperi dışarıda bırakacak şekilde içteki açık 44×44 alana oturtulur.

---

### 13.3 Sahne Sınıflandırma Sistemi ve Güvenilirlik Grupları

Tüm sahneler görsel güvenilirliklerine göre 3 gruba ayrılmıştır:

1. **Doğrulandı (`verified: true`, `status: "Doğrulandı"`) — 64 Sahne:**
   - Karo deseni ve zemin kontrastı nettir.
   - 4 köşe piksel hassasiyetinde bulunmuş ve 44×44 ızgaranın açık renkli inşa zeminine tam oturduğu doğrulanmıştır.
   - Kış sahnesi (`winter`) bu gruptadır ve kalibrasyon koordinatları strictly korunmuştur.
2. **Elle Düzeltildi (`verified: true`, `status: "Elle düzeltildi"`) — 1 Sahne (Barbarian Odyssey):**
   - Karmaşık ada süslemeleri ve karanlık deniz sebebiyle otomatik kontur yanılgıya uğramıştır.
   - Zemin görsel olarak incelenmiş, altın ve turkuaz avlu bordürlerine göre 919×690 px iç elmas ve merkez $(1844.5, 1006.0)$ olarak manuel kalibre edilmiştir.
3. **Güvenilmez (`verified: false`, `status: "Güvenilmez"`) — 5 Sahne:**
   - Standart 44×44 elmas köy alanı ve izometrik köşe yapısı bulunmayan sahnelerdir.
   - **Glory Arena (`Glory_Arena_Scenery.webp`):** Futbol stadyumu zemininde inşa alanı sekizgendir, köşeler tribünlerle kapalıdır.
   - **Football (`Map_Football_Scenery.webp`):** Futbol sahası, kale direkleri ve saha çizgileri içeren özel tema.
   - **Mash-A-Rama (`Map_Mash-A-Rama_Scenery.webp`):** 5400×7268 dikey tanıtım posteri; karakter kompozisyonudur, köy alanı yoktur.
   - **Sound of Clash (`Map_Sound_of_Clash_Scenery.webp`):** Konser sahnesi ve festival tanıtım afişi.
   - **Money in the Bank (`Map_Money_in_the_Bank_Scenery.webp`):** WWE temalı güreş ringi ve stadyum düzeni.
   - **Kural:** Güvenilmez sahneler `WallArtView.tsx` sahne seçicisinde filtrelenerek kullanıcıya sunulmaz (`verified !== false`).

---

### 13.4 İkon Eşleştirme ve Arayüz Seçicisi
* 70 sahnenin tamamı `docs/Sceneries/Icons/` içindeki orijinal Fan Kit ikonlarıyla eşleştirilmiştir.
* `WallArtView.tsx` bileşeninde `availableSceneries = ASSETS_CONFIG.sceneries.filter(s => s.verified !== false)` filtresi kullanılarak yalnızca doğrulanmış 65 sahne gösterilir.
* Seçilen sahne `localStorage`'da (`wallart.scenery`) saklanır. Herhangi bir geçersiz veya güvenilmez ID kaydedilmişse varsayılan olarak `winter` sahnesine düşülür.


