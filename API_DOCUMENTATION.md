# 🌍 EcoWatch API Hujjati (Frontend uchun)

> **Base URL:** `https://your-domain.com` yoki `http://localhost:8000`
> **API Docs (Swagger):** `/docs`
> **API Docs (ReDoc):** `/redoc`

---

## 📋 Mundarija

1. [Autentifikatsiya (Login/Register)](#1-autentifikatsiya)
2. [Admin Panel API'lari](#2-admin-panel-apilari)
3. [Moderator Panel API'lari](#3-moderator-panel-apilari)
4. [Shikoyatlar (Reports) API'lari](#4-shikoyatlar-reports-apilari)
5. [Ochiq API'lar (Login talab qilmaydi)](#5-ochiq-apilar)
6. [WebSocket (Real-time)](#6-websocket)
7. [Enum qiymatlari](#7-enum-qiymatlari)
8. [Xatolik kodlari](#8-xatolik-kodlari)
9. [Test hisoblar](#9-test-hisoblar)

---

## 1. Autentifikatsiya

### 🔐 Umumiy qoidalar
- Token turni: **Bearer JWT**
- Har bir himoyalangan so'rovda header yuboriladi:
```
Authorization: Bearer <access_token>
```
- Token muddati: **24 soat** (1440 daqiqa)

---

### 1.1 Login (Kirish)

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "adminos",       // email yoki username bo'lishi mumkin
  "password": "P1l2a3y4%"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "adminos@ecowatch.uz",
    "username": "adminos",
    "full_name": "Admin OS",
    "phone": null,
    "role": "admin",             // ⭐ "admin", "moderator", "user", "organization"
    "is_active": true,
    "is_verified": true,
    "organization_name": null,
    "organization_type": null,
    "points": 0,
    "reports_count": 0,
    "verified_reports_count": 0,
    "rank": "Yangi",
    "avatar_url": null,
    "created_at": "2026-02-26T10:00:00Z"
  }
}
```

**Xatoliklar:**
| Kod | Xabar | Sabab |
|-----|-------|-------|
| 401 | "Email/username yoki parol noto'g'ri" | Noto'g'ri login ma'lumotlari |
| 403 | "Hisobingiz bloklangan" | Foydalanuvchi bloklangan |

---

### 1.2 Register (Ro'yxatdan o'tish)

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "foydalanuvchi",
  "full_name": "Foydalanuvchi Ismi",
  "password": "parol123",
  "phone": "+998901234567"     // ixtiyoriy
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 5,
    "email": "user@example.com",
    "username": "foydalanuvchi",
    "full_name": "Foydalanuvchi Ismi",
    "role": "user",
    // ... boshqa maydonlar
  }
}
```

**Validatsiya qoidalari:**
- `username`: kamida 3 belgi, faqat harf, raqam, `_`, `-`
- `password`: kamida 6 belgi

---

### 1.3 Profil olish (joriy foydalanuvchi)

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):** `UserResponse` obyekti (yuqoridagi user kabi)

---

### 1.4 Profilni yangilash

```
PUT /api/auth/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "full_name": "Yangi Ism",       // ixtiyoriy
  "phone": "+998901234567",       // ixtiyoriy
  "avatar_url": "/uploads/avatar.jpg"  // ixtiyoriy
}
```

---

## 2. Admin Panel API'lari

> ⚠️ **Barcha admin endpointlar `role: "admin"` bo'lgan tokenni talab qiladi**

### 2.1 Barcha foydalanuvchilar ro'yxati

```
GET /api/auth/users?skip=0&limit=50&role=moderator
Authorization: Bearer <admin_token>
```

**Query parametrlari:**
| Parametr | Tur | Default | Tavsif |
|----------|-----|---------|--------|
| `skip` | int | 0 | Sahifalash uchun o'tkazib yuborish |
| `limit` | int | 50 | Nechta foydalanuvchi qaytarish |
| `role` | string | null | Filtr: `"user"`, `"moderator"`, `"admin"`, `"organization"` |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "adminos@ecowatch.uz",
    "username": "adminos",
    "full_name": "Admin OS",
    "phone": null,
    "role": "admin",
    "is_active": true,
    "is_verified": true,
    "organization_name": null,
    "organization_type": null,
    "points": 0,
    "reports_count": 0,
    "verified_reports_count": 0,
    "rank": "Yangi",
    "avatar_url": null,
    "created_at": "2026-02-26T10:00:00Z"
  },
  {
    "id": 2,
    "email": "moderator@ecowatch.uz",
    "username": "moderator",
    "full_name": "Ekologiya Bo'limi",
    "role": "moderator",
    "organization_name": "Ekologiya Qo'mitasi",
    "organization_type": "ekologiya",
    // ...
  }
]
```

---

### 2.2 Yangi moderator/tashkilot yaratish

```
POST /api/auth/create-moderator?role=moderator&organization_name=Ekologiya&organization_type=ekologiya
Authorization: Bearer <admin_token>
```

**Query parametrlari:**
| Parametr | Tur | Default | Tavsif |
|----------|-----|---------|--------|
| `role` | string | `"moderator"` | `"moderator"` yoki `"organization"` |
| `organization_name` | string | `""` | Tashkilot nomi |
| `organization_type` | string | `""` | Tashkilot turi: `"ekologiya"`, `"yol_qurilish"` |

**Request Body:**
```json
{
  "email": "yangi_mod@ecowatch.uz",
  "username": "yangi_moderator",
  "full_name": "Yangi Moderator",
  "password": "parol123",
  "phone": "+998901234567"
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "email": "yangi_mod@ecowatch.uz",
  "username": "yangi_moderator",
  "full_name": "Yangi Moderator",
  "role": "moderator",
  "is_active": true,
  "is_verified": true,
  "organization_name": "Ekologiya",
  "organization_type": "ekologiya",
  // ...
}
```

---

### 2.3 Foydalanuvchi rolini o'zgartirish

```
PUT /api/auth/users/{user_id}/role
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "role": "moderator",                   // "user", "moderator", "admin", "organization"
  "organization_name": "Tashkilot Nomi", // ixtiyoriy
  "organization_type": "ekologiya"       // ixtiyoriy
}
```

**Response (200 OK):** Yangilangan `UserResponse` obyekti

---

### 2.4 Foydalanuvchini bloklash/faollashtirish (toggle)

```
PUT /api/auth/users/{user_id}/toggle-active
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "id": 5,
  "is_active": false,   // har safar teskari qiymatga o'zgaradi
  // ... boshqa maydonlar
}
```

---

### 2.5 Foydalanuvchini o'chirish

```
DELETE /api/auth/users/{user_id}
Authorization: Bearer <admin_token>
```

**Response:** `204 No Content` (bo'sh javob)

> ⚠️ Admin foydalanuvchini o'chirib bo'lmaydi (400 xatolik qaytaradi)

---

## 3. Moderator Panel API'lari

> ⚠️ **Moderator endpointlar `role: "moderator"`, `"admin"` yoki `"organization"` bo'lgan tokenni talab qiladi**

### 3.1 Kutilayotgan shikoyatlar ro'yxati

```
GET /api/reports/moderator/pending?skip=0&limit=50&category=ekologiya
Authorization: Bearer <moderator_token>
```

**Query parametrlari:**
| Parametr | Tur | Default | Tavsif |
|----------|-----|---------|--------|
| `skip` | int | 0 | Sahifalash |
| `limit` | int | 50 | Limit |
| `category` | string | null | Kategoriya filtri |

> 📌 **Muhim:** Moderatorning `organization_type` ga qarab, faqat o'z sohasidagi hisobotlar ko'rsatiladi:
> - `"ekologiya"` → ekologiya, suv, havo, daraxt_kesish, chiqindi
> - `"yol_qurilish"` → yol_qurilish, qurilish_buzilishi

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Suv ifloslanishi",
    "category": "suv_muammosi",
    "priority": "yuqori",
    "latitude": 41.3111,
    "longitude": 69.2797,
    "address": "Toshkent, Chilonzor tumani",
    "status": "kutilmoqda",
    "author_name": "Foydalanuvchi Ismi",
    "upvotes": 5,
    "views_count": 23,
    "images_count": 2,
    "comments_count": 1,
    "created_at": "2026-02-26T09:00:00Z"
  }
]
```

---

### 3.2 Shikoyatni tasdiqlash yoki rad etish

```
PUT /api/reports/{report_id}/verify
Authorization: Bearer <moderator_token>
```

**Request Body:**
```json
{
  "status": "tasdiqlangan",                // "tasdiqlangan", "rad_etilgan", "tekshirilmoqda"
  "moderator_comment": "Hisobot haqiqiy, tekshirildi",  // ixtiyoriy
  "points_to_award": 10                    // muallifga beriladigan ball (ixtiyoriy, default: 0)
}
```

**Response (200 OK):** To'liq `ReportResponse` obyekti

> 📌 Agar `status: "tasdiqlangan"` va `points_to_award > 0` bo'lsa:
> - Muallif (author) ga ball beriladi
> - Mukofot (reward) yozuvi yaratilinadi
> - Muallifning ranki yangilanadi

---

### 3.3 Muammoni hal qilindi deb belgilash

```
PUT /api/reports/{report_id}/resolve
Authorization: Bearer <moderator_token>
```

**Request Body:**
```json
{
  "resolution_description": "Suv tarmog'i ta'mirlandi va tozalandi",
  "points_to_award": 10     // qo'shimcha ball (ixtiyoriy, default: 10)
}
```

**Response (200 OK):** To'liq `ReportResponse` obyekti

---

### 3.4 Shikoyatga rasmiy izoh qo'shish

```
POST /api/reports/{report_id}/comments
Authorization: Bearer <moderator_token>
```

**Request Body:**
```json
{
  "content": "Hisobot qabul qilindi. Tekshiruv boshlanmoqda."
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "report_id": 5,
  "author_id": 2,
  "author_name": "Ekologiya Bo'limi",
  "author_role": "moderator",
  "content": "Hisobot qabul qilindi. Tekshiruv boshlanmoqda.",
  "is_official": true,       // ⭐ moderator/admin/organization uchun avtomatik true
  "created_at": "2026-02-26T10:15:00Z"
}
```

---

## 4. Shikoyatlar (Reports) API'lari

### 4.1 Yangi shikoyat yaratish

```
POST /api/reports/
Authorization: Bearer <token>    // yoki token bo'lmasa guest sifatida
```

**Request Body:**
```json
{
  "title": "Daryo ifloslanishi",
  "description": "Chirchiq daryosiga kimyoviy moddalar tashlanmoqda. Baliqlar halok bo'layotgan.",
  "category": "suv_muammosi",
  "latitude": 41.3111,
  "longitude": 69.2797,
  "address": "Toshkent, Chirchiq daryosi yonida",
  "region": "Toshkent",
  "district": "Olmazor",
  "priority": "yuqori"
}
```

**Validatsiya:**
- `title`: 5-300 belgi
- `description`: kamida 10 belgi
- `latitude`: -90 dan 90 gacha
- `longitude`: -180 dan 180 gacha

**Response (201 Created):** To'liq `ReportResponse` obyekti

---

### 4.2 Shikoyatga rasm yuklash

```
POST /api/reports/{report_id}/images
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Tur | Tavsif |
|-------|-----|--------|
| `file` | File | Rasm fayli (max 10MB) |

> ⚠️ Har bir hisobot uchun **maksimum 5 ta rasm** yuklash mumkin

**Response (200 OK):**
```json
{
  "id": 1,
  "image_url": "/uploads/abc123.jpg",
  "thumbnail_url": "/uploads/thumbnails/abc123_thumb.jpg",
  "original_filename": "foto.jpg",
  "created_at": "2026-02-26T10:05:00Z"
}
```

---

### 4.3 Shikoyatlar ro'yxati (filtrlar bilan)

```
GET /api/reports/?skip=0&limit=50&category=ekologiya&status=kutilmoqda&priority=yuqori&region=Toshkent&search=suv&my_reports=false
Authorization: Bearer <token>    // ixtiyoriy
```

**Query parametrlari:**
| Parametr | Tur | Default | Tavsif |
|----------|-----|---------|--------|
| `skip` | int | 0 | Sahifalash |
| `limit` | int | 50 | Limit |
| `category` | string | null | Kategoriya filtri |
| `status` | string | null | Status filtri |
| `priority` | string | null | Muhimlik filtri |
| `region` | string | null | Viloyat filtri |
| `search` | string | null | Qidiruv (title va description da) |
| `my_reports` | bool | false | Faqat o'z hisobotlarim |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Daryo ifloslanishi",
    "category": "suv_muammosi",
    "priority": "yuqori",
    "latitude": 41.3111,
    "longitude": 69.2797,
    "address": "Toshkent, Chirchiq daryosi yonida",
    "status": "kutilmoqda",
    "author_name": "Test User",
    "upvotes": 5,
    "views_count": 23,
    "images_count": 2,
    "comments_count": 1,
    "created_at": "2026-02-26T09:00:00Z"
  }
]
```

---

### 4.4 Bitta shikoyatni to'liq ko'rish

```
GET /api/reports/{report_id}
```
> 🔓 Bu endpoint **ochiq** — token talab qilmaydi

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Daryo ifloslanishi",
  "description": "Chirchiq daryosiga kimyoviy moddalar tashlanmoqda...",
  "category": "suv_muammosi",
  "priority": "yuqori",
  "latitude": 41.3111,
  "longitude": 69.2797,
  "address": "Toshkent, Chirchiq daryosi yonida",
  "region": "Toshkent",
  "district": "Olmazor",
  "status": "tasdiqlangan",
  "author_id": 4,
  "author_name": "Test User",
  "moderator_id": 2,
  "moderator_comment": "Tekshirildi, haqiqiy",
  "verified_at": "2026-02-26T10:30:00Z",
  "resolution_description": null,
  "resolved_at": null,
  "points_awarded": 10,
  "upvotes": 5,
  "views_count": 24,
  "images": [
    {
      "id": 1,
      "image_url": "/uploads/abc123.jpg",
      "thumbnail_url": "/uploads/thumbnails/abc123_thumb.jpg",
      "original_filename": "foto.jpg",
      "created_at": "2026-02-26T09:05:00Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "report_id": 1,
      "author_id": 2,
      "author_name": "Ekologiya Bo'limi",
      "author_role": "moderator",
      "content": "Tekshiruv boshlanmoqda",
      "is_official": true,
      "created_at": "2026-02-26T10:15:00Z"
    }
  ],
  "created_at": "2026-02-26T09:00:00Z",
  "updated_at": "2026-02-26T10:30:00Z"
}
```

---

### 4.5 Shikoyatni yangilash

```
PUT /api/reports/{report_id}
Authorization: Bearer <token>
```

> ⚠️ Faqat muallif + faqat `"kutilmoqda"` yoki `"rad_etilgan"` statusdagi hisobotlarni o'zgartirish mumkin

**Request Body:**
```json
{
  "title": "Yangilangan sarlavha",       // ixtiyoriy
  "description": "Yangilangan tavsif",   // ixtiyoriy
  "category": "havo_ifloslanishi",       // ixtiyoriy
  "priority": "juda_muhim"              // ixtiyoriy
}
```

---

### 4.6 Shikoyatni o'chirish

```
DELETE /api/reports/{report_id}
Authorization: Bearer <token>
```

> Faqat muallif yoki admin o'chirishi mumkin

**Response:** `204 No Content`

---

### 4.7 Shikoyatga ovoz berish (upvote/like)

```
POST /api/reports/{report_id}/upvote
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "upvotes": 6
}
```

---

## 5. Ochiq API'lar (Login talab qilmaydi)

### 5.1 Xarita markerlari

```
GET /api/reports/map?category=ekologiya&status=kutilmoqda&min_lat=40&max_lat=42&min_lng=68&max_lng=70
```

**Query parametrlari:**
| Parametr | Tur | Tavsif |
|----------|-----|--------|
| `category` | string | Kategoriya filtri |
| `status` | string | Status filtri |
| `min_lat` | float | Minimal latitude |
| `max_lat` | float | Maksimal latitude |
| `min_lng` | float | Minimal longitude |
| `max_lng` | float | Maksimal longitude |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Daryo ifloslanishi",
    "category": "suv_muammosi",
    "priority": "yuqori",
    "latitude": 41.3111,
    "longitude": 69.2797,
    "status": "kutilmoqda",
    "upvotes": 5,
    "created_at": "2026-02-26T09:00:00Z"
  }
]
```

