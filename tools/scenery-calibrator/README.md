# Scenery Grid Kalibrasyon Stüdyosu

Next.js frontend veya backend sunucularından tamamen bağımsız, saf Python 3 standart kütüphanesi ile çalışan çevrimdışı 44×44 izometrik sahne (`buildArea`) kalibrasyon aracıdır.

Doğrudan `frontend/src/lib/assetsConfig.ts` dosyasını okur ve yaptığınız düzeltmeleri güvenli (atomik) şekilde dosyaya işler.

## Hızlı Başlangıç

1. Windows'ta başlatmak için `start.bat` dosyasına çift tıklayın (veya terminalden çalıştırın):
   ```bat
   tools\scenery-calibrator\start.bat
   ```
2. Alternatif olarak manuel başlatma:
   ```bat
   python tools\scenery-calibrator\server.py --port 8765
   ```
3. Tarayıcıda `http://127.0.0.1:8765` adresini açın.

## Temel Kullanım

- **Sol Panel (Sahne Listesi):** İsim/ID araması yapabilir ve durum etiketlerine (`Tümü`, `Doğrulandı`, `Elle düzeltildi`, `Güvenilmez`) göre filtreleyebilirsiniz. Alt kısımdaki **Önceki / Sonraki** butonları ile sahneler arasında hızlıca geçiş yapabilirsiniz.
- **Orta Tuval (Canvas):**
  - **Köşe Tutamaçları:** `TOP` (Kırmızı, `(0,0)`), `RIGHT` (Mavi, `(44,0)`), `BOTTOM` (Yeşil, `(44,44)`) ve `LEFT` (Turuncu, `(0,44)`) noktalarını sürükleyerek 44×44 ızgarayı hizalayın.
  - **Merkez Tutamacı (Mor Elmas):** Şekli bozmadan tüm 44×44 ızgarayı tek seferde taşımanızı sağlar.
  - **Örnek Duvar Katmanı:** Köşelerde ve merkez hücrelerde `/walls/Wall19.webp` önizlemesi açarak duvarların gerçek köy karolarına oturuşunu doğrulayabilirsiniz.
- **Sağ Panel (Hassas Denetçi):**
  - **Paralelkenar Kilidi (Varsayılan Açık):** `TOP`, `RIGHT` veya `LEFT` taşındığında `BOTTOM = RIGHT + LEFT - TOP` formülünü otomatik korur. `BOTTOM` köşesi sürüklendiğinde kilit otomatik açılır.
  - **2:1 İzometrik Oran Düzelt:** Mevcut merkez etrafında Clash of Clans standart `4:3` (`1.333`) elmas oranına simetrik olarak hizalar.
  - **Geri Al:** Yaptığınız değişiklikleri son kayıtlı haline döndürür.
  - **Doğrulandı (verified):** Mevcut `verified` değerini korur; yalnızca işaretini değiştirdiğinizde güncellenir.
  - **Kaydet:** Değişiklikleri `frontend/src/lib/assetsConfig.ts` içine `status: "Elle düzeltildi"` ve `method: "manual"` olarak yazar (`winter` sahnesi için `ASSETS_CONFIG.scenery` alanını da senkronize eder).

## Klavye ve Fare Kısayolları

| Kısayol | İşlev |
| --- | --- |
| `Fare Tekerleği` | İmleç merkezli yakınlaştır / uzaklaştır |
| `Space + Sürükle` / `Orta Tuş` | Tuvali kaydır (Pan) |
| `Ok Tuşları` | Aktif tutamacı **±1.0 px** kaydır |
| `Shift + Ok Tuşları` | Aktif tutamacı **±10.0 px** kaydır |
| `Alt + Ok Tuşları` | Aktif tutamacı **±0.2 px** hassas kaydır |
| `Ctrl + S` | Değişiklikleri `assetsConfig.ts` dosyasına kaydet |
