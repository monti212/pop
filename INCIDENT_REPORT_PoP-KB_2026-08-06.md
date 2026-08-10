# Incident Report — Knowledge Base Dashboard, Upload Access & Knowledge Delivery

*Prepared for the Pencils of Promise team. Thank you for escalating this immediately on Thursday — this report sets out what we found, what we fixed, and how knowledge delivery is now verifiable on an ongoing basis.*

**Reference:** GE-IR-2026-0806
**Prepared by:** GreyEd
**Incident observed:** Thursday, 6 August 2026 · **Fixes live in production:** verified by Saturday morning, 8 August 2026 · **Report issued:** Saturday, 8 August 2026
**Data impact:** None — the materials library was intact throughout, and this platform is dedicated to Pencils of Promise: your Knowledge Base serves your teachers only.

---

## How to read this report — visual companions

This report exists in three forms. This document is the canonical text. Two companion documents pair each section with visuals for faster comprehension: a **static edition** (diagrams and charts, print-friendly) and an **animated edition** (the same visuals with motion, best viewed in a browser). Where a section benefits from a picture, the figure it pairs with is described below so this text stands on its own:

- **§3 — Figure 1, "Two doors":** a person passes an open first door (the app page) and meets a closed second door (the database security layer); behind the closed door sits the full shelf of 185 documents. The dashboard's zeros were the closed second door — not an empty shelf.
- **§3.3 — Figure 2, "Two independent paths":** one library at the centre with two separate corridors out of it — a *dashboard* corridor that passes through user permissions (this is where the block happened), and an *AI* corridor with its own system key (never blocked). The corridors do not touch.
- **§4 — Figure 3, knowledge-delivery chart:** bar chart of the production tests — the material volume actually returned for baseline and grade/subject-scoped retrievals.
- **§5 — Figure 4, 30-day traffic by pipeline:** bars for Uhuru 4.0, 4.3 and 2.0 conversation counts, with the 2.0 bar flagged — those conversations received no knowledge material until the fix.
- **§6 — Figure 5, the system as a 3D stack:** the platform's layers (app, security, library, AI pipelines) shown as separated plates, marking exactly which plate failed for whom — and that the library plate was intact throughout.
- **§9 — Figure 6, timeline:** Thursday's observation through Saturday's verified fixes.

---

## 1. Executive summary

On Thursday 6 August your team reported three things: the Knowledge Base dashboard showing **0 documents**, an upload (*english-b4-b6.pdf*) failing with a security-policy error, and — given both of those — the concern that Uhuru's output does not integrate your materials accurately. We understand why this looked like a major setback, and why you escalated: the symptoms you saw were genuinely alarming, and your team could not have diagnosed them from what the screen showed.

Our investigation found the following:

1. **Your materials were never missing.** The library held **185 documents (156 active)** throughout — including the English B4–B6 curriculum document itself, which has been active in the library since **3 November 2025**. Nothing was deleted, disabled, or lost.

2. **The dashboard zeros and the blocked upload were caused by a gap on our side.** We had not provisioned your team's account tier with Knowledge Base data access. The page was reachable, but the security layer answered every read with an empty result instead of a clear "no permission" message — so the dashboard showed zeros — and the same policy declined the upload. We are sorry: this was our provisioning gap, not anything your team did, and the dashboard's silent behaviour made it look far worse than it was.

3. **For the current-generation models (U4.0 / U4.3), knowledge delivery was verified working**, directly against the production database (§4). The AI reads the Knowledge Base with system-level credentials, so the account-permission gap above could not affect what the AI retrieves.

4. **Your quality concern had a real cause — and we found it.** During the same investigation we discovered a genuine defect in the **previous-generation pipeline (Uhuru 2.0)**, which still serves users whose app version has not yet updated to Uhuru 4.0: those conversations received **no Knowledge Base material at all**. In the last 30 days this affected roughly a third of chat requests (34 conversations across 16 users). This very likely explains the experience behind "the output does not integrate our materials accurately." The defect is fixed and live in production, and affected users are being prompted to update to the current version. Details in §5.

