# Flagged links — replace in the next step

23 links resolve to an **unusable page for a human** — all on Fedlex (`fedlex.admin.ch/eli/.../en` or `/de` "latest consolidated" view), which serves an Angular JS shell / "this version is under preparation" page: no article text, dead `#art_X` anchor. **The law text is correct; only the link is broken for users.** Each proposed replacement is the Fedlex **static filestore HTML** for an in-force dated version — curl-verified to render the article text + anchor and to support the cited point. Applying these touches provenance, so each changed source must be re-confirmed by `fact-verifier` (two-agent rule) before publish.

## us-ch — USA → Switzerland (23)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_42`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 42 and 52 — Fedlex, the official publication platform of Swiss law · used in 9 place(s)
- **Problem:** The cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile c7f3a4b4c437.html: 76889 bytes, <title>Fedlex</title>, app-root, the 'nur mit einem Javascript-fähigen Browser' notice). A user sees no article text and the #art_42 fragment resolves to nothing.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_42` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-spouse-swiss (summary); family-permit-spouse-swiss (tldr); family-permit-spouse-swiss (keyFact:Who applies); family-permit-spouse-swiss (keyFact:Right or discretion); family-permit-unmarried-partner (keyFact:Right or discretion); family-permit-children (summary); family-permit-children (tldr); family-permit-children (keyFact:Who applies); family-permit-children (keyFact:Right or discretion)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_27`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 27 — Fedlex, the official publication platform of Swiss law · used in 8 place(s)
- **Problem:** The /eli/cc/2007/758/en page serves an Angular SPA shell (cached HTML is <title>Fedlex</title> + app-root, ~76 KB, visible text only the 'javascript-fähigen Browser' notice). No Art. 27 text and no id="art_27" anchor render for a human; the #art_27 jump resolves to nothing.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html.html#art_27` **(verified)**
- **Supports the point:** yes
- **Update at:** study-admission (summary); study-admission (tldr); study-admission (keyFact:Legal basis); study-residence-permit (summary); study-residence-permit (tldr); study-residence-permit (keyFact:Right or discretion); study-after-graduation (keyFact:Right or discretion); study-after-graduation (step2)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_47`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 47 para. 1 — Fedlex · used in 7 place(s)
- **Problem:** Cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile 537d74f11179.html, identical 76889-byte JS-required page). No article text; #art_47 anchor resolves to nothing for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_47` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-spouse-swiss (keyFact:Deadline); family-permit-spouse-swiss (step3); family-permit-spouse-settled (keyFact:Deadline); family-permit-spouse-b-holder (keyFact:Deadline); family-permit-children (keyFact:Deadline); family-permit-children (step2); family-d-visa (keyFact:Deadline)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_43`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 43 and 52 — Fedlex, the official publication platform of Swiss law · used in 7 place(s)
- **Problem:** Angular SPA shell served (same Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 43 text and no id="art_43" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html.html#art_43` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-spouse-settled (summary); family-permit-spouse-settled (tldr); family-permit-spouse-settled (keyFact:Who applies); family-permit-spouse-settled (keyFact:Right or discretion); family-permit-spouse-settled (keyFact:Legal basis); family-permit-spouse-settled (step2); family-permit-children (keyFact:Legal basis)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_44`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 44 and 52 — Fedlex, the official publication platform of Swiss law · used in 6 place(s)
- **Problem:** Cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile 7d2ccd9509a1.html, 76889-byte JS-required page). No Art.44 text and the #art_44 anchor is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_44` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-spouse-b-holder (summary); family-permit-spouse-b-holder (tldr); family-permit-spouse-b-holder (keyFact:Who applies); family-permit-spouse-b-holder (keyFact:Right or discretion); family-permit-spouse-b-holder (keyFact:Legal basis); family-permit-spouse-b-holder (step2)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_25`
- **Source:** Ordinance on Admission, Period of Stay and Employment (VZAE/ASEO, SR 142.201), Art. 25 — Fedlex (official German text) · used in 6 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 25 text and no id="art_25" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260101/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260101-de-html.html#art_25` **(verified)**
- **Supports the point:** yes
- **Update at:** retirement-residence-permit (keyFact:Legal basis); retirement-residence-permit (keyFact:Work allowed); retirement-residence-permit (step1); retirement-residence-permit (step2); retirement-residence-permit (step3); retirement-residence-permit (step4)

