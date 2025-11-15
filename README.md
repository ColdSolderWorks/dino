# Ustabul61 Monorepo

Ustabul61; kullanıcılar, ustalar ve adminler için temel iş akışlarını kapsayan, tamamen self-host çalışan bir hizmet platformu örneğidir. Depo hem REST API (backend) hem de statik çok sayfalı bir frontend içerir ve hiçbir paralı servis veya dış yönetilen veritabanına ihtiyaç duymaz.

## 1. Proje Yapısı

```
root
├── backend
│   ├── package.json           # Çalıştırma scriptleri
│   ├── .env.example           # Örnek yapılandırma
│   ├── src
│   │   ├── server.js          # Giriş noktası (Express tabanlı REST API)
│   │   ├── app.js             # Middleware ve route montajı
│   │   ├── bootstrap/seed.js  # Admin ve kategori seed'i
│   │   ├── config/            # Ortak konfigürasyon
│   │   ├── controllers/       # HTTP kontrolcüleri
│   │   ├── middleware/        # Auth, rate-limit, güvenlik başlıkları
│   │   ├── models/            # Veri erişim katmanı
│   │   ├── routes/            # REST endpoint'leri
│   │   ├── storage/           # JSON tabanlı datastore
│   │   └── utils/             # JWT, hash, logger vb.
├── frontend
│   ├── package.json           # Basit statik sunucu
│   ├── server.js              # Node http ile public klasörünü sunar
│   └── public/                # Ana sayfa, kullanıcı/usta/admin panelleri
└── node_modules/express       # Ağ erişimi olmadan kullanılabilen minimalist Express implementasyonu
```

> **Not:** İnternet erişimi olmayan ortamlarda da derlenebilmesi için Express benzeri hafif bir HTTP çatısı depo içinde barındırılır. API kodu standart Express sözdizimini kullanır, dolayısıyla gerçek Express ile de uyumludur.

## 2. Veri Saklama (JSON Store)

`backend/storage/ustabul61-data.json` dosyası, aşağıdaki koleksiyonları tutan senkron bir mini veritabanıdır. Yedek almak için dosyayı kopyalamak yeterlidir. Dosyayı farklı ortamlara taşımak aynı zamanda migration işlevi görür.

| Koleksiyon | Alanlar |
|------------|---------|
| `users` | `id`, `name`, `email`, `passwordHash`, `role (customer/pro/admin)`, `city`, `district`, `bio`, `minRate`, `avgRating`, `completedJobs`, `status`, `createdAt` |
| `categories` | `id`, `name`, `description`, `isActive` |
| `requests` | `id`, `customerId`, `categoryId`, `city`, `district`, `description`, `desiredDate`, `budgetMin`, `budgetMax`, `status`, `selectedProId`, `createdAt`, `updatedAt` |
| `offers` | `id`, `requestId`, `providerId`, `amount`, `estimatedTime`, `message`, `status`, `createdAt` |
| `reviews` | `id`, `requestId`, `customerId`, `providerId`, `rating`, `comment`, `createdAt` |
| `announcements` | `id`, `title`, `body`, `createdAt` |
| `complaints` | `id`, `requestId`, `reporterId`, `againstUserId`, `type`, `notes`, `status`, `createdAt` |

## 3. Güvenlik ve Kalite Önlemleri

1. **Şifre Hashleme:** Node `crypto.scrypt` + rastgele 16 bayt salt (bcrypt ayarında güçlü KDF). Hash formatı `salt:hash` şeklinde saklanır.
2. **JWT:** `utils/crypto.js` HMAC-SHA256 ile imzalı access token üretir. Payload içerisinde `sub`, `role`, `status`, `exp` bulunur.
3. **RBAC:** `middleware/auth.js` içerisindeki `requireRole` sadece ilgili rollere endpoint açar (customer, pro, admin).
4. **Rate Limit:** `middleware/rateLimiter.js` IP bazlı 15 dk/100 istek sınırı uygular. Giriş ve kayıt gibi hassas rotalara da uygulanır.
5. **Güvenlik Başlıkları:** `securityHeaders` middleware’i XSS, Clickjacking ve içerik politikası için temel başlıkları ekler. Aynı dosyada CORS beyaz listesi bulunur.
6. **Input Validasyonu:** `utils/validators.js` e-posta ve parola politikası (en az 10 karakter, büyük/küçük/özel karakter) kontrolünü sağlar. Kontrolcüler eksik alanları 400 ile döner.
7. **Audit/Log:** `requestLogger` her isteği JSON formatında stdout’a basar, böylece fail2ban veya merkezi loglamaya pipe edilebilir.
8. **Admin Seed:** İlk açılışta `.env` içindeki admin bilgisi hashlenip kaydedilir, güçlü parolayı değiştirmeniz gerekir.

## 4. REST Endpoint’leri

Aşağıdaki rotalar `backend/src/routes/` altında tanımlanmıştır.

