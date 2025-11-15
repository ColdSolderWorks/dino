# Ustabul61 Teknik Tasarım ve MVP Planı

Ustabul61, Armut benzeri fakat daha sade ve kendi kendine barınabilen bir ustalık-hizmet platformudur. Kod ve veriler tamamen self-host ortamda, herhangi bir managed servis veya ücretli SaaS kullanmadan çalışacaktır. Aşağıda mimari, güvenlik gereksinimleri, veri şemaları ve çalıştırma talimatları yer alır.

---

## 1. Teknoloji Yığını ve Genel Mimarî

| Katman  | Teknoloji / Araç | Not |
|---------|------------------|-----|
| Backend | Node.js 20 + Express 5 | REST API, JWT tabanlı oturum, RBAC middlewares |
| Frontend | Server-side render (EJS) + vanilla JS | Çok sayfalı yapı, admin ve son kullanıcı için ayrı layout |
| Veritabanı | SQLite (node-sqlite3) | Tek dosya, ücretsiz, kendi sunucumuzda barınır |
| Auth | JWT (access + refresh) veya HTTP-only session cookie | Bcrypt ile hash, CSRF token |
| Diğer | Winston logger, helmet, express-rate-limit, celebrate/joi validasyon | Ücretsiz ve self-host uyumlu |

### Veri Saklama Seçimi
- **SQLite**: Tek `.db` dosyasında tutulur, rsync ya da cron ile günlük yedek alınabilir.
- Migration/seed: Knex veya Prisma yerine hafif `better-sqlite3-migrations` ya da custom `migrations/001_init.sql` scriptleri kullanılabilir. `npm run migrate` komutu ile version kontrolü yapılır.
- Yedekleme: `sqlite3 ustabul61.db ".backup './backups/ustabul61-$(date +%F).db'"` şeklinde otomatik cron önerilir.

### Mantıksal Katmanlar
```
root
├── backend
│   ├── src
│   │   ├── server.js
│   │   ├── config/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   └── tests/
└── frontend
    ├── views/ (EJS)
    ├── public/
    └── src/assets/
```
- **Models** yalnızca veri erişiminden sorumlu (SQLite sorguları).
- **Services** iş kurallarını içerir (teklif oluşturma, puan hesaplama vb.).
- **Controllers** HTTP isteği/yanıtı ve validasyon çıktısını yönetir.

---

## 2. Veri Şeması

### 2.1 Tablolar (SQLite)

#### users
- `id` INTEGER PK
- `role` ENUM("customer","pro","admin")
- `email` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL (bcrypt)
- `name` TEXT
- `phone` TEXT
- `city` TEXT
- `status` ENUM("active","suspended") DEFAULT "active"
- `created_at`, `updated_at`

#### pros (usta profili)
- `id` INTEGER PK (FK -> users.id)
- `categories` TEXT (JSON array)
- `city`, `district`
- `bio` TEXT
- `min_price` INTEGER
- `avg_rating` REAL DEFAULT 0
- `jobs_completed` INTEGER DEFAULT 0
- `approval_status` ENUM("pending","approved","suspended")

#### categories
- `id` INTEGER PK
- `name` TEXT UNIQUE
- `description` TEXT
- `is_active` BOOLEAN

#### service_requests
- `id` INTEGER PK
- `customer_id` FK -> users.id
- `category_id` FK -> categories.id
- `city`, `district`
- `description` TEXT
- `desired_date` DATE
- `budget_min`, `budget_max`
- `status` ENUM("created","bidding","pro_selected","in_progress","completed","cancelled")
- `selected_pro_id` FK -> users.id
- `created_at`, `updated_at`

#### offers
- `id` INTEGER PK
- `request_id` FK -> service_requests
- `pro_id` FK -> users.id
- `price` INTEGER
- `estimated_days` INTEGER
- `message` TEXT
- `status` ENUM("pending","accepted","rejected")
- `created_at`

#### reviews
- `id` INTEGER PK
- `request_id` FK
- `customer_id` FK
- `pro_id` FK
- `rating` INTEGER (1-5)
- `comment` TEXT
- `created_at`

