# 🦷 DentLab Pro

Multi-tenant dental lab management SaaS. Each lab is isolated. Built with React + Vite + Supabase. Deploy to Vercel in 10 minutes.

## ✨ Features

- 👥 **Roles**: admin, dentist, technician with per-role views
- 🦷 **Orders**: professional FDI dental chart, materials, shades, elements, file attachments
- 🏭 **Workflow**: stages (conception → fraisage → impression → four → maquillage → terminé) with technician assignments + timestamps
- 🚚 **Delivery**: status tracking, driver info, printable 58×50mm labels with QR codes
- 💰 **Finance**: paid/unpaid tracking, dentist payments, supplier purchases & payments, balance reports
- 📊 **Reports**: daily / monthly / yearly, CSV export
- 📦 **Stock**: inventory with movements and low-stock alerts
- 💸 **Expenses**: categorized, exportable
- 📱 **Share**: WhatsApp, Telegram, Facebook
- 🌍 **3 languages**: French, English, Arabic (with RTL)
- 🎨 **Per-lab customization**: theme color, font size, language
- 💵 **11 currencies**: DZD, EUR, USD, MAD, TND, SAR, AED, EGP, GBP, CAD, CHF
- 🔒 **Subscriptions**: you control each lab's access; trial, active, expired, suspended
- 📞 **Your branding**: your name + phone shown on login, sidebar, and "expired" screen
- 🛡️ **Code minification**: production builds are obfuscated

---

## 🚀 Initial setup (one-time, ~15 min)

### 1. Create a Supabase project

1. https://supabase.com → sign up → **New project**
2. Pick a name + strong DB password + region nearest your users
3. Wait ~2 minutes for provisioning

### 2. Run the schemas (in order)

In Supabase dashboard → **SQL Editor** → **New query**:

**a)** Paste entire contents of `supabase/schema.sql` → **Run** ✅
**b)** Paste entire contents of `supabase/schema-v1.1.sql` → **Run** ✅ (adds subscriptions, currencies, branding)

### 3. Set YOUR developer info

In Supabase **SQL Editor**, run once:

```sql
update app_branding set
  dev_name  = 'Your Full Name',
  dev_phone = '+213 XXX XX XX XX',
  dev_email = 'you@example.com',
  dev_site  = 'https://your-site.com'   -- optional
where id = 1;
```

Your info will appear on the login screen, in every sidebar, and on the "expired" screen when subscriptions lapse.

### 4. Configure auth

Supabase → **Authentication → Providers → Email** → turn it **ON**.

For faster testing: toggle **"Confirm email"** OFF. Turn it back ON before production.

### 5. Get your keys

Supabase → **Project Settings → API** → copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 6. Run locally

```bash
cd dentlab-pro
cp .env.example .env          # then edit .env with your keys

npm install
npm run dev
```

Open http://localhost:5173 → **Créer un laboratoire** → enter lab name + your email + password. You become the admin. A **14-day trial** is auto-created.

---

## ☁️ Deploy to Vercel (5 min)

### Via GitHub (recommended — auto-deploy on push)

1. Push this project to a **private** GitHub repo.
2. https://vercel.com → Sign in with GitHub → **Add New Project** → import the repo.
3. Framework: **Vite** (auto-detected).
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy**. You get a URL like `https://dentlab-pro.vercel.app`.

After deploy: add that URL to Supabase → **Authentication → URL Configuration → Site URL** and **Redirect URLs**.

---

## 💰 How to manage subscriptions

You control access to every lab from Supabase's SQL editor. Three common operations:

### Activate a lab for 1 year (12,000 DZD)

```sql
update subscriptions
  set status     = 'active',
      plan       = 'pro',
      starts_at  = current_date,
      expires_at = current_date + interval '1 year',
      amount     = 12000,
      currency   = 'DZD',
      billing_cycle = 'yearly'
where lab_id = (select id from labs where name = 'Labo XYZ');

-- Record the payment:
insert into subscription_payments (lab_id, amount, currency, method, note)
values (
  (select id from labs where name = 'Labo XYZ'),
  12000, 'DZD', 'cash', 'Renouvellement 2026'
);
```

### Suspend a lab that didn't pay

```sql
update subscriptions set status = 'suspended'
  where lab_id = (select id from labs where name = 'Labo ABC');
```

### See all labs + their subscription status

```sql
select l.name, s.status, s.plan, s.expires_at, s.amount, s.currency
from labs l
left join subscriptions s on s.lab_id = l.id
order by s.expires_at asc nulls last;
```

**What the lab sees:**
- Trial → normal access, small banner in last 7 days
- Active → normal access
- Expired / Suspended → full-screen red lock with YOUR contact info; cannot access anything until renewed

---

## 💵 Currencies

