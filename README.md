# Above the Treeline: Paul Draper on leadership, coaching & life

A Colorado-themed site for written, audio and video posts on **Leadership in Business**, **Coaching Children** and **Life & Relationships**, plus Paul's own story, with comments.
Static site on GitHub Pages; Firebase (Firestore) ready for live comments.

**Live:** https://cloudetteai.github.io/Leadership-Philosophy/

## What it does
- **Home:** ambient waterfall video in the hero (muted, looping; still poster on phones and for reduced-motion; pause button), a **Leader of the Moment** card, and rotating, source-linked leadership and coaching quotes (fade, pauses on hover/focus, tap to pause, prev/next buttons, respects reduced motion).
- **Library:** written and audio posts, filter by All / Leadership in Business / Coaching Children / Life & Relationships, **newest always on top** (sorted by `date`), and a **New** badge for 14 days.
- **My Story:** Paul's story as dated chapters, newest first or "Read from the beginning", with comments on each chapter.
- **Comments** on every post and chapter, newest on top. Demo mode (this browser only) until Firebase is connected.
- Light and dark mode follow your device. Mobile first.

## How to add a post
1. **Write it.** Add a file in `content/posts/`, for example `content/posts/my-new-post.md`.
   Use `## Headings`, `- bullets`, `1. numbered`, `**bold**`, `*italic*` and `> callouts`. (HTML is shown as plain text on purpose.)
2. **Audio (optional).** Drop the file in `content/audio/` (`.mp3`, `.m4a`, `.ogg`). Use lowercase-and-dashes names, e.g. `my-new-post.mp3`.
   Tip: strip hidden metadata first: `ffmpeg -i in.mp3 -map_metadata -1 -c copy out.mp3`.
3. **Add an entry** at the top of `content/posts.json`:
   ```json
   {
     "id": "my-new-post",
     "title": "My New Post",
     "category": "kids",
     "type": "audio",
     "date": "2026-11-02",
     "summary": "One or two sentences for the card.",
     "audio": "content/audio/my-new-post.mp3",
     "duration": "6:30",
     "body": "content/posts/my-new-post.md"
   }
   ```
   - `category`: `business`, `kids` or `life`. `type`: `written`, `audio` or `video`.
   - For video: put an MP4 in `content/video/` and add `"video": "content/video/x.mp4", "poster": "content/video/x.jpg"`. Strip metadata first (phone videos carry GPS): `ffmpeg -i in.mov -map_metadata -1 -c:v libx264 -crf 26 -movflags +faststart out.mp4`, then check with `exiftool out.mp4`.
   - `id` and file names: lowercase letters, numbers and dashes only. Anything else is skipped on purpose.
4. **Commit and push.** GitHub Pages republishes in about a minute, and the newest `date` floats to the top on its own.

The four **Sample** posts are placeholders. Delete them (entries + files) when you add your own.

## How to add a story chapter
1. Write `content/story/my-chapter.md` (same formatting as posts).
2. Add an entry to `content/story.json` (any position; it sorts by date):
   ```json
   { "id": "my-chapter", "title": "The Road In", "date": "2026-11-05",
     "summary": "One line for the list.", "body": "content/story/my-chapter.md" }
   ```
3. Commit and push. Chapter numbers come from date order. Delete the sample chapter when the first real one is in.

## How to change the Leader of the Moment
Edit `content/leader.json`:
1. Move the current `current` object to the top of `archive` (it shows under "Past leaders").
2. Put the new leader in `current`: `name`, `monogram` (initials; no photos of real people), `who`, `featured` date, 1–3 `quotes` each with `text`, `source` and an `https` `url` to a reliable source, and `take` (Paul's own words). Remove `"sample": true`.
3. Only use quotes you can link to a trustworthy source. Quotes without an https source link are skipped.

## Future: admin-only editor (not built)
Later, Paul could sign in with Firebase Auth (an account with the `admin: true` claim) and write chapters or swap the leader in a small editor page, saved to Firestore with rules that only admins can write. Until then, edits go through files in this repo, which keeps the attack surface tiny.

## Comments and moderation (the tradeoff)
Each comment stores `{ name, text, status, createdAt }` under `posts/{postId}/comments` (library) or `stories/{chapterId}/comments` (My Story). The rules allow only those two.
- `status: "approved"` (current default): comments show up instantly. Great for conversation, but spam or a rude comment is visible until an admin hides it.
- `status: "pending"`: nothing shows until an admin approves it. Safer for a public brand, but slower and someone has to review.

To switch on moderation, change `newCommentStatus()` in `firestore.rules` to `'pending'` **and** `LP_COMMENT_STATUS` in `firebase-config.js` to `"pending"`, then deploy rules. Only accounts with the `admin: true` custom claim (set with the Admin SDK from a trusted machine) can approve, hide or delete.

## Security choices
- Comments are rendered as **plain text** (`textContent`), never HTML, so a comment like `<script>` is shown, not run. Markdown posts are converted with a small built-in renderer that never passes HTML through.
- **Firestore rules** (`firestore.rules`): public can read only approved comments; creates must have exactly the allowed keys (`hasOnly`), name 1–40 chars, text 1–1000 chars, the server's own timestamp, and the configured status. No updates or deletes except admin. Everything else is denied.
- **Client-side rate limit** (one comment per 30s, 5 per 10 min) and a hidden honeypot field. This is a speed bump, not a wall; real abuse protection comes from rules, moderation, and later App Check.
- **Content Security Policy** in `index.html`: scripts only from this site and Google's Firebase SDK host; no inline scripts or handlers, no third-party trackers or fonts.
- Firebase web config is not a secret, but **never commit** service-account keys, `.env` files or admin tokens (`.gitignore` blocks the common ones; GitHub push protection is on).

## Rules tests
```bash
cd tests && npm install && npm test   # needs Java 11+ for the Firestore emulator
```

## Going live with Firebase
1. Create a Firebase project (Spark plan), add a Web app, and paste its config into `firebase-config.js`.
2. Enable Firestore, then `firebase deploy --only firestore:rules,firestore:indexes`.
3. Set the `admin` custom claim on your own account to moderate.

Quotes belong to their authors; each links to its source.
