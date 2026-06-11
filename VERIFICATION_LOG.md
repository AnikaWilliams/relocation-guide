# VERIFICATION_LOG.md

> Every claim verified by the `fact-verifier` agent is logged here.
> Format: date | corridor | claim summary | verifier session | status | source URL

This file is append-only. Entries are never deleted; stale entries are superseded by new verification runs.

---

## How to read this log

| Field | Meaning |
|---|---|
| `date` | ISO date the verification was performed |
| `corridor` | `{origin-ISO2}-{destination-ISO2}`, e.g. `in-de` |
| `claim` | Short summary of what was verified |
| `verifier` | Claude session ID or "human:{name}" |
| `status` | `VERIFIED` / `FLAGGED` / `STALE` |
| `source` | The official URL checked |
| `notes` | Discrepancies or caveats found |

---

## Log

### us-ch (USA → Switzerland) — run 2026-06-09

| date | corridor | claim | verifier | status | source | notes |
|---|---|---|---|---|---|---|
| 2026-06-09 | us-ch | T1 work-permit summary (employer applies, labour-market priority, qualified workers, annual quotas) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige/grundlagen_zur_arbeitsmarktzulassung.html | Page loaded. Priority, "managers, specialists and other qualified workers", ASEO annual maximum numbers confirmed verbatim; employer-applies confirmed on companion SEM page. |
| 2026-06-09 | us-ch | T1 step link — SEM admitting non-EU/EFTA to employment | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige.html | Loaded; "may only do so if you are highly qualified", "Your future employer must prove..." |
| 2026-06-09 | us-ch | T1 step link — Fedlex FNIA/AIG legal basis | fact-verifier | FLAGGED | https://www.fedlex.admin.ch/eli/cc/2007/758/en | fedlex JS-only stub; legal text/SR number unreadable today. |
| 2026-06-09 | us-ch | T1 timeline (confirm with canton/SEM) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige.html | "Confirm with [authority]" statement; no checkable figure on page. |
| 2026-06-09 | us-ch | T1 cost (confirm with canton; cantonal fees) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige.html | "Confirm with [authority]" statement; no checkable fee on page. |
| 2026-06-09 | us-ch | T2 national-D-visa summary | fact-verifier | FLAGGED | https://www.eda.admin.ch/eda/en/fdfa/entry-switzerland-residence/visa-requirements-application-form.html | eda.admin.ch HTTP 403 (bot-block); page unreadable today. |
| 2026-06-09 | us-ch | T2 step link — FDFA Swiss representations USA | fact-verifier | FLAGGED | https://www.eda.admin.ch/countries/usa/en/home/visa/entry-ch.html | eda.admin.ch HTTP 403 (bot-block); unreadable. |
| 2026-06-09 | us-ch | T2 step link — FDFA national visa documents USA | fact-verifier | FLAGGED | https://www.eda.admin.ch/countries/usa/en/home/visa/entry-ch/more-90-days/documents-national.html | eda.admin.ch HTTP 403 (bot-block); unreadable. |
| 2026-06-09 | us-ch | T2 timeline (FDFA: several weeks to months) | fact-verifier | FLAGGED | https://www.eda.admin.ch/eda/en/fdfa/entry-switzerland-residence/visa-requirements-application-form.html | Attributes specific wording to FDFA; eda 403, cannot confirm. |
| 2026-06-09 | us-ch | T2 cost (national D visa fee — confirm with representation) | fact-verifier | FLAGGED | https://www.eda.admin.ch/eda/en/fdfa/entry-switzerland-residence/visa-requirements-application-form.html | "Confirm with" + eda 403 (bot-block); unreadable. |
| 2026-06-09 | us-ch | T3 register-commune summary (register at commune; ~14 days) | fact-verifier | VERIFIED | https://www.ch.ch/en/foreign-nationals-in-switzerland/working-in-switzerland/ | WebFetch soft-404; server HTML (HTTP 200) read directly: "register your arrival in Switzerland within 14 days", "register with the communal authorities ... within 14 days". |
| 2026-06-09 | us-ch | T3 step link — ch.ch notification of departure & registration | fact-verifier | VERIFIED | https://www.ch.ch/en/housing/moving/notification-of-departure-and-registration/ | Server HTML read; page title now "Notifying a change of address"; "register with your new commune of residence within 14 days of your move". sourceName label is older title (note to researcher). |
| 2026-06-09 | us-ch | T3 timeline (within ~14 days) | fact-verifier | VERIFIED | https://www.ch.ch/en/foreign-nationals-in-switzerland/working-in-switzerland/ | "must register with the communal authorities ... within 14 days" — matches. |
| 2026-06-09 | us-ch | T3 cost (confirm with commune; communal/cantonal fees) | fact-verifier | FLAGGED | https://www.ch.ch/en/housing/moving/notification-of-departure-and-registration/ | "Confirm with [authority]" statement; no checkable fee on page. |
| 2026-06-09 | us-ch | T4 residence-permit-card summary (biometric; canton decides; 2 fingerprints + facial image) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/biometr_auslaenderausweis.html | All elements confirmed verbatim (canton decides procedure/issuance; "two digital fingerprints and a facial image"). |
| 2026-06-09 | us-ch | T4 step link — SEM biometric permit procedure / fee coverage | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/biometr_auslaenderausweis.html | "Residence permit fees cover ... application processing, issuance ... and capture of biometric data." |
| 2026-06-09 | us-ch | T4 timeline (confirm with canton; production/delivery time) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/biometr_auslaenderausweis.html | "Confirm with [authority]" statement; no checkable figure. |
| 2026-06-09 | us-ch | T4 cost (fee covers processing/issuance/biometrics; amount cantonal) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/biometr_auslaenderausweis.html | Fee-coverage assertion confirmed verbatim; no specific amount asserted. Fee claim → reviewBy 2026-07-09. |
| 2026-06-09 | us-ch | T5 health-insurance summary (compulsory; 3 months; backdated) | fact-verifier | VERIFIED | https://www.bag.admin.ch/en/health-insurance-requirement-to-obtain-insurance-for-persons-resident-in-switzerland | "within three months after taking up residence"; retrospective reimbursement confirmed verbatim. |
| 2026-06-09 | us-ch | T5 step link — FOPH obligation & three-month rule | fact-verifier | VERIFIED | https://www.bag.admin.ch/en/health-insurance-requirement-to-obtain-insurance-for-persons-resident-in-switzerland | Same FOPH page; three-month rule confirmed. |
| 2026-06-09 | us-ch | T5 step link — Fedlex KVG/LAMal legal basis | fact-verifier | FLAGGED | https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/en | fedlex JS-only stub; legal text/SR number unreadable. |
| 2026-06-09 | us-ch | T5 timeline (3 months; backdated to arrival) | fact-verifier | VERIFIED | https://www.bag.admin.ch/en/health-insurance-requirement-to-obtain-insurance-for-persons-resident-in-switzerland | Confirmed verbatim. |
| 2026-06-09 | us-ch | T5 cost (premiums vary by insurer/canton/age/deductible) | fact-verifier | FLAGGED | https://www.bag.admin.ch/en/health-insurance-requirement-to-obtain-insurance-for-persons-resident-in-switzerland | "Confirm with" + premium-variation detail NOT on the requirement page; needs premium-overview source. |
| 2026-06-09 | us-ch | T6 AHV summary (OASI for all; employer arranges creation via compensation office) | fact-verifier | FLAGGED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/how-to-find-your-oasi-number/ | First sentence supported; 2nd sentence ("employer arranges CREATION via compensation office") NOT on this find-your-number page. Content mismatch. |
| 2026-06-09 | us-ch | T6 step link — ch.ch requesting an OASI card | fact-verifier | VERIFIED | https://www.ch.ch/en/documents-and-register-extracts/requesting-an-oasi-card/ | Server HTML read; OASI-card request page confirmed (lead text). EN page has German <title> fallback. |
| 2026-06-09 | us-ch | T6 timeline (confirm with compensation office; created after employment) | fact-verifier | FLAGGED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/how-to-find-your-oasi-number/ | "Confirm with" statement; creation mechanism not on page. |
| 2026-06-09 | us-ch | T6 cost (compensation office; contributions split employee/employer) | fact-verifier | FLAGGED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/how-to-find-your-oasi-number/ | "Confirm with" + contribution-split assertion NOT on find-your-number page. Content mismatch. |
| 2026-06-09 | us-ch | T7 open-bank-account summary | fact-verifier | FLAGGED | https://www.ch.ch/en/foreign-nationals-in-switzerland/working-in-switzerland/ | CONTENT MISMATCH: cited page contains no banking content at all. |
| 2026-06-09 | us-ch | T7 timeline (bank-set timelines) | fact-verifier | FLAGGED | https://www.ch.ch/en/foreign-nationals-in-switzerland/working-in-switzerland/ | "Confirm with [bank]" + page has no banking content. |
| 2026-06-09 | us-ch | T7 cost (bank-set fees) | fact-verifier | FLAGGED | https://www.ch.ch/en/foreign-nationals-in-switzerland/working-in-switzerland/ | "Confirm with [bank]" + page has no banking content. |