Each lab picks its own currency in **Settings → Personnalisation**. Supported: DZD, EUR, USD, MAD, TND, SAR, AED, EGP, GBP, CAD, CHF.

To add more, edit `src/lib/helpers.js` → `CURRENCIES` array.

---

## 🛡️ Source-code protection — realistic expectations

**The honest truth**: every React app ships JavaScript to the browser. It can be *inspected* but is **heavily minified** in production builds (`npm run build`). What I've done:
- ✅ **Terser minification** with name mangling → output is nearly unreadable
- ✅ **Removed all `console.log`** and comments from builds
- ✅ **No source maps** in production
- ✅ **Code splitting** so no single file reveals the whole app
- ✅ **Subscription check** → even if someone extracts the code, it's useless without your Supabase backend

**What actually protects you**:
- 🔒 Keep the GitHub repo **private**
- 🔒 Never share `.env` values or `service_role` key
- 🔒 Subscriptions are enforced server-side (RLS + `is_subscription_active()`)

---

## 👤 Adding users to a lab

Admin logs in → **Utilisateurs** → **+ Utilisateur** → fill name + email + role (dentist / technician).

A temporary password is shown — communicate it to the user. They change it later from their Profile.

---

## 📁 Project structure

```
dentlab-pro/
├── supabase/
│   ├── schema.sql           ← base multi-tenant schema + RLS
│   └── schema-v1.1.sql      ← subscriptions, currencies, branding
├── src/
│   ├── main.jsx             ← entry
│   ├── App.jsx              ← router + sidebar + subscription guard
│   ├── styles.css
│   ├── lib/
│   │   ├── supabase.js      ← Supabase client
│   │   ├── db.js            ← all DB queries — edit here to add data ops
│   │   ├── theme.js         ← color palette factory
│   │   ├── teeth.js         ← FDI tooth numbering
│   │   └── helpers.js       ← money(), today(), exportCSV(), filterByPeriod()
│   ├── i18n/index.js        ← FR/EN/AR translations
│   ├── contexts/AppContext  ← session + profile + settings + subscription
│   ├── components/
│   │   ├── UI.jsx           ← Btn/Inp/Sel/Card/Modal atoms
│   │   ├── ToothChart.jsx   ← professional FDI chart
│   │   ├── QR.jsx           ← QR code canvas
│   │   ├── DevFooter.jsx    ← your name/phone
│   │   └── modals/
│   │       ├── NewCaseModal.jsx
│   │       ├── CaseModal.jsx
│   │       ├── DeliveryModal.jsx
│   │       ├── EtiquetteModal.jsx
│   │       ├── ShareModal.jsx
│   │       └── QRModal.jsx
│   └── pages/
│       ├── Login.jsx         ← login + admin signup
│       ├── Dashboard.jsx
│       ├── Cases.jsx
│       ├── Delivery.jsx
│       ├── Stock.jsx
│       ├── Suppliers.jsx
│       ├── Expenses.jsx
│       ├── Reports.jsx
│       ├── Users.jsx
│       ├── Settings.jsx      ← language / theme / font / currency / types
│       ├── Profile.jsx
│       ├── DoctorPortal.jsx
│       └── TechPortal.jsx
```

---

## 🤖 Asking Claude to edit this code

When you need a change, paste this template into a new Claude chat:

> I'm editing DentLab Pro (React + Supabase, multi-tenant, subscriptions).
> I want to: **[describe the change]**.
> Relevant file: `src/pages/XXX.jsx` — here's the content: [paste file].
> Return the full updated file.

### Quick edit map

| Change | File |
|---|---|
| Translations | `src/i18n/index.js` |
| Add new DB table | `supabase/schema.sql` + RLS + `src/lib/db.js` |
| Add new currency | `src/lib/helpers.js` → `CURRENCIES` |
| New page | Create `src/pages/X.jsx` + register in `src/App.jsx` |
| Color theme | `src/lib/theme.js` |
| Tooth chart style | `src/components/ToothChart.jsx` |
| Order form fields | `src/components/modals/NewCaseModal.jsx` |
| Subscription plans / pricing | Update via Supabase SQL (see above) |
| Your name/phone on footer | `update app_branding ... where id=1;` (SQL) |

---

## 🐛 Troubleshooting

| Symptom | Fix |
|---|---|
| "Invalid API key" | Check `.env`, restart `npm run dev` |
| Can't sign up | Supabase → Auth → URL Configuration → add your deploy URL |
| User sees no data | Their `profiles.lab_id` must match row `lab_id` |
| "Profil introuvable" after signup | Re-run `schema.sql` to reinstall the trigger |
| Email not sending | Supabase free tier = 3/hour. Add custom SMTP for production |
| "Accès suspendu" immediately after signup | Subscription row missing. Check `subscriptions` table — the `on_lab_created` trigger should create it |

---

## 📜 License

MIT. Use and modify freely.
