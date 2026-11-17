# MEDVOCAB

Private YÖKDİL Sağlık vocabulary study app.

## Product decisions
- Daily target: 20 new words
- Review-first queue: all due reviews appear before new words
- Flashcards reveal meanings on tap and show an English example with Turkish translation
- Mixed English → Turkish and Turkish → English card direction
- Streak, weekly summary, wrong-answer list, and exam area
- Exam modes: vocabulary, contextual fill-in-the-blank, health-text practice, and mixed mini exam
- Vocabulary source: *YÖKDİL Sağlık Alanı Özel Kelime Listesi* (29-page PDF)

## Run locally
```bash
npm install
npm run dev
```

## Vocabulary data
`public/data/words.json` contains all 725 numbered records from the source PDF. The original English expressions and Turkish meanings are retained as source entries; expressions grouped on one PDF row remain one card. Each record also has a separate English example sentence and Turkish translation. Historical or outdated expressions in the source are retained for source fidelity and marked with current respectful terminology in the translation/example fields where relevant.

A GitHub Actions workflow validates the 725 records and runs the production build on pushes to `main`.

## Progress storage
The current version stores per-word progress in browser localStorage. No Supabase credentials or authentication secrets are embedded in the repository. Cloud sync and multi-device progress are not yet configured.
