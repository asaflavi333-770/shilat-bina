# הוראות עדכון — ייבוא לקוחות/פריטים + קריאת שירות

## שלב 1 — העלה קובץ additions.js לגיטהאב
1. פתח: https://github.com/asaflavi333-770/shilat-bina/tree/main/shilat-netlify-final
2. לחץ "Add file" ← "Upload files"
3. גרור את קובץ `additions.js`
4. לחץ "Commit changes"

## שלב 2 — הוסף שורה אחת לindex.html
1. פתח: https://github.com/asaflavi333-770/shilat-bina/blob/main/shilat-netlify-final/index.html
2. לחץ עיפרון ✏️
3. חפש (Ctrl+F): `</body>`
4. לפני `</body>` הוסף:
```html
<script src="additions.js"></script>
```
5. Commit

## זהו! Netlify יעדכן אוטומטית תוך 30 שניות

## מה נוסף:
- ☁️ **ייבא פריטי קטלוג מבינה** — בדף בינה, ייבוא כל הפריטים (docType 34)
- 🔍 **חיפוש לקוחות משופר** — תוצאות מדויקות יותר מבינה
- 🔧 **קריאת שירות** — כפתור בדף לקוח → פותח משימה + שולח לבינה
