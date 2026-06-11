# Founder TL;DR

This is the plain-English story of what's happening with the product — written for
you, not for engineers. No jargon. Each update explains what changed, why it matters
for the business, what you'd actually notice if you opened the app today, and what's
coming next. Newest updates are at the top.

(For the rules that govern how these entries are written, see the
"FOUNDER-TLDR.md — writing rules" section in CLAUDE.md.)

---

## 2026-06-11 — The app now looks like your original product

**What changed.** We polished the visual design so it matches the app you already built at anikawilliams.com/relocation-app/. Three specific things changed: (1) the website's generic navigation bar ("Relocation Guide / Corridors") no longer appears — the app has its own header that says "Relocation Flowchart" with a subtitle, exactly like the original. (2) The progress bar (the row of little lines showing which step you're on) now sits above the white card, not inside it. (3) The "Continue" button is now full-width at the bottom of the card, matching the original. Step 1 also now shows the corridor as a pre-selected card ("United States → Switzerland") so users instantly know they're in the right place.

**Why it matters.** The visual experience is now consistent with the product you've already tested and validated with real users. Someone familiar with the original app would feel at home immediately.

**What you'd notice today.** Open `http://localhost:4321/us/ch/` — no site navigation bar, "Relocation Flowchart" header, progress bar above the card, and a wide blue Continue button. Still local only.

**What's next.** Your approval to publish, then Cloudflare Pages to put it on a live web address.

---

## 2026-06-11 — The guide is now a fully interactive app, not a static page

**What changed.** The USA → Switzerland guide has been completely redesigned. When you open it, instead of a wall of text, you're greeted by a short 3-step questionnaire (like checking in for a flight): it asks whether you have a job offer, who's coming with you, and how long you plan to stay. Once you answer, it generates your personalised relocation flowchart. Every step on the flowchart is clickable — tap any box and a panel slides open on the right with everything you need: what documents to gather, the exact steps to follow, how long it takes, what it costs, and a direct link to the official Swiss government source. This matches the experience at anikawilliams.com/relocation-app/, which is the product you built and validated.

**Why it matters.** A static document is something people skim and close. An interactive tool is something people return to, share with their partner, and use throughout a move — which is how you build a loyal audience and a product worth paying for.

**What you'd notice today.** Open `http://localhost:4321/us/ch/` and you'll see the 3-step questionnaire immediately. Fill it in, hit "Generate my relocation plan →", and the flowchart appears. Click any task to see the full detail panel on the right. Nothing is publicly live yet.

**What's next.** Your approval, then connecting the "printing press" (Cloudflare Pages) to put it live on a real web address.

---

## 2026-06-11 — You can now preview the guide on your own computer

**What changed.** We set up a local preview — think of it like opening the finished book on your desk before sending it to the printer. The full USA → Switzerland guide is now viewable at `http://localhost:4321/us/ch/` on your machine. All six steps appear (work permit, type D visa, commune registration, residence permit card, health insurance, social security), the interactive flowchart loads, and the provenance section lists all 22 verified official sources at the bottom. Tasks where no single official figure exists (e.g. cantonal permit fees) correctly show no cost or timeline row rather than a made-up number.

**Why it matters.** You can read the guide exactly as a user would before deciding whether to publish it.

**What you'd notice today.** Opening `http://localhost:4321/us/ch/` in your browser shows the live guide. Nothing is publicly accessible — this only works on your own computer while the preview server is running.

**What's next.** Once you're happy with what you see, say the word and we'll commit the approval and set up Cloudflare Pages so it goes live.

---

## 2026-06-11 — You approved the guide; now we need to connect the "printing press"

**What changed.** You flipped the switch to publish the USA → Switzerland guide. That's the founder approval our safety rules require — no guide goes live without it. We also discovered that the "printing press" (the service that takes our files and puts them on the internet, called Cloudflare Pages) hasn't been connected to the project yet. Right now the guide builds and passes every check, but it isn't being delivered to an actual web address anyone can visit.

**Why it matters.** Publishing is a two-part job: (1) saying "this is approved" (done — you did that), and (2) having a delivery service pointed at the right place (not yet set up). We have part 1 but not part 2.

**What you'd notice today.** No live link yet. The guide exists and is approved, but there's no web address to share.

**What's next.** Connect the GitHub repo to Cloudflare Pages (a one-time, ~5-minute step in their dashboard) and the guide will appear at a live web address automatically.

---

## 2026-06-11 — USA → Switzerland guide is clean and ready for your approval

**What changed.** The guide had 5 facts that our checker correctly refused to confirm — things like "how long does the permit card take?" — because Switzerland doesn't publish a single answer: each region sets its own timing and fees. Rather than publishing a misleading number or a fudged "it varies", we simply leave those fields blank on tasks where no official figure exists. Think of it like a restaurant menu that shows "market price" instead of guessing a number that might be wrong. This required a small update to our publishing rules (so the site doesn't treat a blank field as a mistake) and the guide now has 22 facts, all 22 confirmed against official Swiss government sources.

**Why it matters.** The guide can now be published. Every visible fact has an official link behind it. Nothing is made up.

**What you'd notice today.** Still nothing live — the guide is held as a draft, waiting for you to say go. Some tasks (work permit, commune registration, permit card, social security) won't show a timeline or cost row because no one can honestly quote a single number.

**What's next.** Your approval: once you say go, we flip one switch and the guide goes live.

---

## 2026-06-09 — First full country guide drafted & fact-checked: USA → Switzerland

**What changed.** We wrote the first real country guide — moving from the USA to
Switzerland — and put it through our two-person check: one researcher writes each
fact with an official Swiss government link, then a *separate* checker re-opens every
link to confirm it word-for-word. Of 27 facts, **22 are now confirmed** against
official sources (e.g. register in your town within 14 days, health insurance within
3 months, the 8.7% social-security split). The other 5 are things that genuinely
differ by region — local fees and processing times — so instead of guessing a number
we point people to the exact office to ask.

**Why it matters.** This proves our "nothing unverified goes live" promise on a real
guide, and gives us our first genuinely trustworthy content.

**What you'd notice today.** Nothing live yet — the guide is deliberately held back
(not published) pending your approval.

**What's next.** One small decision from you on how to show the 5 "varies locally"
items, then we can publish this guide.

---

## 2026-06-09 — The foundation is built, and the "kitchen" has safety rules

**What changed.** We built the skeleton of the website — think of it as constructing
the building and the kitchen before we cook any meals. We also installed a strict
"health inspector" rule: the site simply won't go live with any fact (a visa fee, a
deadline) unless that fact has been checked against an official government source and
is still up to date. We added an automatic to-do tracker (ROADMAP) and this very
changelog so progress is always visible.

**Why it matters.** Our whole business rests on being trustworthy. This makes it
*impossible* to accidentally publish an unverified or expired fact — the website
refuses to build, like an oven that won't turn on if the ingredients are out of date.

**What you'd notice today.** Nothing visible yet — this is plumbing. There are no
country guides to read yet; we built the machine that will safely serve them.

**What's next.** Write and verify the first real guide (India → Germany).