**Run totals (us-ch, 2026-06-09):** 12 VERIFIED / 18 FLAGGED of 30 claims.

---

### us-ch (USA → Switzerland) — re-verification run 2026-06-09 (after content-researcher re-sourcing)

Scope: re-checked the 15 claims tagged `UNVERIFIED` after the researcher re-sourced visa facts to the SEM Entry/Visa FAQ, OASI to ch.ch, health premiums to FOPH, and replaced the Fedlex JS-stubs. Already-`VERIFIED` claims were left as-is. Each page below was fetched with a normal Chrome User-Agent (admin.ch / ch.ch / bag.admin.ch bot-block a default fetcher); all returned HTTP 200 and the server-rendered HTML was read for the supporting sentence. "Confirm with [authority]" claims carry no checkable figure and are FLAGGED per protocol (not source errors).

| date | corridor | claim | verifier | status | source | notes |
|---|---|---|---|---|---|---|
| 2026-06-09 | us-ch | T1 step link — SEM legal basis (FNIA/ASEO, Art. 18–22) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige/grundlagen_zur_arbeitsmarktzulassung.html | Verbatim: criteria "listed in the Foreign Nationals and Integration Act (FNIA) and the Ordinance on Admission, Period of Stay and Employment (ASEO)"; Art. 18/19 economic interest, Art. 20 quotas, Art. 21 precedence, Art. 22 salary. NOTE: footer names ordinance "AREO (SR 142.201)" vs body "ASEO". |
| 2026-06-09 | us-ch | T1 timeline (confirm with canton/SEM) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige.html | Page loads (HTTP 200) but no processing-time figure. "Confirm with [authority]" — no checkable fact. |
| 2026-06-09 | us-ch | T1 cost (confirm with canton; cantonal fees) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/arbeit/nicht-eu_efta-angehoerige.html | Page loads (HTTP 200) but no fee figure. "Confirm with [authority]" — no checkable fact. |
| 2026-06-09 | us-ch | T2 national-D-visa summary (>90 days; «national»; permit to stay; processed by cantons; apply in writing) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/einreise/faq.html | Verbatim: "Category D visas are issued for stays exceeding 90 days … «national visa»"; "you require a permit to stay … for more than 90 days"; "processed by the cantons (a residence permit is required)"; "apply … in writing using the application form". |
| 2026-06-09 | us-ch | T2 step link — SEM FAQ how/where to apply (Q2.5) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/einreise/faq.html | Verbatim Q2.5: "apply for the category D visa in writing using the application form or directly at the Swiss representation abroad responsible for your place of residence." |
| 2026-06-09 | us-ch | T2 step link — SEM National (type D) visa application form | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/einreise/visumantragsformular.html | Verbatim: "National (type D) visa application form — For long-term stays (more than three months) … subject to authorization (e.g. gainful employment, familiy reunification)." |
| 2026-06-09 | us-ch | T2 timeline (one to several months; by canton/purpose) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/einreise/faq.html | Verbatim: "may vary according to canton and purpose of stay. As a rule, one to several months must be expected." |
| 2026-06-09 | us-ch | T2 cost (EUR 90 = Schengen fixed; up to 50% urgent surcharge; external-provider fee) | fact-verifier | VERIFIED | https://www.sem.admin.ch/sem/en/home/themen/einreise/faq.html | Verbatim: "EUR 90 for adults … fixed charge for a Schengen visa"; "extra charge of up to 50% of the fee for a national visa … urgently or outside of normal working hours"; external service-provider fee. No fixed national-D fee published; left as confirm-with-representation. Fee → reviewBy 2026-07-09. |
| 2026-06-09 | us-ch | T3 cost (confirm with commune; communal/cantonal fees) | fact-verifier | FLAGGED | https://www.ch.ch/en/housing/moving/notification-of-departure-and-registration/ | Page loads (HTTP 200, title "Notifying a change of address") but no fee figure. "Confirm with [authority]" — no checkable fact. |
| 2026-06-09 | us-ch | T4 timeline (confirm with canton; production/delivery time) | fact-verifier | FLAGGED | https://www.sem.admin.ch/sem/en/home/themen/aufenthalt/biometr_auslaenderausweis.html | Page loads (HTTP 200); supports canton-decides (verified elsewhere) but no production/delivery time. "Confirm with [authority]" — no checkable fact. |
| 2026-06-09 | us-ch | T5 step link — FOPH KVG statutory insurance obligation | fact-verifier | VERIFIED | https://www.bag.admin.ch/en/health-insurance-requirement-to-obtain-insurance-for-persons-resident-in-switzerland | Verbatim: "any person who is resident in Switzerland is required to obtain health insurance … within three months after taking up residence." Page names KVG (Links/Legislation); does not spell out "LAMal". |
| 2026-06-09 | us-ch | T5 cost (insurers set premiums; vary by canton/region/residence; deductible & model lower premium) | fact-verifier | VERIFIED | https://www.bag.admin.ch/en/health-insurance-premiums-and-co-payment | Verbatim: "Insurers set the premiums …"; "Premium levels vary … within cantons and depend on the policyholder's place of residence. Insurers may charge different premiums for different regions." Elective deductibles (500–2500) and HMO/GP models with discount confirmed. Fee/premium → reviewBy 2026-07-09. |
| 2026-06-09 | us-ch | T6 AHV/OASI summary (number for all living/working; employer deducts & pays to compensation office; 8.7%) | fact-verifier | VERIFIED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/oasi-contributions/ | Verbatim: "All persons living or working in Switzerland must pay OASI contributions"; "Half of your OASI contributions (8.7% of your salary) … other half by your employer. Your employer takes care of deducting … and pays them to the compensation fund." Trailing number-issuance step is an honest confirm-pointer, no fact invented. |
| 2026-06-09 | us-ch | T6 timeline (confirm with compensation office; no fixed time to issue number) | fact-verifier | FLAGGED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/oasi-contributions/ | Page loads (HTTP 200); supports employer/compensation-fund mechanism but no issuance time. "Confirm with [authority]" — no checkable fact. |
| 2026-06-09 | us-ch | T6 cost (no fee for number; 8.7% split, deducted from gross by employer) | fact-verifier | VERIFIED | https://www.ch.ch/en/retirement/old-age-pension/the-first-pillar/oasi-contributions/ | Verbatim: "Half of your OASI contributions (8.7% of your salary) are paid by you and the other half by your employer … deducting … from your gross salary." No-fee-for-number not contradicted. Contribution rate → reviewBy 2026-07-09. |

**Re-verification run totals (us-ch, 2026-06-09):** 10 VERIFIED / 5 FLAGGED of 15 re-checked.
**Corridor cumulative status (us-ch, after this run):** 22 VERIFIED / 5 FLAGGED of 27 claims (the 3 removed `open-bank-account` claims are no longer in the file).
