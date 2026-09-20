<p align="center">
  <img src="assets/banner.svg" alt="PostGate" width="720">
</p>

<p align="center">
  <b>English</b> · <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <b>A queue, a human approval gate, and scheduled publishing for social media.</b><br>
  An agent proposes. A person approves from their phone. The post goes out on time.
</p>

<p align="center">
  <img alt="MIT" src="https://img.shields.io/badge/license-MIT-4ADE80">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6">
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A520-5FA04E">
  <img alt="LLM" src="https://img.shields.io/badge/LLM-none%20required-8FA3BF">
</p>

---

## The problem

Automating social media is easy right up until the day the automation posts
something wrong. Then you learn three things at once: nobody reviewed it, the
mistake is public, and there is no undo button that erases the screenshot
somebody already took.

The usual reaction is to switch the automation off and go back to posting by
hand. PostGate is the other answer: **keep the automation, put a human at the
gate.**

## How it works

```
   your source        queue           Telegram          decision          cron
  ─────────────▶  ───────────▶  ────────────────▶  ─────────────▶  ──────────────▶
   buildDrafts      pending        card with two       scheduled        publishes at
                                   buttons             + a time         the set time
```

Five pieces, each able to fail on its own without taking the others down:

| piece | what it does |
|---|---|
| **source** | decides **what** to post. The only part you write. |
| **queue** | holds the draft and its state. Plain Postgres. |
| **gate** | sends it to Telegram and waits for a person to decide. |
| **publisher** | a cron that posts what was approved and is now due. |
| **health** | tells you when the queue stops moving. |

## Which LLM does it work with?

**All of them — because it uses none.**

PostGate never talks to a language model. It takes finished drafts from a
source you implement:

```ts
interface ContentSource {
  readonly name: string;
  buildDrafts(count: number): Promise<Draft[]>;
}
```

If your source is a `SELECT` and a string template, great — that is exactly how
the original system works, with no LLM at all, publishing since 2026.

If you do want a model writing the caption, use `src/sources/llm-caption.ts`.
It takes **a function**, not an SDK:

```ts
const source = new LlmCaption({
  itens: async () => myDatabase.findNews(),
  completar: async (prompt) => callYourModel(prompt),   // Ollama, Claude, GPT, Gemini…
});
```

Anything that answers `prompt → text` works, including a fixed function in a
test. **There is deliberately no vendor SDK in this project**: a queue library
that ships an SDK is how you inherit a provider you never chose.

## Five minutes to running

```bash
npm install
cp .env.example .env
psql "$DATABASE_URL" -f migrations/0001_postgate_queue.sql

echo '[{"ref":"1","link":"https://example.com","image":"https://picsum.photos/1080","text":"First post."}]' > content.json

npm run enqueue                  # propose, and send the card to Telegram
npm run approve-polling          # approve from your phone
npm run publish-due -- --dry-run # check everything without publishing
```

`--dry-run` is the step that spares you the first disappointment: it confirms
that **Meta can download your media**, that the caption fits the limit, and
that the credentials exist — before anything goes live.

## Two approval modes

| mode | requires | when |
|---|---|---|
| **polling** — `npm run approve-polling` | nothing | home machine, CGNAT, no domain |
| **webhook** — `handleUpdate()` in your route | public HTTPS | already hosted |

Telegram's webhook needs a public address with a certificate. Anyone behind
CGNAT does not have one — and that is precisely what kept the original system
tied to a hosting provider for months. Polling removes the constraint: a few
extra seconds to approve a post costs nothing.

## Design decisions, and the incident behind each

This project was extracted from a system in production. The three decisions
below are not style preferences — each one is the scar of a real problem.

**1. Approving schedules; it does not publish.**
Publishing the instant someone approves ties the post's timing to the moment
someone happened to look at their phone. Kept separate, you can approve at 11pm
something that goes out at 9am — and the server may be off in between.

**2. Publishing and recording are separate steps.**
When both lived in one `try`, a successful publish with a failed database write
fell into the `catch` and was marked `failed` — **with the media already
live**. Today, if the write fails after publishing, the system shouts instead
of lying: it reports that the post exists, hands you the `media_id`, and asks
for a manual fix. It never marks as failed something that went out.

**3. The gate is for approval, not quality control.**
Filtering out what is not good enough is the source's job. If the approver
becomes the quality filter, they learn to hit "reject" on autopilot and stop
reading — and then the gate is worth nothing.

## What you need

- **Postgres.** Supabase works; nothing in the schema is specific to it.
- **A Telegram bot** and the group where it posts the cards.
- **An Instagram Business or Creator account and your own Meta app.** See
  [docs/meta-setup.md](docs/meta-setup.md). On why the gate works the way it
  does, see [docs/approval.md](docs/approval.md) — this cannot be packaged, the token
  is yours.

## Traps that already cost someone dearly

- **Media is downloaded by Meta's servers, not yours.** A URL that opens in
  your browser but needs a session, or only answers on your network, fails with
  a generic error. `--dry-run` checks this first.
- **"Cannot parse access token" is almost never the token.** Meta has two paths
  with different hosts: `graph.instagram.com` (Instagram Login, the default
  here) and `graph.facebook.com` (Facebook Login + Page). A token for one is
  rejected by the other, and the error is identical to an expired token. Set
  `META_GRAPH_HOST` instead of minting a new token.
- **The 60-day token expires.** `refreshToken()` exists; run it on a monthly
  cron. Forgetting means finding out on a Sunday that nothing has posted in
  weeks.
- **Stories take no caption.** The text has to live in the 1080×1920 artwork.
- **25 posts per 24h** is the account limit. The queue respects your cadence,
  not the limit: enqueue 40 and the last ones fail.

## Status

Extracted and reorganised from a system in production. Verified so far: clean
typecheck, passing tests, the queue exercised against a real Postgres (enqueue,
deduplicate, decide, come due, decision idempotency), and the Instagram client
reaching a real account with its credential accepted (read-only call, nothing
published).

Not verified yet: a real end-to-end publish from this reorganised code.

## A note on the code comments

The comments in this codebase are in Portuguese. They are not decoration — they
carry the reasoning and the incidents behind each decision, which is most of
what this project is worth. Translating them is
[issue #1](../../issues/1); until then, `README.pt-BR.md` and the docs carry
the same reasoning in prose.

## License

MIT — see [LICENSE](LICENSE).
