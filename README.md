# bakbookim — פלטפורמת בקשות קהילתית

פלטפורמה שמרכזת בקשות קהילה (החזרת מוצרים ישנים / הצעת מוצרים חדשים) עבור [bakbookim.com](https://bakbookim.com), מקבצת בקשות דומות אוטומטית (Claude לנרמול + OpenAI embeddings), ומציגה רשימות ציבוריות מתעדכנות.

- מפרט מלא: [`SPEC.md`](./SPEC.md)
- הקמה/פריסה: [`SETUP_GUIDE.md`](./SETUP_GUIDE.md)

## מבנה

- `backend/` — FastAPI + SQLAlchemy + Neon (Postgres/pgvector)
- `frontend/` — Vite + React + Tailwind (RTL)

## התחלה מהירה (לוקאלית)

ראה `SETUP_GUIDE.md` שלב 0.
