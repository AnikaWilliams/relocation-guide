# Founder TL;DR

This is the plain-English story of what's happening with the product — written for
you, not for engineers. No jargon. Each update explains what changed, why it matters
for the business, what you'd actually notice if you opened the app today, and what's
coming next. Newest updates are at the top.

(For the rules that govern how these entries are written, see the
"FOUNDER-TLDR.md — writing rules" section in CLAUDE.md.)

---

## 2026-06-12 — The app now works properly for keyboard and screen-reader users, and the personalisation is locked by automated tests

**What changed.** The quality engineer (the last of the parallel helpers) finished its pass. Two deliverables. First, keyboard and screen-reader accessibility: the worst problem was that moving between questions silently "dropped" a keyboard user's place on the page — like a receptionist walking off mid-conversation — leaving them to hunt for where they were. Now focus lands on each new question's title, which also makes screen readers read it aloud. Selected answers, locked steps, finished steps, and the "this country isn't available yet" explanations are all now properly announced instead of being conveyed only by colour and icons. Second, a safety net: 16 new automated tests that check, for ten different user profiles (spouse of a citizen, unmarried partner, worker with children…), exactly which steps appear in their plan. If a future edit ever scrambles who sees what, the tests fail before anything reaches users.

**Why it matters.** Accessibility is both the right thing and a legal expectation in our markets — and the tests mean the personalisation we just verified can't silently break later.

**What you'd notice using the app today.** Try it with the Tab key only — you can complete the whole questionnaire without touching the mouse.

**What's next.** All four helper lanes plus QA are done; the batch is yours to review (family route approval, Impressum details, the Google-readability decision).

---

## 2026-06-12 — The family route is live: all 27 new facts passed the independent fact-check

**What changed.** The fact-checker finished re-examining every one of the 27 new family-route facts — opening each official Swiss source itself, character by character — and confirmed all 27, rejecting none. The crucial legal distinction survived checking: joining a Swiss citizen or permanent resident is a legal *right*; joining someone on an ordinary permit is at the authorities' *discretion*; joining an unmarried partner has *no general route at all* — only a case-by-case cantonal exception, and the guide says so plainly. With the check complete, the family route is switched on: someone who answers "joining family" now gets family steps (the work-permit steps disappear from their plan), and the old "your route isn't covered" warning is gone for them. We re-tested your exact original case — joining an unmarried partner — and the plan now opens on the honest answer instead of telling you to get a work permit. The guide now holds 49 verified facts across two routes.

**Why it matters.** This is the first time the questionnaire genuinely changes someone's plan — the personalisation promise, working, with every fact independently checked.

**What you'd notice using the app today.** Answer "joining family": family steps, correctly matched to your relationship and your partner's status.

**What's next.** Your review and approval of the family route (the human gate), then the study and "other" routes.

---

## 2026-06-12 — Fixed: on small phones, the page title no longer crashes into the "Start over" button

**What changed.** On narrow phone screens, the heading at the top of a plan ("United States → Switzerland" with the two little flags) was running into the "← Start over" button next to it — the words printed right over the button, and the Swiss flag got squeezed to nothing, like two people forced to share one bus seat. Now, when space runs short, each country name politely shortens itself with "…" (think "Unite… → Switz…"), the flags keep their full size, and the button always has clear space around it. We checked the fix in a real browser at phone width and took before/after pictures, and all 52 automated checks still pass.

**Why it matters.** Most visitors will find us on their phones. A page where text piles on top of a button looks broken and untrustworthy — a bad first impression for people making serious life decisions.

**What you'd notice using the app today.** On a phone (or a narrow browser window), the plan page header now looks tidy: shortened country names, full flags, button untouched.

**What's next.** Once the fact-checker confirms the 27 new family-route facts, that route switches on and we can re-check this page live end to end.

---

## 2026-06-12 — The family route is drafted: joining a spouse, partner or parent in Switzerland

