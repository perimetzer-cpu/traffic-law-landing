# אתר משרד עורך הדין פרי מצר סולומון

אתר תדמית ויצירת קשר בתחום דיני התעבורה ורישוי הנהיגה.

- אתר חי: [www.pms.co.il](https://www.pms.co.il)
- כתובת Vercel: [traffic-law-landing.vercel.app](https://traffic-law-landing.vercel.app)
- סביבת פרסום: Vercel
- ענף פרסום: `main`

## מבנה הפרויקט

```text
.
├── assets/
│   └── images/
│       ├── approved-hero-reference.webp
│       └── peri-metzer-solomon-warm.webp
├── CLAUDE.md
├── README.md
├── index.html
└── vercel.json
```

האתר סטטי ואינו דורש התקנת חבילות. העיצוב, ה-CSS וה-JavaScript נמצאים כרגע בתוך `index.html`. התמונות נשמרות במאגר ואינן נטענות מאתר חיצוני.

## הפעלה מקומית

מתוך תיקיית הפרויקט:

```bash
python3 -m http.server 4173
```

לאחר מכן פותחים בדפדפן:

```text
http://localhost:4173
```

## עבודה עם Claude Code

בפעם הראשונה:

```bash
git clone https://github.com/perimetzer-cpu/traffic-law-landing.git
cd traffic-law-landing
claude
```

בפעמים הבאות:

```bash
cd traffic-law-landing
git pull origin main
claude
```

Claude Code יקרא את `CLAUDE.md` בתחילת העבודה. יש לבקש ממנו להציג תוכנית קצרה לפני שינוי משמעותי.

## פרסום

כל שינוי שמגיע ל-`main` מפעיל פרסום אוטומטי ב-Vercel. לפני העלאה יש לבדוק דסקטופ, מובייל, טופס WhatsApp וכל קישורי הטלפון והדוא"ל.

```bash
git add .
git commit -m "Describe the website update"
git push origin main
```

## פרטי קשר באתר

- טלפון: `052-882-2044`
- WhatsApp: `972528822044`
- דוא"ל: `peri@bettylaw.co.il`

אין לשנות פרטים אלה ללא אישור מפורש מבעל האתר.
