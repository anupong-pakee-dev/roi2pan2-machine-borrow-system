# MachineLog — ระบบบันทึกการยืม-คืนเครื่อง

ระบบ web application สำหรับบันทึกการยืม-คืนเครื่อง พร้อม Dashboard และระบบ Admin

---

## Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Framework  | Next.js 14 (App Router)        |
| Database   | PostgreSQL                    |
| ORM        | Prisma 5                      |
| Styling    | Tailwind CSS                  |
| Auth       | JWT (jose) + HTTP-only Cookie |
| Language   | TypeScript                    |

---

## หน้าเว็บ

| Path                  | คำอธิบาย                                 | Role       |
|-----------------------|------------------------------------------|------------|
| `/login`              | หน้าเข้าสู่ระบบ                          | ทุกคน     |
| `/dashboard`          | Dashboard แสดงรายการล่าสุด + สถิติ       | User/Admin |
| `/form`               | ฟอร์มบันทึกการยืม-คืนเครื่อง            | User/Admin |
| `/admin/dashboard`    | Admin panel: จัดการ User, ดูทุก Record  | Admin only |

**ทุกหน้ามี Footer และ Navbar**

---

## Database Schema

### `Record`
| Field      | Type     | Description                           |
|------------|----------|---------------------------------------|
| id         | String   | UUID (auto)                           |
| number     | Int      | เลขที่ เช่น 232                      |
| machine    | String   | ชื่อเครื่อง เช่น S10                 |
| borrowAt   | String   | เวลายืม รูปแบบ "HH.MM" เช่น 14.30   |
| returnAt   | String   | เวลาคืน รูปแบบ "HH.MM" เช่น 18.20   |
| minutes    | Int      | คำนวณอัตโนมัติจากระยะห่างเวลา        |
| baht       | Int      | = minutes (นาทีละ 1 บาท)             |
| coupon     | Int      | คูปองที่ใช้ (บาท)                    |
| debt       | Int      | หนี้ = max(0, baht - coupon)         |
| change     | Int      | เงินทอน = max(0, coupon - baht)      |
| reports    | String?  | หมายเหตุ (optional)                  |
| createdAt  | DateTime | auto                                  |
| updatedAt  | DateTime | auto                                  |

### `User`
| Field      | Type     | Description           |
|------------|----------|-----------------------|
| id         | String   | UUID (auto)           |
| username   | String   | Unique                |
| password   | String   | bcrypt hashed         |
| role       | String   | "admin" หรือ "user"  |
| createdAt  | DateTime | auto                  |
| updatedAt  | DateTime | auto                  |

---

## ติดตั้งและใช้งาน

### ความต้องการ
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & ติดตั้ง

```bash
cd machine-borrow
npm install
```

### 2. ตั้งค่า Database

แก้ไขไฟล์ `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/machine_borrow"
JWT_SECRET="your-super-secret-key"
```

### 3. สร้างฐานข้อมูล

```bash
# สร้าง database ก่อน (ใน psql)
createdb machine_borrow

# Push schema
npm run db:push

# Seed ข้อมูลตัวอย่าง
npm run db:seed
```

### 4. รัน Dev Server

```bash
npm run dev
```

เปิด → **http://localhost:3000**

---

## บัญชีผู้ใช้เริ่มต้น

| Username | Password   | Role  |
|----------|-----------|-------|
| admin    | admin1234 | admin |
| user     | user1234  | user  |

---

## API Routes

| Method | Path                      | Description              | Auth         |
|--------|---------------------------|--------------------------|--------------|
| POST   | `/api/auth/login`         | เข้าสู่ระบบ             | Public       |
| POST   | `/api/auth/logout`        | ออกจากระบบ              | Authenticated|
| GET    | `/api/records`            | ดึงรายการทั้งหมด         | Authenticated|
| POST   | `/api/records`            | สร้างรายการใหม่          | Authenticated|
| DELETE | `/api/admin/users/:id`    | ลบผู้ใช้                | Admin only   |

---

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run db:push      # Sync Prisma schema to DB
npm run db:seed      # Seed initial data
npm run db:studio    # Open Prisma Studio (GUI)
```

---

## โครงสร้างไฟล์

```
machine-borrow/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   ├── auth/logout/route.ts
│   │   ├── records/route.ts
│   │   └── admin/users/[id]/route.ts
│   ├── login/
│   │   ├── page.tsx          ← หน้า Login
│   │   └── LoginForm.tsx
│   ├── dashboard/
│   │   └── page.tsx          ← Dashboard
│   ├── form/
│   │   ├── page.tsx          ← หน้าฟอร์ม
│   │   └── RecordForm.tsx
│   ├── admin/dashboard/
│   │   ├── page.tsx          ← Admin Dashboard
│   │   └── AdminActions.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              ← Redirect
├── components/
│   ├── Navbar.tsx
│   └── Footer.tsx
├── lib/
│   ├── auth.ts               ← JWT utils
│   ├── prisma.ts             ← Prisma client
│   └── time.ts               ← Time calculations
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts             ← Route protection
├── .env
└── package.json
```