---

### 5.2 Statistika

```
GET /api/reports/stats
```

**Response (200 OK):**
```json
{
  "total_reports": 156,
  "pending": 45,
  "under_review": 23,
  "verified": 56,
  "resolved": 28,
  "rejected": 4,
  "by_category": {
    "ekologiya": 30,
    "yol_qurilish": 25,
    "suv_muammosi": 20,
    "havo_ifloslanishi": 15,
    "chiqindi": 18,
    "shovqin": 8,
    "daraxt_kesish": 12,
    "qurilish_buzilishi": 10,
    "boshqa": 18
  },
  "by_priority": {
    "past": 30,
    "o'rta": 60,
    "yuqori": 45,
    "juda_muhim": 21
  }
}
```

---

### 5.3 Reyting (Leaderboard)

```
GET /api/auth/leaderboard?limit=20
```

**Response (200 OK):**
```json
[
  {
    "id": 4,
    "username": "eco_hero",
    "full_name": "Anvar Karimov",
    "points": 250,
    "verified_reports_count": 25,
    "rank": "Ekspert",
    "avatar_url": "/uploads/avatar.jpg"
  }
]
```

---

### 5.4 Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "ecowatch-api"
}
```

---

## 6. WebSocket (Real-time)

```javascript
// Ulanish
const ws = new WebSocket('ws://localhost:8000/ws/all');
// Yoki aniq viloyat: ws://localhost:8000/ws/toshkent

