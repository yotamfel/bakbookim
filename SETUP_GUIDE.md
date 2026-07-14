# מדריך הקמה — bakbookim

מדריך צעד-אחר-צעד. את/ה מריץ/ה את הפקודות בעצמך; אני (Claude) יכול לעזור לדבג אם משהו נתקע.

---

## שלב 0: לוקאלית (קודם כל, לפני כל פריסה)

### 0.1 Neon (Postgres + pgvector)

1. הרשמה/כניסה ל-https://neon.tech, יצירת פרויקט חדש (למשל `bakbookim`).
2. ב-SQL editor של הפרויקט (או דרך `psql`), להריץ פעם אחת:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
   (למעשה `alembic upgrade head` שלמטה כבר מריץ את זה, אבל אין נזק להריץ גם ידנית.)
3. להעתיק את ה-connection string (Neon dashboard → Connection Details). ודא/י שהוא בפורמט:
   ```
   postgresql+psycopg://USER:PASSWORD@HOST/DBNAME?sslmode=require
   ```
   (Neon בד"כ נותן `postgresql://...` — צריך להוסיף `+psycopg` אחרי `postgresql`.)

### 0.2 מפתחות API

- Anthropic: https://console.anthropic.com/settings/keys
- OpenAI: https://platform.openai.com/api-keys

### 0.3 Backend לוקאלי

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# ערוך/י את .env: DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY
# JWT_SECRET / IP_HASH_SALT — ליצור עם:
python -c "import secrets; print(secrets.token_hex(32))"

alembic upgrade head              # יוצר את כל הטבלאות + מפעיל pgvector
python -m jobs.seed_admin admin <סיסמה-חזקה>   # יוצר את משתמש הניהול הראשון

uvicorn app.main:app --reload --port 8000
```

בדיקה: http://localhost:8000/health אמור להחזיר `{"status":"ok"}`, ו-http://localhost:8000/docs מציג Swagger.

### 0.4 Frontend לוקאלי

```bash
cd frontend
npm install
npm run dev
```

נפתח ב-http://localhost:5173 (ה-Vite dev server כבר מוגדר עם proxy מ-`/api` ל-`localhost:8000`, כך ש-frontend ו-backend מדברים זה עם זה בלי צורך ב-CORS מיוחד בסביבת הפיתוח).

### 0.5 הרצת ה-job היומי ידנית (לבדיקה)

```bash
cd backend
python -m jobs.daily_snapshot
```

זה בונה/מרענן את `daily_snapshots` על סמך הנתונים שכבר קיימים ב-DB. בלי זה, הרשימות הציבוריות (`GET /lists/...`) יחזירו רשימה ריקה גם אם יש בקשות גולמיות — זה מכוון (הציבור קורא רק מה-snapshot).

---

## שלב 1: GitHub ✅ בוצע

Repo: https://github.com/yotamfel/bakbookim (branch `main`, פוש ראשוני בוצע).

---

## שלב 2: Railway (Backend) — בוצע ברובו אוטומטית, נשארו 2-3 קליקים

הפרויקט `bakbookim-backend` נוצר ב-Railway עם 2 services, ה-backend **חי ורץ עכשיו**:
`https://backend-production-c02f.up.railway.app` (בדוק/י: `/health`, `/docs`).

משתני הסביבה (DATABASE_URL/ANTHROPIC_API_KEY/OPENAI_API_KEY/JWT_SECRET/IP_HASH_SALT/CORS_ORIGINS)
כבר הוגדרו בשני ה-services דרך ה-CLI. שני ה-services מחוברים ל-GitHub repo (`main` branch) להמשך.

**מה נשאר לעשות ידנית (ה-CLI של Railway לא חושף את זה עדיין):**

1. Root Directory: בדשבורד של Railway, לכל אחד משני ה-services (`backend` וגם `daily-snapshot-job`) →
   Settings → Source → **Root Directory** → להקליד `backend`. בלי זה, ה-deploy הבא שיופעל
   מ-push ל-GitHub (במקום מה-upload הידני שביצענו) עלול להיכשל כי יש גם `frontend/` באותו repo.
2. עבור ה-service **`daily-snapshot-job`** בלבד:
   - Settings → Deploy → **Cron Schedule** → `0 3 * * *` (כל יום 3 לפנות בוקר, אפשר לשנות)
   - **חשוב:** בגלל ששני ה-services חולקים את אותה תיקיית root (`backend`), Railway מאפס את
     ה-Custom Start Command שנקבע ידנית בדשבורד בכל דיפלוי חדש, בהתאם ל-`railway.json` שבקוד
     (שמוגדר ל-web server, לא ל-job). הפתרון: יש קובץ נפרד `backend/railway.cron.json` בקוד -
     צריך להצביע את ה-service הזה עליו: Settings → (חפש "Config-as-code Path" / "Config File",
     יכול להיות תחת Build או Source) → להקליד `/backend/railway.cron.json`. אחרי זה Redeploy.
3. ה-admin user כבר נוצר מול אותו DB (`admin` / הסיסמה שנקבעה קודם) — לא צריך לחזור על זה.

לבדיקה שה-cron מוגדר נכון: Railway → `daily-snapshot-job` → Deployments, לוודא שריצה ידנית
("Redeploy") מסתיימת ב-SUCCESS ומדפיסה `Daily snapshot job completed.` בלוגים.

---

## שלב 3: Vercel (Frontend)

1. https://vercel.com → Add New Project → יבוא מ-GitHub → `bakbookim`.
2. **Root Directory** = `frontend`.
3. Framework Preset: Vite.
4. Environment Variable: `VITE_API_URL` = כתובת ה-Railway backend (למשל `https://bakbookim-backend.up.railway.app`).
5. Deploy. Vercel ייתן preview URL אוטומטי לכל PR (כמו שמתואר ב-SPEC.md סעיף 14) — נוח לשתף עם מנהל bakbookim לפני מיזוג ל-main.
6. לחזור לשלב 2 ולעדכן את `CORS_ORIGINS` ב-Railway לכתובת ה-production של Vercel.

---

## הערות

- קטגוריות המוצרים (`backend/app/constants.py` + `frontend/src/lib/constants.js`) הן רשימת התחלה — כדאי לוודא מול מנהל bakbookim שהיא תואמת את הקטגוריות בפועל, ולעדכן בשני המקומות אם צריך.
- אין CAPTCHA ב-MVP (per SPEC.md סעיף 11) — רק rate limiting לפי IP hash.