In short: what you saw on screen was exactly as you described; the interpretation it suggested — that the library was gone — was not the case; and the quality instinct behind your escalation pointed at something real, which is now fixed. Every AI response now writes a log entry recording exactly how much Knowledge Base material it included, so from here forward this is verifiable per response rather than a matter of assurance.

---

## 2. What was reported

| # | Observation (6 Aug) | Finding |
|---|---|---|
| 1 | Dashboard: "Total Documents 0 · 0 active", "Token Savings 0%", "Avg per Query 0" | Confirmed — a permission check rendered as zeros (§3.1). The library itself held 185 documents |
| 2 | Upload of *english-b4-b6.pdf* failed: *"new row violates row-level security policy"* | Confirmed — declined by the upload-authorization policy (§3.2). Note: this document has been active in the library since 3 Nov 2025 (§6) |
| 3 | "The output the platform currently generates does not integrate our materials accurately" | Partly substantiated — not via the permissions issue, but via an Uhuru 2.0 pipeline defect we found and fixed during this investigation (§5). Uhuru 4.0 / 4.3 delivery verified working (§4) |

---

## 3. The permissions issue (dashboard and upload)

Both visible symptoms trace to one mistake on our side: **we had not provisioned your team's account tier with Knowledge Base data access.**

**3.1 Why the dashboard showed zeros.** The Knowledge Base page was reachable by your team's accounts, but the database security layer released document data only to a small set of administrator accounts. A denied read returns an *empty result* rather than an error, so the page rendered "0" everywhere instead of saying "this account does not have permission." The zeros described the viewer's access level — not the library's contents.

**3.2 Why the upload was declined.** Since November 2025, Knowledge Base uploads have been restricted at the database level to administrator accounts — a deliberate safeguard, because uploaded documents shape the AI's teaching for every teacher on your platform. Until now, uploads were handled through administrator accounts on your behalf; Thursday's upload came from a team account outside that list, so the security layer declined it as designed. The on-screen message was the database's raw policy error — technically correct, unhelpfully worded.

**3.3 Why this could not affect the AI.** The AI does not read the Knowledge Base "as" any user account. It retrieves knowledge with system-level credentials through a separate pipeline, so a user-account permission gap does not, by design, change what the AI reads. That said, retrieval can fail for *other* reasons — §5 is exactly such a case — which is why we have now added per-response logging: any future failure surfaces in our logs immediately instead of waiting to be noticed downstream.

---

## 4. Verification — current-generation knowledge delivery

Run directly against the production database during the investigation:

| Check | Result |
|---|---|
| Library integrity | **185 documents**, 156 active — intact |
| Baseline retrieval (U4.0 / U4.3 conversations) | **11 core documents, ~11,950 tokens** returned for injection |
| Grade/subject scoping — B1–B3 · Mathematics | 5 documents, ~5,930 tokens |
| Grade/subject scoping — B4–B6 · Science | 5 documents, ~6,115 tokens |
| Tolerant matching — "B2 / Maths" | Correctly resolves to B1–B3 Mathematics ✓ |

No changes were made to the current-generation (U4.0 / U4.3) models or their retrieval design during this incident — the pipeline tested above is the one that has been serving those conversations. What we added is instrumentation: every response now logs the exact document count and material volume it carried. Because that logging is new, we can certify the pipeline's behaviour from now on per response; for historical conversations we rely on the architecture and the tests above rather than per-response records — one more reason the logging now exists.

---

## 5. The second finding: a real defect in the Uhuru 2.0 pipeline

We would rather you hear this from us than discover it later: while verifying the above, we found a genuine retrieval defect — unrelated to permissions — in the **previous-generation pipeline (Uhuru 2.0)**, which still serves users whose app version has not yet updated to Uhuru 4.0.