#### messages (opsiyonel basit mesajlaşma)
- `id`, `request_id`, `sender_id`, `receiver_id`, `content`, `created_at`

#### complaints
- `id`, `request_id`, `reporter_id`, `against_user_id`, `type`, `notes`, `status`, `created_at`

#### announcements
- `id`, `title`, `body`, `visibility` (all/pro/admin), `created_at`

#### audit_logs
- `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`

---

## 3. Rol Bazlı Yetkilendirme (RBAC)
| Rol | Haklar |
|-----|--------|
| Müşteri | Talep oluşturma, kendi taleplerini ve teklifleri görme, teklif seçme, yorum yazma |
| Usta | Onay sonrası uygun talepleri görme, teklif verme, kendi tekliflerini yönetme, tamamlanan işler için durum güncelleme |
| Admin | Tüm verileri görme/düzenleme, kullanıcı/usta/panel yönetimi |

Middleware örneği: `requireRole(['admin','pro'])`. JWT payload içinde `sub`, `role`, `status` saklanır. Askıya alınmış kullanıcılar `status` check ile engellenir.

---

## 4. REST Endpoint Listesi

_Not: Tüm POST/PUT istekleri JSON Body + CSRF token (cookie) gerektirir. Rate limit: 60 req/5dk/ip._

### Auth
| Route | Method | Body | Response | Yetki |
|-------|--------|------|----------|-------|
| `/api/auth/register` | POST | `{name,email,password,role}` | `{token,user}` | Public |
| `/api/auth/login` | POST | `{email,password}` | `{accessToken,refreshToken}` | Public |
| `/api/auth/token` | POST | `{refreshToken}` | `{accessToken}` | Auth |
| `/api/auth/logout` | POST | - | 204 | Auth |

### Kullanıcı / Usta
| Route | Method | Açıklama | Yetki |
| `/api/users/me` | GET | Profil | Auth |
| `/api/users/me` | PUT | Profil güncelle | Auth |
| `/api/profiles` | POST | Usta profil yarat (kategori, şehir, bio) | `role=pro` |
| `/api/profiles/:id` | GET | Usta profili | Public |
| `/api/profiles/:id` | PUT | Usta profil günc. | `owner or admin` |

### Kategoriler (Admin)
| `/api/categories` | GET/POST |
| `/api/categories/:id` | PUT/DELETE | Sadece admin |

### Hizmet Talepleri
| `/api/requests` | GET | Filtre: kategori, şehir, durum | Auth |
| `/api/requests` | POST | Yeni talep | `role=customer` |
| `/api/requests/:id` | GET | Detay | `owner, admin, assigned pro` |
| `/api/requests/:id` | PUT | Durum/bilgi güncelle | `owner (iptal)`, `selected pro (durum)`, `admin` |

### Teklifler
| `/api/requests/:id/offers` | GET | Talep teklifleri | `owner, admin` |
| `/api/requests/:id/offers` | POST | Usta teklif verir | `role=pro` |
| `/api/offers/:id` | PUT | Teklif güncelle (kendi) | `owner` |
| `/api/offers/:id/accept` | POST | Teklif seç | `request owner` |

### Yorumlar
| `/api/requests/:id/reviews` | POST | `rating, comment` | `request owner` (sadece tamamlandı) |
| `/api/profiles/:id/reviews` | GET | Liste | Public |

### Mesajlar (opsiyonel)
| `/api/requests/:id/messages` | GET/POST | Katılımcılarla sınırlı | Katılımcı |

### Şikayetler
| `/api/complaints` | POST | Kullanıcı veya admin | Auth |
| `/api/complaints` | GET | Admin | Admin |

### Admin Panel API
| `/api/admin/users` | GET | Arama, filtre | Admin |
| `/api/admin/users/:id/status` | PATCH | Ban/aktif et | Admin |
| `/api/admin/pros/:id/approval` | PATCH | Onay/red | Admin |
| `/api/admin/stats` | GET | Toplam sayılar | Admin |
| `/api/admin/announcements` | CRUD | Admin |