| Route | Method | Açıklama | Yetki |
|-------|--------|----------|-------|
| `/api/auth/register` | POST | `name,email,password,role` ile müşteri veya usta kaydı | Public |
| `/api/auth/login` | POST | JWT üretir | Public |
| `/api/auth/me` | GET | Profil döner | Auth |
| `/api/categories` | GET | Kategori listesi | Public |
| `/api/categories` | POST | Yeni kategori | Admin |
| `/api/requests` | POST | Hizmet talebi oluştur | Customer |
| `/api/requests/mine` | GET | Kişisel talepler | Customer |
| `/api/requests/available` | GET | Ustalar için açık talepler | Pro |
| `/api/offers` | POST | Teklif gönder | Pro |
| `/api/offers/mine` | GET | Ustanın teklifleri | Pro |
| `/api/offers/request/:id` | GET | Talebe gelen teklifler | Talep sahibi veya admin |
| `/api/offers/:id/accept` | POST | Teklif seçimi | Talep sahibi |
| `/api/requests/:id/reviews` | POST | İş tamamlandıktan sonra puan ve yorum | Customer |
| `/api/providers/:id/reviews` | GET | Bir ustanın yorumları | Public |
| `/api/complaints` | POST | Şikâyet gönder | Auth |
| `/api/admin/users` | GET | Kullanıcı listesi | Admin |
| `/api/admin/users/:id/status` | PATCH | Ban/aktif | Admin |
| `/api/admin/pros/:id/status` | PATCH | Usta onayı | Admin |
| `/api/admin/stats` | GET | Özet istatistik | Admin |
| `/api/admin/announcements` | GET/POST | Duyuru yönetimi | Admin |
| `/api/admin/announcements/:id` | DELETE | Duyuru sil | Admin |
| `/api/public/announcements` | GET | Ziyaretçilere duyurular | Public |

Durum geçişleri `requests.status` alanında `created → bidding → pro_selected → in_progress → completed/cancelled` sırasını takip eder.

## 5. Frontend Sayfaları

`frontend/public/` klasörü vanilla HTML/CSS kullanır ve `frontend/server.js` üzerinden servis edilir.

- **index.html:** Kategori kartları ve son duyuruları listeler.
- **request.html:** Kategorileri dinamik olarak çekip kullanıcıların talep formunu API’ye göndermesini sağlar.
- **user-panel.html:** JWT saklayan kullanıcılar kendi taleplerini ve gelen teklifleri yönetebilir.
- **pro-panel.html:** Ustalar açık talepleri görüp teklif formu doldurabilir, kendi tekliflerini takip edebilir.
- **pro-profile.html:** Herhangi bir usta ID’si için kamuya açık yorumları gösterir.
- **admin.html:** Temel istatistikler, kullanıcı listesi ve duyuru oluşturma ekranı.

Formlar fetch API ile doğrudan backend’e bağlanır; tokenlar localStorage’da `ustabul61_token` anahtarında saklanır. Gerçek üretim ortamında HTTP-only cookie tercih edilmelidir.

## 6. Kurulum ve Çalıştırma

1. **Gereksinimler:** Node.js 20+, Git yüklü bir Linux sunucu. Ek bağımlılık yoktur.
2. **Depoyu klonlayın** ve proje klasörüne girin.
3. **Yapılandırma:** `cp backend/.env.example backend/.env` komutuyla dosyayı kopyalayın ve admin parolasını değiştirin.
4. **Backend’i başlatın:**
   ```bash
   cd backend
   npm run start
   ```
   Çıkışta `Ustabul61 API listening on port 4100` mesajını görmelisiniz. İlk çalıştırmada `storage/ustabul61-data.json` dosyası oluşturulur.
5. **Frontend’i başlatın:**
   ```bash
   cd frontend
   npm run start
   ```
   Varsayılan port 3000’dir. Tarayıcıdan `http://localhost:3000` adresine gidin; tüm sayfalar API’yi `http://localhost:4100` üzerinden kullanır.

### Yedekleme / Migration

- `storage/ustabul61-data.json` dosyasını `rsync` veya `scp` ile kopyalayarak yedek alabilirsiniz.
- Yeni ortama taşırken aynı dosyayı `backend/storage` dizinine koymanız yeterlidir; sayaçlar korunur.

## 7. Örnek İstekler

### 7.1 Kullanıcı Kaydı
```bash
curl -X POST http://localhost:4100/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ayşe","email":"ayse@example.com","password":"SifreGucu!1","role":"customer"}'
```

### 7.2 Login + Talep Oluşturma
```bash
TOKEN=$(curl -s -X POST http://localhost:4100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayse@example.com","password":"SifreGucu!1"}' | jq -r '.token')

curl -X POST http://localhost:4100/api/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"categoryId":1,"city":"Trabzon","district":"Ortahisar","description":"2+1 temizlik"}'
```

### 7.3 Admin İstatistikleri
```bash
ADMIN_TOKEN=<admin login ile alınır>
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:4100/api/admin/stats
```

## 8. Test ve Doğrulama

- **API Çalışma Testi:** `node backend/src/server.js` komutu ile sunucunun ayaklandığını doğrulayın (log çıktısı repo kökünde tutulur). İsteğe bağlı olarak aynı anda `curl` ile health check yapabilirsiniz.
- **Frontend Testi:** `npm run start` komutundan sonra ana sayfanın kategori listesini çektiğini (tarayıcı konsolu) kontrol edin.
- **Postman/HTTPie Koleksiyonu:** `README` içerisindeki örnek curl komutları temel smoke testleri kapsar. Dilerseniz aynı endpoint’leri içeren bir Postman koleksiyonu oluşturup paylaşabilirsiniz.

## 9. Gelecek Adımlar

- SQLite veya PostgreSQL’e kolay geçiş için `storage/dataStore.js` sınıfına eşleşen repository katmanı eklenebilir.
- Refresh token ve cihaz bazlı oturum yönetimi.
- Mesajlaşma ve bildirim altyapısı.
- Frontend’de gerçek oturum yönetimi ve form doğrulamaları.

Bu depo; hiçbir ücretli servis kullanmadan, tek sunucu üzerinde hızlıca ayağa kalkabilecek, güvenlik temelleri sağlam bir MVP sunar.