### `https://www.fedlex.admin.ch/eli/cc/1995/3867_3867_3867/de#art_2`
- **Source:** Ordinance on Health Insurance (KVV, SR 832.102), Art. 2 para. 4 — Fedlex (official German text) · used in 6 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile 7550f5531b9b.html, 76889-byte JS-required page). The KVV Art.2 text is not rendered and the #art_2 anchor is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/1995/3867_3867_3867/20260101/de/html/fedlex-data-admin-ch-eli-cc-1995-3867_3867_3867-20260101-de-html-3.html#art_2` **(verified)**
- **Supports the point:** yes
- **Update at:** study-health-insurance-exemption (summary); study-health-insurance-exemption (tldr); study-health-insurance-exemption (keyFact:Who applies); study-health-insurance-exemption (keyFact:Where); study-health-insurance-exemption (keyFact:Legal basis); study-health-insurance-exemption (keyFact:Right or discretion)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_30`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 30 — Fedlex, the official publication platform of Swiss law · used in 4 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 30 text and no id="art_30" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html.html#art_30` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-unmarried-partner (tldr); family-permit-unmarried-partner (keyFact:Legal basis); family-permit-unmarried-partner (keyFact:Who applies); family-permit-unmarried-partner (step2)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_28`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 28 — Fedlex, the official publication platform of Swiss law · used in 4 place(s)
- **Problem:** Cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile 39d8037d46b7.html, 76889-byte JS-required page). No Art.28 text; #art_28 anchor dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_28` **(verified)**
- **Supports the point:** yes
- **Update at:** retirement-residence-permit (summary); retirement-residence-permit (tldr); retirement-residence-permit (keyFact:Who applies); retirement-residence-permit (keyFact:Right or discretion)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_12`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 12 — Fedlex, the official publication platform of Swiss law · used in 3 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 12 text and no id="art_12" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html.html#art_12` **(verified)**
- **Supports the point:** yes
- **Update at:** register-commune (tldr); register-commune (keyFact:Who applies); register-commune (keyFact:Legal basis)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_23`
- **Source:** Ordinance on Admission, Period of Stay and Employment (VZAE/ASEO, SR 142.201), Art. 23 — Fedlex (official German text) · used in 3 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile f37cb401156f.html, 76889-byte JS-required page). The VZAE Art.23 text is not rendered and #art_23 is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260612/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260612-de-html-2.html#art_23` **(verified)**
- **Supports the point:** yes
- **Update at:** study-residence-permit (step3); study-residence-permit (step4); study-residence-permit (step5)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_10`
- **Source:** Ordinance on Admission, Period of Stay and Employment (OASA/VZAE, SR 142.201), Art. 10 — Fedlex, the official publication platform of Swiss law · used in 2 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 10 text and no id="art_10" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260101/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260101-de-html.html#art_10` **(verified)**
- **Supports the point:** yes
- **Update at:** register-commune (keyFact:Where); register-commune (keyFact:Deadline)

### `https://www.fedlex.admin.ch/eli/cc/63/837_843_843/de#art_1_a`
- **Source:** Federal Act on Old-Age and Survivors' Insurance (OASI Act / AHVG, SR 831.10), Art. 1a — Fedlex, the official publication platform of Swiss law · used in 2 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile c2126da22390.html, 76889-byte JS-required page). The AHVG Art.1a text is not rendered and #art_1_a is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/63/837_843_843/20260101/de/html/fedlex-data-admin-ch-eli-cc-63-837_843_843-20260101-de-html-1.html#art_1_a` **(verified)**
- **Supports the point:** yes
- **Update at:** ahv-social-security (tldr); ahv-social-security (keyFact:Who applies)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_38`
- **Source:** Ordinance on Admission, Period of Stay and Employment (VZAE/ASEO, SR 142.201), Art. 38 — Fedlex (official German text) · used in 2 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 38 text and no id="art_38" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260101/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260101-de-html.html#art_38` **(verified)**
- **Supports the point:** yes
- **Update at:** study-work-alongside (keyFact:Legal basis); study-work-alongside (step1)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_21`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 21 — Fedlex · used in 2 place(s)
- **Problem:** Cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile e2bd24da54bf.html, 76889-byte JS-required page). No Art.21 text; #art_21 anchor dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_21` **(verified)**
- **Supports the point:** yes
- **Update at:** study-after-graduation (keyFact:Legal basis); study-after-graduation (step1)