---

## 5. Validasyon ve Güvenlik Önlemleri

1. **Şifre Güvenliği**: bcrypt `saltRounds=12`. Şifre politikası (en az 10 karakter, büyük/küçük/özel).
2. **Input Validasyonu**: `celebrate` ile schema bazlı; frontendde HTML5 + JS pattern kontrolü.
3. **XSS**: EJS outputları `escape` fonksiyonlarıyla otomatik. Kullanıcı yorumlarında markdown veya basit text; `<script>` sanitizasyonu için `DOMPurify` (server-side versiyon) kullanılabilir.
4. **CSRF**: JWT cookie modunda `csrf-token` header; localStorage kullanılmayacak. API token revocation listesi, refresh token DB’de tutulur.
5. **Rate Limiting**: login/register route’ları 5 req/15dk, genel API 100 req/15dk. `express-rate-limit`.
6. **Brute Force**: Başarısız login loglanır, 5 kez üst üste hata = 15 dk kilit.
7. **Helmet**: Güvenlik başlıkları, `contentSecurityPolicy` sade tutulur.
8. **CORS**: Kapalı; sadece kendi domaini.
9. **Audit Log**: Admin aksiyonları `audit_logs` tablosunda tutulur.
10. **Yedekleme**: DB dosyası günlük snapshot, config `.env` offline saklanır.
11. **2FA (opsiyonel)**: Admin için TOTP modülü planlanır; en azından IP allowlist/SSH tüneli.
12. **Dosya Upload**: Şu an yok; ileride olursa MIME/virus scanning şartı.

Potansiyel risk: Tek dosyalı SQLite yüksek eşzamanlı yazma altında kilitlenebilir. Çözüm: WAL mode ve connection pooling (`PRAGMA journal_mode=WAL`) + ileride PostgreSQL’e taşınmak için migration scriptleri hazırlanır.

---

## 6. Örnek Express Kod Parçaları

```js
// backend/src/server.js
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api/auth', authRouter);
// ... diğer routerlar

app.use(errorHandler);
app.listen(process.env.PORT || 4000);
```