- **Effect:** conversations on Uhuru 2.0 received **no Knowledge Base material at all**. The retrieval step failed silently and the conversation proceeded on the model's general knowledge alone.
- **Recent scope:** over the last 30 days, 34 conversations across 16 users — roughly a third of chat requests in that window.
- **Relevance to your report:** this is very likely the substance behind "the output does not integrate our materials accurately." Lessons produced in those conversations genuinely would not have reflected your uploaded curriculum.
- **Status:** fixed and deployed to production; Uhuru 2.0 now retrieves from the same 185-document library, and its delivery is logged per response like Uhuru 4.0. Users on outdated app versions are also prompted in-app to update, which moves them onto the stronger Uhuru 4.0 pipeline.

If your team noticed that some lessons integrated materials well while others seemed to ignore them entirely, this defect is the probable explanation for the difference.

---

## 6. Resolution — current state

| Change | Effect for your team |
|---|---|
| Your team's accounts granted full Knowledge Base access | The dashboard now shows the complete library; your team can upload directly rather than routing through administrators |
| Uhuru 2.0 retrieval defect fixed | All conversations — Uhuru 4.0/4.3 and 2.0 — now receive Knowledge Base material |
| Per-response knowledge logging | Every AI answer records exactly what knowledge volume it carried |
| Per-document usage tracking connected to the dashboard | The "Total Usage" statistic now counts every document served into a response |
| Provisioning aligned | For your accounts, page access and data access are now granted together, so this specific mismatch cannot recur |

**One statistic to read correctly:** per-document usage tracking is newly instrumented — the **"Total Usage"** counter began counting on **8 August** and reflects usage from this weekend forward. Usage before instrumentation was not tracked per document, so the number will start small and grow with real classroom use. Document counts, token savings, access, and uploads are live and accurate now.

**On *english-b4-b6.pdf*:** that curriculum document has been active in the library since **3 November 2025**, so Thursday's blocked upload did not leave a gap. If Thursday's file was a newer edition, uploading it again will now succeed — or we are happy to ingest it for you and confirm either way.

---

## 7. On integration quality going forward

Each current-generation conversation is built to include the pinned Pencils of Promise core programme documents plus curriculum documents matched to the teacher's selected grade and subject, within a dedicated context allocation (~12,000 tokens per conversation) — and that inclusion is now confirmed in the logs, per response.

Two commitments from our side:

1. **We will monitor the new per-response logs daily for the next two weeks** and flag anything anomalous ourselves — the burden of catching problems should not sit with your team.
2. If you can share **two or three concrete examples** where materials did not come through as expected — the request made, the output received, what was missing — we will investigate each against both pipelines and respond **within two business days**. Examples help us target the review; they are not needed to justify it.

---

## 8. Preventive measures

- **Clear permission messaging** — dashboard pages will state "this account does not have access" rather than rendering empty data. *(In progress)*
- **Per-response knowledge-delivery logging** — live now, both pipelines (§4, §5).
- **Aligned provisioning** — your team's page access and data access are now granted together. *(Done)*
- **Update prompts for users still on Uhuru 2.0** — in place, moving remaining users to Uhuru 4.0.

---

## 9. Timeline

| When | What |
|---|---|
| Thu 6 Aug, afternoon | Dashboard zeros and upload failure observed by your team; escalated to GreyEd at 17:36 |
| Fri 7 Aug | Root cause of the dashboard/upload issue isolated (account provisioning + silent rendering); production verification of current-generation knowledge delivery run (§4); Uhuru 2.0 pipeline defect discovered and fixed (§5) |
| By Sat 8 Aug, morning | Access fix, Uhuru 2.0 fix, logging, and hardening all deployed to production and verified. This report issued |

---

## 10. Next step

We would welcome a **30-minute call early next week** to walk through the restored dashboard together and re-run the §4 verification live on production while you watch. We will bring the per-response log records from the intervening days so you can see actual knowledge delivery — not vendor assurances — and we are glad to provide log excerpts for your own team to review independently.

Your materials are intact, they are reaching the AI on both pipelines, your team now has direct visibility and control over them — and the part of your report that pointed at output quality led us to a real defect that is now fixed. That escalation made the product better, and we appreciate it.

**Motheo "Monti" Kgengwenyane**
GreyEd
