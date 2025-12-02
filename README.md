# Çakal Radyo

Basit bir Node.js API sunucusu ve tarayıcı tabanlı masaüstü arayüzüyle Çakal Radyo (Spotify benzeri) deneyimi.

## Klasör yapısı
- `server/`: Kimlik doğrulama, parça listesi, akış ve çalma listesi yönetimi sağlayan saf Node.js API'si.
- `client/`: API'ye bağlanan hafif HTML/JS arayüzü. `node server.js` ile statik olarak sunulur.

## Gereksinimler
- Node.js 18+
- Müzik dosyaları (mp3/ogg) `server/music` klasöründe tutulur.

## Sunucuyu çalıştırma
```bash
cd server
NODE_ENV=production PORT=3000 node src/server.js
```

## İstemciyi çalıştırma
```bash
cd client
CLIENT_PORT=3001 node server.js
```
Tarayıcıdan `http://localhost:3001` adresine gidin. Masaüstü kullanımı için sayfayı PWA/uygulama kısayolu olarak ekleyebilir veya Electron gibi bir kabukla paketleyebilirsiniz.

## Akış ve özellikler
- Kullanıcı kayıt/giriş (scrypt ile tuzlu hash, token tabanlı oturum).
- Parça listesi: `music` klasöründeki tüm dosyaları otomatik listeler.
- Akış: `/api/tracks/:id/stream` ile range destekli yayım, `/api/tracks/:id/download` ile çevrimdışı indirme.
- Kuyruk/oynatıcı: Oynat, duraklat, önceki/sonraki, shuffle ve tekrar modları.
- Çalma listesi: Oluşturma, silme, seçili parçalardan liste oluşturma ve listeyi oynatma.