```js
// middleware/auth.js
import jwt from 'jsonwebtoken';
export const requireAuth = (roles = []) => (req, res, next) => {
  const token = req.cookies['access_token'] || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (payload.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended' });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

```js
// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error(err); // prod için Winston ile dosyaya
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
};
```

```js
// models/userModel.js
import db from '../config/db.js';
export const findUserByEmail = (email) => {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
};
export const createUser = ({ email, passwordHash, role, name }) => {
  return db.prepare(`INSERT INTO users (email, password_hash, role, name) VALUES (?,?,?,?)`).run(email, passwordHash, role, name);
};
```

---

## 7. Frontend Sayfaları

1. **Ana Sayfa**: Kategoriler listesi, arama formu (kategori + şehir). Son duyurular.
2. **Kategori Sayfası**: Seçilen kategoriye ait açıklama ve "Talep oluştur" butonu.
3. **Talep Oluştur (Müşteri)**: Çok adımlı form; tarih seçici, bütçe aralığı slider. Validasyon: zorunlu alan kontrolü.
4. **Müşteri Paneli**: Talep listesi, durum, gelen teklifler, filtreleme. Teklif kabul butonu + yorum bırak.
5. **Usta Profil Sayfası**: Kamuya açık kart, ortalama puan, yorum listesi.
6. **Usta Paneli**: Onay durumunu gösteren banner, eşleşen talepler listesi, teklif formu, devam eden işler.
7. **Admin Paneli**:
   - Kullanıcı listesi (tablolar, arama inputu).
   - Usta onay kuyrukları.
   - Kategori yönetimi (modal ile ekle/düzenle).
   - Talep/teklif denetim ekranı.
   - Şikayet yönetimi.
   - İstatistik dashboard: kartlar (toplam kullanıcı, aktif usta, aktif talep, günlük yeni kayıt).
   - Duyuru oluşturma formu.

Frontend, `frontend/views/layouts/main.ejs`, `layouts/admin.ejs` ile ayrılır. Ortak bileşenler `partials/` altında tutulur. Basit mesajlaşma ekranı AJAX ile `/api/requests/:id/messages` endpointine bağlanır.

---

## 8. Form Validasyonu
- **Frontend**: HTML5 `required`, `type="email"`, maskeler; JS ile regex.
- **Backend**: Joi şemaları örneği:
```js
import Joi from 'joi';
export const createRequestSchema = Joi.object({
  categoryId: Joi.number().integer().required(),
  city: Joi.string().max(60).required(),
  district: Joi.string().max(60).required(),
  description: Joi.string().min(20).max(1500).required(),
  desiredDate: Joi.date().greater('now').required(),
  budgetMin: Joi.number().min(0).required(),
  budgetMax: Joi.number().greater(Joi.ref('budgetMin')).required()
});
```

---

## 9. Kurulum & Çalıştırma Rehberi

### Gereksinimler
- Node.js >= 20
- npm >= 9
- SQLite3

### Adımlar
1. `git clone <repo>`
2. `cd backend`
3. `.env` dosyası oluştur:
```
PORT=4000
DATABASE_URL=../data/ustabul61.db
JWT_SECRET=super-secret-change-me
REFRESH_SECRET=super-refresh-secret
BCRYPT_ROUNDS=12
SESSION_COOKIE_DOMAIN=.ustabul61.local
```
4. `npm install`
5. `npm run migrate` (örnek script `sqlite3 $DATABASE_URL < migrations/001_init.sql`)
6. `npm run dev` (nodemon) veya `npm start`
7. Frontend için `cd frontend && npm install && npm run build` (statik asset pipeline) veya `npm run dev`.

### Servisleri Çalıştırma
- Reverse proxy (Nginx) ile `/` -> frontend, `/api` -> backend.
- HTTPS için Let’s Encrypt (ücretsiz).

---

## 10. Test Senaryoları ve Örnek İstekler

### Auth
```
POST /api/auth/register
{
  "name": "Ali",
  "email": "ali@example.com",
  "password": "Sifre!234",
  "role": "customer"
}
```
Beklenen: 201, JWT + kullanıcı objesi.

### Talep Oluşturma
```
POST /api/requests (Auth: customer JWT)
{
  "categoryId": 1,
  "city": "Trabzon",
  "district": "Ortahisar",
  "description": "75 m2 daire için kapsamlı boya hizmeti",
  "desiredDate": "2024-06-30",
  "budgetMin": 5000,
  "budgetMax": 8000
}
```
Yanıt: 201 + request objesi, status = `created`.

### Usta Teklif Verme
```
POST /api/requests/12/offers (Auth: pro JWT)
{
  "price": 6500,
  "estimatedDays": 3,
  "message": "Malzeme dahil, 3 günde teslim"
}
```
Yanıt: 201.

### Admin Usta Onayı
```
PATCH /api/admin/pros/5/approval
{
  "status": "approved"
}
```
Yanıt: 200, audit log kaydı.

Test Stratejisi:
- Jest + supertest ile backend unit/integration testleri (auth, requests, offers).
- Postman koleksiyonu `docs/postman/Ustabul61.postman_collection.json` paylaşılacak.
- E2E smoke testi: yeni müşteri kayıt -> talep -> usta teklif -> müşteri kabul -> review.

---

## 11. Geliştirme Notları ve Gelecek İyileştirmeler
- Websocket ile gerçek zamanlı teklif/mesaj bildirimleri (şimdilik long-poll veya AJAX refresh).
- Admin için iki faktörlü kimlik doğrulama (TOTP) eklenecek hook.
- Bölge bazlı caching için `SQLite` read-only replica (rsync) veya ileride PostgreSQL.
- Infrastructure as Code: docker-compose (backend + sqlite volume + nginx) hazırlanabilir.

Bu plan, tamamen ücretsiz araçlarla çalışabilir, güvenliği temel seviyede ele alan ve geliştirilmeye açık bir MVP sağlar.