ws.onopen = () => {
  console.log('WebSocket ulandi');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Yangi xabar:', data);
  // data: { type: "new_report", report: {...} }
};

ws.onclose = () => {
  console.log('WebSocket uzildi');
};
```

---

## 7. Enum qiymatlari

### UserRole (Foydalanuvchi rollari)
| Qiymat | Tavsif |
|--------|--------|
| `"user"` | Oddiy foydalanuvchi |
| `"moderator"` | Moderator |
| `"admin"` | Administrator |
| `"organization"` | Tashkilot |

### ReportCategory (Hisobot kategoriyalari)
| Qiymat | Tavsif |
|--------|--------|
| `"ekologiya"` | Ekologiya |
| `"yol_qurilish"` | Yo'l qurilish |
| `"suv_muammosi"` | Suv muammosi |
| `"havo_ifloslanishi"` | Havo ifloslanishi |
| `"chiqindi"` | Chiqindi |
| `"shovqin"` | Shovqin |
| `"daraxt_kesish"` | Daraxt kesish |
| `"qurilish_buzilishi"` | Qurilish buzilishi |
| `"boshqa"` | Boshqa |

### ReportStatus (Hisobot statuslari)
| Qiymat | Tavsif | Rang tavsiyasi |
|--------|--------|---------------|
| `"kutilmoqda"` | Kutilmoqda | 🟡 Sariq |
| `"tekshirilmoqda"` | Tekshirilmoqda | 🔵 Ko'k |
| `"tasdiqlangan"` | Tasdiqlangan | 🟢 Yashil |
| `"rad_etilgan"` | Rad etilgan | 🔴 Qizil |
| `"hal_qilinmoqda"` | Hal qilinmoqda | 🟠 To'q sariq |
| `"hal_qilindi"` | Hal qilindi | ✅ Yashil |
| `"yopilgan"` | Yopilgan | ⚫ Kulrang |

### ReportPriority (Muhimlik darajasi)
| Qiymat | Tavsif | Rang tavsiyasi |
|--------|--------|---------------|
| `"past"` | Past | 🟢 Yashil |
| `"o'rta"` | O'rta | 🟡 Sariq |
| `"yuqori"` | Yuqori | 🟠 To'q sariq |
| `"juda_muhim"` | Juda muhim | 🔴 Qizil |

### User Rank (Foydalanuvchi darajasi)
| Rank | Talab |
|------|-------|
| `"Yangi"` | 0-4 tasdiqlangan hisobot |
| `"Faol"` | 5-19 tasdiqlangan hisobot |
| `"Ekspert"` | 20-49 tasdiqlangan hisobot |
| `"Lider"` | 50+ tasdiqlangan hisobot |

---

## 8. Xatolik kodlari

| HTTP Kod | Tavsif |
|----------|--------|
| `200` | Muvaffaqiyatli |
| `201` | Yaratildi |
| `204` | O'chirildi (bo'sh javob) |
| `400` | Noto'g'ri so'rov (validatsiya xatosi) |
| `401` | Avtorizatsiya muvaffaqiyatsiz (token yo'q/noto'g'ri) |
| `403` | Ruxsat yo'q (roli yetarli emas) |
| `404` | Topilmadi |
| `422` | Validatsiya xatosi (Pydantic) |

**Xatolik javob formati:**
```json
{
  "detail": "Xatolik xabari"
}
```

**Validatsiya xatolik formati (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "title"],
      "msg": "Sarlavha kamida 5 ta belgidan iborat bo'lishi kerak",
      "type": "value_error"
    }
  ]
}
```