**What changed.** The researcher helper finished drafting the second route through our USA→Switzerland guide: moving to join family. It found that Swiss law treats these cases very differently depending on who you're joining — joining a Swiss citizen is a legal *right*, joining a permanent resident is a right with conditions (like enrolling in a language course), but joining an ordinary permit holder is up to the authorities, and unmarried partners have *no* general right at all (we say that plainly and point people to the exact office to ask, rather than pretending there's a form to fill in). There's also a section for children, with the strict deadline for kids over 12. Every statement cites an official Swiss government source — the law itself, the federal portal, or the migration office.

**Why it matters.** Until now, someone moving for love saw a guide written for someone moving for a job. This was our biggest honesty gap.

**What you'd notice using the app today.** Nothing yet — every new fact is marked "unverified," and the gate keeps unverified facts off the live site until the independent fact-checker confirms each one.

**What's next.** The fact-checker re-verifies all 27 new facts; then the family route switches on.

---

## 2026-06-12 — Plans are now shareable by link, built the privacy-safe way

**What changed.** Two things. First, a finished plan can now be shared or bookmarked: the app writes your answers into the web address (the part after a `#` symbol), so anyone opening that link sees the exact same plan. We followed the compliance specialist's rules from today to the letter: that part of the address stays inside the visitor's browser and is never sent to our computers (so it can't end up in any logs), and anything someone typed freely — like an employer's name — is never put in the link at all. Second, we threw out the old flowchart diagram code. It was retired from the screen weeks ago but still sitting in the box; deleting it removed 20 third-party software packages we no longer have to maintain or worry about.

**Why it matters.** A shared link is free word-of-mouth — someone sending "here's your plan" to a friend is our cheapest way to get new visitors. And less leftover code means fewer things that can break or carry security holes.

**What you'd notice using the app today.** Finish the questionnaire, copy the address from the browser bar, open it in a private window: the same plan appears with the same steps, no questionnaire to redo.

**What's next.** A proper "Copy link" button with the warning the compliance specialist requires before sharing.

---

## 2026-06-12 — The search-engine check found a real problem: Google can't read our guide

**What changed.** The search specialist finished its audit of the new app-style guide page, and the headline finding is serious: all the carefully verified content — the six tasks, their steps, documents, and official sources — was invisible to search engines. It was packed inside the app's machinery (like shipping a book as a locked suitcase: the reader has to open it in person; a librarian cataloguing from the outside sees nothing). The specialist fixed what could be fixed safely: proper labels search engines understand (structured data describing the guide as a step-by-step procedure), and a full readable version of the guide that appears for anyone whose browser can't run the app. Build checks all pass; the app itself is unchanged.

**Why it matters.** This business plans to live on people finding guides through Google. A page Google can't read is a shop with the lights off.

**What you'd notice using the app today.** Nothing different — the fixes are for search engines and no-JavaScript visitors.

**What's next.** A structural decision for you: re-plumb the page so the full guide is always present underneath the app (the durable fix the specialist recommends); meanwhile the engineer and researcher helpers are still working.

---

## 2026-06-12 — The legal check came back: one important catch about share links

**What changed.** The first of our four parallel helpers finished: the compliance specialist. It drafted the "who runs this site" page that Swiss and German law require (called an Impressum — like the publisher's box in a newspaper), with blanks for you to fill in your name and address, clearly marked as a draft until a real lawyer reviews it. More importantly, it caught something before it became a problem: we're building a feature that lets people share their relocation plan as a link, and if built the obvious way, the link would quietly copy people's answers — which passports they hold, who their partner is — into our server records and analytics. Some of those answers are genuinely sensitive (a "registered partner" answer can reveal someone's sexual orientation). The specialist set binding rules: build the link so the answers never reach our servers, never include free-typed text, and warn people before they share.

**Why it matters.** Catching this *before* the feature ships is exactly why the compliance role exists — privacy mistakes are trust-killers and can carry fines.

**What you'd notice using the app today.** Nothing yet — the Impressum page needs your details, and the other three helpers are still working.

**What's next.** Review the remaining three helpers' work as it lands, applying these privacy rules.

---

## 2026-06-12 — Today's work is safely backed up, and four specialists are now working at once

**What changed.** Two things. First, everything built today — the new questionnaire, the guided checklist, the honesty notices — is committed and pushed to GitHub (our off-site safe: even if this computer died, nothing is lost, and every change is reviewable). Second, instead of doing tasks one after another, we put four specialist helpers to work *simultaneously*, like stations in a restaurant kitchen instead of one cook doing everything: (1) a researcher drafting the family-reunification route (joining a spouse or partner) with official Swiss sources; (2) an engineer making plans shareable by link and removing leftover old code; (3) a compliance specialist drafting the legally required "who runs this site" page (Impressum) and reviewing our wording; (4) a search specialist checking whether Google can actually read our new app-style pages.

**Why it matters.** Parallel work means the launch checklist shrinks four times faster — and every fact still goes through the independent fact-checker before it can publish.

**What you'd notice using the app today.** Nothing new yet — the four work streams haven't landed.

**What's next.** Review each helper's work as it comes back, fact-check the family route, then your approval.

---

## 2026-06-12 — The app no longer pretends: if we don't cover your route, it says so

**What changed.** You caught a real problem: you answered the questionnaire as someone joining an unmarried partner, and the app handed you a "get a work permit through your employer" plan labelled as *personalised*. The truth is our USA → Switzerland guide only covers the work route so far — the family route hasn't been researched and verified yet. Rather than quietly serving the wrong plan, the app is now honest about it in three places: a note appears the moment you pick a reason we don't cover yet ("we haven't verified the family route yet"); the plan's title changes from "Your personalised relocation plan" to "Work route guide — your route isn't covered yet"; and a clear notice on the plan says the steps describe the work route and should be treated as background reading, not your plan. Each guide now carries a label saying which routes it covers, so this works automatically for every future guide.

**Why it matters.** Telling a family-route user to get an employer-sponsored work permit isn't a small bug — it's the kind of confidently-wrong advice that destroys trust in one visit. Saying "we don't know yet" is our core promise.

**What you'd notice using the app today.** Pick "Joining family" and you'll see the warning immediately, and again on the plan. Pick "Work" and nothing changes.

**What's next.** Research and verify the family-reunification route so that warning can come down.

---

## 2026-06-12 — The plan can now skip steps that don't apply to you (and cantons are on the roadmap)

**What changed.** Two things. First, we built the machine (the working part behind the scenes) that lets a user's answers actually change their plan — like a travel agent who, hearing you have no children, quietly removes the "enrol the kids in school" page from your itinerary. When any step is skipped, a banner says exactly which ones and why, so nothing disappears silently. If a skipping rule is ever written incorrectly, the step is *shown anyway* — we'd rather show you an unnecessary step than hide a legally required one. Second, you asked about cantons (Switzerland's 26 regions, each with its own fees and offices): that's now formally on the roadmap — a canton picker in the questionnaire, then canton-specific details added region by region, starting with the big ones like Zürich and Geneva.

**Why it matters.** Personalised plans are the whole promise of the product. But which steps apply to whom is a *legal* question — so the rules themselves will be written and independently fact-checked through our usual two-person pipeline before any step is ever skipped.

**What you'd notice using the app today.** Nothing visible yet — no skipping rules have been written, so all six steps still show for everyone. This is plumbing.

**What's next.** Write and verify the first skipping rules for the USA → Switzerland guide.

---

## 2026-06-12 — Every question now fits on one screen, and there's a "Start over" button

**What changed.** Two usability fixes to the questionnaire. First: on smaller screens you previously had to scroll down to find the Continue button — the question was at the top, the button somewhere below the long country list. Now each question card works like a bank-app form: the question stays pinned at the top, the Continue button stays pinned at the bottom, and only the list of choices in the middle scrolls if it's too long. The country list was also made more compact (two columns) so it usually fits without any scrolling at all. Second: there's now a "Start over" button on every screen, so anyone can wipe their answers and begin again — with an "are you sure?" check first, so one stray tap can't erase someone's progress.

**Why it matters.** A form where the next-step button is hidden below the fold quietly loses people — they assume the page is broken and leave. And without a reset, anyone who answered wrongly (or hands the phone to a partner) was stuck with the old answers.

**What you'd notice using the app today.** On a phone-sized window, every question, its answers, and the Continue button are visible together — no hunting. A small "Start over" sits in the top-right corner.

**What's next.** Make your answers actually change which steps appear in the plan.

---

## 2026-06-12 — The app is now a guided checklist, not a diagram

**What changed.** We reshaped the whole experience around your direction. Instead of ending on a wall-chart diagram, the app now feels like a friendly form from start to finish: it asks a few more questions (where you're moving from and to — as two separate questions now — which passports you hold, and your reason for moving, with smart follow-ups), then walks you through your move one task at a time. Down the side is a "journey" panel — like a table of contents with checkmarks — showing what's done, what's next, and a tidy summary of your answers you can edit anytime. The diagram still exists, but only behind the scenes, deciding the right order of steps. Country choices show a flag; countries we haven't verified yet are greyed out so no one hits a dead end.

**Why it matters.** A checklist you tick through is something people actually use and come back to; a diagram is something they glance at once. It's also much lighter, so it loads faster — especially on phones.

**What you'd notice today.** Open `http://localhost:4321/us/ch/`: more questions up front, then a step-by-step plan with a progress sidebar. United States and Switzerland are the only selectable countries for now.

**What's next.** Make your answers actually change which steps appear (e.g. family vs work paths).

---

## 2026-06-12 — The app now works properly on phones

**What changed.** We fixed the five problems that were blocking your approval of the USA → Switzerland guide. The biggest one: on a phone, the app now shows a proper scrollable to-do list of relocation tasks instead of a miniaturised diagram that nobody could use. Tapping any task on the phone opens a full-screen card with all the details — what to do, what documents to gather, how long it takes — and a green "Mark as done" button so users can track their progress. Checked-off tasks survive a page refresh (we store them in the browser's memory) and the browser back button now moves backwards through the questionnaire steps the way you'd expect.

**Why it matters.** Roughly half your users will be on phones. The previous phone experience — a tiny squashed diagram — would have sent them straight to a competitor. The to-do list format is also something users can actually live with for weeks, tracking their move step by step, which is the kind of sticky product that earns word-of-mouth referrals.

**What you'd notice using the app today.** Open `http://localhost:4321/us/ch/` on your phone: you'll see the questionnaire, then a task list once you finish it. Tap any task to see full details and a "Mark as done" button. On a desktop, the flowchart diagram is unchanged. Also two problems that looked like they needed fixing turned out to already be solved — the browser tab icon and the diagram layout were both fine.

**What's next.** You can now review and approve the guide for publishing.

---

## 2026-06-12 — We found and documented 12 UX problems before you launch

**What changed.** We ran an independent quality check (like a mystery shopper, but for software) of the original app at anikawilliams.com/relocation-app/ using an automated browser that clicks through every screen and takes screenshots. We found 12 specific problems, ranked them by severity, and merged a fix plan into the project roadmap. The full report is at `audit/relocation-app-audit.md`.

**Why it matters.** The two most important findings: (1) on a phone, the interactive task list — the core reason someone would use this — is completely hidden behind another panel. Since roughly half the target audience is on mobile, this is a blocker for launch. (2) If a user accidentally refreshes the page or taps the phone's back button mid-questionnaire, all their answers are lost and they start over. Both are fixable before you approve the corridor.

**What you'd notice using the app today.** The questionnaire works fine on a desktop. On a phone, you can complete the questions but the flowchart screen is broken — buttons overlap the title and the task list is hidden. That will be fixed before you see it for approval.

**What's next.** Fix the 5 pre-launch blockers (mobile layout, state persistence, ReactFlow loading, favicon), then your approval to publish.

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
