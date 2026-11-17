# MEDVOCAB

Private YÖKDİL Sağlık vocabulary study app.

## Product decisions
- Daily target: 20 new words
- Review-first queue: due reviews before new words
- Flashcards reveal meaning on tap; examples always visible after reveal
- Mixed English → Turkish and Turkish → English direction
- Streak, weekly summary, wrong-answer list, and exam area
- Vocabulary source: *YÖKDİL Sağlık Alanı Özel Kelime Listesi* (29-page PDF)

## Run locally
```bash
npm install
npm run dev
```

## Vocabulary data
The source PDF contains numbered entries 1–725. The app intentionally starts with an empty dataset rather than invented words. Each record in `public/data/words.json` must preserve its source English expression and Turkish meaning. Multiple expressions on one source row remain one record. Example sentences and Turkish translations are authored separately and must not replace source meanings.

## Progress storage
The first version stores individual study progress in the browser's localStorage. Supabase credentials and authentication are not embedded in the repository; cloud sync can be added after the study flow is validated.