---

## 9. Test hisoblar

| Rol | Username/Email | Parol | Tavsif |
|-----|---------------|-------|--------|
| 🔴 Admin | `adminos` | `P1l2a3y4%` | Admin panel kirish |
| 🟡 Moderator (Ekologiya) | `moderator` | `mod123` | Ekologiya moderatori |
| 🟡 Moderator (Yo'l) | `road_moderator` | `road123` | Yo'l qurilish moderatori |
| 🟢 Guest | `guest` | `guest123` | Mehmon foydalanuvchi |

---

## 📌 Frontend uchun muhim eslatmalar

### Token saqlash
```javascript
// Login qilganda tokenni saqlash
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'adminos', password: 'P1l2a3y4%' })
});
const data = await response.json();
localStorage.setItem('token', data.access_token);
localStorage.setItem('user', JSON.stringify(data.user));
```

### Autentifikatsiya bilan so'rov yuborish
```javascript
const token = localStorage.getItem('token');

const response = await fetch('/api/auth/users', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Rasm yuklash (multipart/form-data)
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(`/api/reports/${reportId}/images`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // ⚠️ Content-Type NI QOYMANG - browser avtomatik belgilaydi
  },
  body: formData
});
```

### Rol tekshirish (frontend)
```javascript
const user = JSON.parse(localStorage.getItem('user'));

if (user.role === 'admin') {
  // Admin panelni ko'rsatish
} else if (user.role === 'moderator' || user.role === 'organization') {
  // Moderator panelni ko'rsatish
} else {
  // Oddiy foydalanuvchi interfeysi
}
```

### API Sahifalash (pagination)
```javascript
// 1-sahifa
const page1 = await fetch('/api/reports/?skip=0&limit=20');
// 2-sahifa  
const page2 = await fetch('/api/reports/?skip=20&limit=20');
// 3-sahifa
const page3 = await fetch('/api/reports/?skip=40&limit=20');
```

---

## 🔗 Rasmlar URL'lari

Rasmlar `/uploads/` yo'lida saqlanadi:
```
Asl rasm:    http://localhost:8000/uploads/abc123.jpg
Thumbnail:   http://localhost:8000/uploads/thumbnails/abc123_thumb.jpg
```

---

## 🏗️ Admin Panel sahifalari tavsiyasi

1. **Dashboard** - Statistika (`GET /api/reports/stats`) + so'nggi hisobotlar
2. **Foydalanuvchilar** - Ro'yxat, rol o'zgartirish, bloklash (`GET /api/auth/users`)
3. **Moderator yaratish** - Yangi moderator qo'shish formasi (`POST /api/auth/create-moderator`)
4. **Hisobotlar** - Barcha hisobotlar ro'yxati filtrlar bilan (`GET /api/reports/`)

## 🏗️ Moderator Panel sahifalari tavsiyasi

1. **Dashboard** - Kutilayotgan hisobotlar soni + statistika
2. **Kutilayotganlar** - Pending hisobotlar (`GET /api/reports/moderator/pending`)
3. **Hisobot tekshiruvi** - Alohida hisobot ko'rish + tasdiqlash/rad etish (`PUT /api/reports/{id}/verify`)
4. **Hal qilish** - Muammoni hal qilindi deb belgilash (`PUT /api/reports/{id}/resolve`)
