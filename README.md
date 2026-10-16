# GolfPulse — Powered by CIS
## International Multi-Club Golf Tournament Platform

Production-ready Next.js platform with Neon PostgreSQL, Prisma ORM, Admin Authentication, Role-Based Access Control, and a full-featured **Website Media Manager**.

---

## 🌟 What's Included in Phase 2

- **Admin Authentication**:
  - Secure session management with `jose` JWTs and HttpOnly cookies.
  - Password hashing with `bcryptjs` (cost factor 12).
  - Rate limiting & generic error responses to prevent account enumeration.
  - Server-side role permission checks (`SUPER_ADMIN`, `PLATFORM_ADMIN`, `CONTENT_MANAGER`, `VIEWER`).
  - Immutable audit logs for media modifications and administrative operations.
- **Website Media Manager**:
  - Centralized image slot architecture mapping every public route and card (`home`, `tournaments`, `clubs`, `gallery`, `about`, `contact`, `faq`, `leaderboards`).
  - Live preview thumbnails, recommended dimensions, aspect ratios, and stock resets.
  - Tournament-specific and club-specific dynamic slot resolution.
- **Interactive Image Cropper Studio**:
  - Client-side crop & framing modal with `react-easy-crop`.
  - Aspect ratio presets: **Hero Wide (16:9)**, **Cinematic (21:9)**, **Landscape (4:3)**, **Gallery (3:2)**, **Square (1:1)**, **Portrait (3:4)**.
  - Zoom slider, 90° rotation, drag-to-reposition, and real canvas blob processing to WebP.
- **Media Library & Gallery Manager**:
  - Searchable digital asset manager tracking active slot assignments.
  - Gallery item curator with publish/draft toggle and dynamic public page feed.
- **Database & Storage**:
  - Neon PostgreSQL integration with migration tracking (`prisma/migrations`).
  - Dual storage engine: Vercel Blob cloud storage with automatic local fallback.

---

## 🛠️ Environment Variables Setup

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
# Google Gemini API key for the AI Golf Assistant
GEMINI_API_KEY=your_gemini_api_key_here

# Neon PostgreSQL connection string (from Neon console)
DATABASE_URL="postgresql://user:password@endpoint-pooler.region.neon.tech/neondb?sslmode=require"

# Admin JWT secret key (must be 32+ characters in production)
ADMIN_JWT_SECRET="golfpulse-super-secret-key-change-in-production-2026-secure"

# Optional Cloud Storage (e.g. Vercel Blob)
BLOB_READ_WRITE_TOKEN=""
```

---

## 🚀 Setup & Database Migration

1. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Generate Prisma Client**:
   ```bash
   node ./node_modules/prisma/build/index.js generate
   ```

3. **Run Database Migrations on Neon**:
   ```bash
   node scripts/run-migrate.js
   ```

4. **Seed Default Media Slots & Gallery Data**:
   ```bash
   node scripts/seed-media.js
   ```

5. **Bootstrap the First SUPER_ADMIN**:
   Run the secure server-side command with your desired email and password:
   ```bash
   node scripts/bootstrap-superadmin.js <email> <password> [fullName]
   ```
   *Example:*
   ```bash
   node scripts/bootstrap-superadmin.js admin@golfpulse.com SecurePga2026! "GolfPulse Admin"
   ```
   *(Note: This bootstrap command is guarded and will automatically reject execution if a SUPER_ADMIN already exists).*

---

## 🏃 Running the Application

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm run start
```

---

## 🔐 Administrative Access & Credentials

- **Admin Login Route**: `/admin/login`
- **Admin Dashboard**: `/admin/dashboard`
- **Website Media Manager**: `/admin/media`
- **Media Library**: `/admin/media-library`
- **Gallery Manager**: `/admin/gallery`
- **Admin Users**: `/admin/users` (Super Admin only)
- **Audit Logs**: `/admin/audit-logs` (Super Admin only)
- **Profile / Password Change**: `/admin/profile`

---

## ⛳ Public Website Integration

All public pages (`/`, `/about`, `/clubs`, `/clubs/[slug]`, `/tournaments`, `/tournaments/[slug]`, `/leaderboards`, `/gallery`, `/faq`, `/contact`) resolve their imagery dynamically via the `MediaProvider` and `getMediaUrl` resolver layer:
- **Zero code changes required** to replace public images.
- Instant cache-busting updates in production.
- Safe default stock fallbacks if the database is temporarily unreachable.