### `https://www.fedlex.admin.ch/eli/cc/63/837_843_843/de#art_13`
- **Source:** Federal Act on Old-Age and Survivors' Insurance (OASI Act / AHVG, SR 831.10), Art. 13–14 — Fedlex, the official publication platform of Swiss law · used in 1 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 13 text and no id="art_13" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/63/837_843_843/20260101/de/html/fedlex-data-admin-ch-eli-cc-63-837_843_843-20260101-de-html.html#art_13` **(verified)**
- **Supports the point:** yes
- **Update at:** ahv-social-security (keyFact:Where)

### `https://www.fedlex.admin.ch/eli/cc/63/837_843_843/de#art_3`
- **Source:** Federal Act on Old-Age and Survivors' Insurance (OASI Act / AHVG, SR 831.10), Art. 3, 5 and 13 — Fedlex, the official publication platform of Swiss law · used in 1 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile 7eab623a3926.html, 76889-byte JS-required page). The AHVG Art.3 text is not rendered and #art_3 is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/63/837_843_843/20260101/de/html/fedlex-data-admin-ch-eli-cc-63-837_843_843-20260101-de-html-1.html#art_3` **(verified)**
- **Supports the point:** yes
- **Update at:** ahv-social-security (keyFact:Legal basis)

### `https://www.fedlex.admin.ch/eli/cc/63/837_843_843/de#art_5`
- **Source:** Federal Act on Old-Age and Survivors' Insurance (OASI Act / AHVG, SR 831.10), Art. 5 and 13 — Fedlex, the official publication platform of Swiss law · used in 1 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 5 text and no id="art_5" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/63/837_843_843/20260101/de/html/fedlex-data-admin-ch-eli-cc-63-837_843_843-20260101-de-html.html#art_5` **(verified)**
- **Supports the point:** yes
- **Update at:** ahv-social-security (keyFact:Work allowed)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_52`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 42 and 52 — Fedlex · used in 1 place(s)
- **Problem:** Cited consolidated-EN ELI URL serves the Fedlex Angular SPA shell (cacheFile bb3b195561e7.html, 76889-byte JS-required page). No Art.52 text; #art_52 anchor dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html-3.html#art_52` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-spouse-swiss (keyFact:Legal basis)

### `https://www.fedlex.admin.ch/eli/cc/2007/758/en#art_50`
- **Source:** Foreign Nationals and Integration Act (FNIA, SR 142.20), Art. 50 — Fedlex · used in 1 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 50 text and no id="art_50" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/758/20260201/en/html/fedlex-data-admin-ch-eli-cc-2007-758-20260201-en-html.html#art_50` **(verified)**
- **Supports the point:** yes
- **Update at:** family-permit-unmarried-partner (step2)

### `https://www.fedlex.admin.ch/eli/cc/2015/518/de#art_2`
- **Source:** Ordinance of the FDJP on residence permits subject to the approval procedure (ZV-EJPD, SR 142.201.1), Art. 2 — Fedlex (official German text) · used in 1 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile b19e35b3fa71.html, 76889-byte JS-required page). The ZV-EJPD Art.2 text is not rendered and #art_2 is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2015/518/20250401/de/html/fedlex-data-admin-ch-eli-cc-2015-518-20250401-de-html.html#art_2` **(verified)**
- **Supports the point:** yes
- **Update at:** retirement-residence-permit (step6)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_39`
- **Source:** Ordinance on Admission, Period of Stay and Employment (VZAE/ASEO, SR 142.201), Art. 39 — Fedlex (official German text) · used in 1 place(s)
- **Problem:** Angular SPA shell served (Fedlex JS-bootstrap page, ~76 KB, no article body). No Art. 39 text and no id="art_39" anchor visible to a human.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260101/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260101-de-html.html#art_39` **(verified)**
- **Supports the point:** yes
- **Update at:** study-work-alongside (step2)

### `https://www.fedlex.admin.ch/eli/cc/2007/759/de#art_40`
- **Source:** Ordinance on Admission, Period of Stay and Employment (VZAE/ASEO, SR 142.201), Art. 40 — Fedlex (official German text) · used in 1 place(s)
- **Problem:** Cited consolidated-DE ELI URL serves the Fedlex Angular SPA shell (cacheFile f9e8c31ce478.html, 76889-byte JS-required page). The VZAE Art.40 text is not rendered and #art_40 is dead for a user.
- **Replace with:** `https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2007/759/20260612/de/html/fedlex-data-admin-ch-eli-cc-2007-759-20260612-de-html-2.html#art_40` **(verified)**
- **Supports the point:** yes
- **Update at:** study-work-alongside (step3)
