# MachineLog — Redesign Port (Next.js 14 + Tailwind)

ดีไซน์ใหม่แบบ **POS สำหรับร้านเกม** พร้อม Dark/Light theme + Filter system ครบ
แปลงให้ใช้กับ codebase เดิม (`anupong-pakee-dev/roi2pan2-machine-borrow-system`) ได้ทันที

---

## What's New

### Visual
- 🎨 **POS-style Machine Grid** — แตะเครื่องว่าง = ยืม, แตะเครื่องที่ใช้อยู่ = คืน
- 🌗 **Dark / Light theme** — สลับด้วย ToggleButton บน Navbar (เก็บใน localStorage)
- 🔤 **IBM Plex Sans Thai + IBM Plex Mono** — POS feel, ตัวเลขตรงกริด
- 🟢 **Acid lime accent** (`#C4FF3E`) แทนสีส้มเดิม

### UX
- ⚡ **Quick Borrow / Quick Return modals** — ทำงานครบใน 2 คลิก
- 🔍 **Filter Panel** ที่ Admin Dashboard:
  - ช่วงเวลา: วันนี้ / เลือกวัน (date picker) / ทั้งหมด
  - ค้นหา: เลขที่ / เครื่อง / หมายเหตุ (debounced)
  - Machine chips
  - วิธีชำระ: เงินสด / คูปอง / ค้างชำระ
  - Result count + clear-all
- 📊 **Stats cards** เปลี่ยนตาม filter

### Technical
- **CSS variables ใน `globals.css`** — `.theme-dark` / `.theme-light`
- **Tailwind colors** อ้าง CSS vars → token names เดิม (`bg-surface`, `text-light` ฯลฯ) ยังใช้ได้
- **Hot paths แยกไฟล์** — `<MachineTile>`, `<QuickBorrowModal>`, `<QuickReturnModal>`, `<FilterPanel>`, `<ClockBadge>`, `<ThemeToggle>`, `<ModalShell>`
- API contracts (POST `/api/records`, PATCH `/api/records/:id`, DELETE ฯลฯ) **เหมือนเดิม** — ไม่ต้องแก้ backend / Prisma schema

---

## File Tree (ส่วนที่เปลี่ยน)

```
app/
├── globals.css                  ← เขียนใหม่ (CSS vars, theme switch)
├── layout.tsx                   ← เพิ่ม class="theme-dark" บน <html>
├── login/
│   ├── page.tsx                 ← split hero/form layout
│   └── LoginForm.tsx            ← เขียนใหม่ + ปุ่ม "กรอกให้"
├── dashboard/
│   ├── page.tsx                 ← เดิม (server-side fetch)
│   └── DashboardClient.tsx      ← เขียนใหม่ — Machine Grid
├── form/
│   ├── page.tsx                 ← เดิม
│   └── RecordForm.tsx           ← เขียนใหม่ — POS picker
├── return/
│   ├── page.tsx                 ← เดิม
│   └── ReturnForm.tsx           ← เขียนใหม่ — coupon presets + calc
└── admin/dashboard/
    ├── page.tsx                 ← เดิม
    └── AdminDashboardClient.tsx ← เขียนใหม่ — Filter Panel

components/
├── Navbar.tsx                   ← เขียนใหม่ + clock + theme toggle
├── Footer.tsx                   ← minor
├── ClockBadge.tsx               ← ใหม่
├── ThemeToggle.tsx              ← ใหม่
├── MachineTile.tsx              ← ใหม่
├── ModalShell.tsx               ← ใหม่
├── QuickBorrowModal.tsx         ← ใหม่
├── QuickReturnModal.tsx         ← ใหม่
└── FilterPanel.tsx              ← ใหม่

lib/
└── format.ts                    ← ใหม่ (time / date helpers)

tailwind.config.js               ← ขยาย token + CSS vars
```

ไฟล์ที่ **ไม่ต้องแก้:**
- API routes ทั้งหมดใน `app/api/`
- `prisma/schema.prisma`, `lib/prisma.ts`, `lib/auth.ts`
- `middleware.ts`

---

## วิธีนำไป Apply

1. Clone repo เดิม
2. Copy ทุกไฟล์ใน folder `nextjs/` นี้ทับลงไปใน repo (กลายเป็น root)
3. `npm install` (ไม่มี dependency เพิ่ม)
4. `npm run dev`

### หมายเหตุ — มี `/api/admin/users` (POST) ไหม?
ในส่วน Admin > Add User เรียก `POST /api/admin/users` — ถ้า repo ยังไม่มี route นี้ ให้เพิ่ม
หรือลบฟังก์ชัน Add User ออกจาก `AdminDashboardClient.tsx` ก็ได้ (ส่วนอื่นทำงานได้ปกติ)

---

## Page Server Components ที่ต้องปรับ (เล็กน้อย)

### `app/return/page.tsx`
ต้อง `searchParams.id` → fetch borrowing record → ส่งให้ `<ReturnForm>` —
โครงเดิม support อยู่แล้ว, แต่ ReturnForm signature เปลี่ยน เป็น `{ record }` (props เดียว)

### `app/admin/dashboard/page.tsx`
ส่ง `records`, `users`, `currentUserId` (เดิมส่งแบบไหนก็ปรับตาม signature ของ `AdminDashboardClient`):

```tsx
<AdminDashboardClient
  records={allRecords}
  users={allUsers}
  currentUserId={session.userId}
/>
```

---

## Tokens สำหรับนักพัฒนา

| Token | Dark | Light | ใช้ทำอะไร |
|---|---|---|---|
| `bg-ink` | `#0A0C10` | `#F5F2EA` | Background หลัก |
| `bg-surface` | `#14171F` | `#FFFFFF` | Card |
| `bg-panel` | `#1B1E28` | `#FAF7EE` | Elevated panel |
| `text-light` | `#F3F1EA` | `#0C0E12` | Text หลัก |
| `text-muted` | `#7C8090` | `#6B6E78` | Text รอง |
| `bg-accent` | `#C4FF3E` | `#C4FF3E` | Accent (กระทบทั้ง 2 theme) |
| `text-accent-ink` | `#0C0E12` | `#0C0E12` | Text บน accent |
| `text-accent2` | `#FF6B65` | `#D9342B` | Danger |

หลังจาก port แล้วถ้าอยากเปลี่ยน accent ทั้งระบบ — แก้ `--c-accent` ใน `globals.css` ที่เดียวพอ
