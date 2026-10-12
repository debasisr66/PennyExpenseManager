# Penny V2 test cases

Use sample/test expenses, not real financial information. These steps describe what to check; executed results are recorded separately in [TEST-RESULTS.md](TEST-RESULTS.md).

## Preparation

Open the app in a browser with no saved Penny data, or a separate browser profile. Do not clear a browser that contains real records. V2 sample spending for the current month is ₹13,338.50; the budget is ₹18,000.00; the amount left is ₹4,661.50. A previous-month dinner costs ₹380.00. If existing V1 data is present, use its actual starting total instead.

## Main app tests

| ID | Steps | Expected result |
| --- | --- | --- |
| TC01 | Open a fresh V2 app. Inspect the cards and chart. | All expense values, budget values, and chart amounts use INR; 9 records exist across two months. |
| TC02 | Search `#groceries #family`. | Only Weekly groceries appears. The monthly total stays ₹13,338.50. |
| TC03 | Search `groceries over 500`. | Weekly groceries appears, at ₹864.00. |
| TC04 | Search `"weekly groceries"`, then `groceris`. | Phrase search matches Weekly groceries; the spelling-tolerant search matches relevant description/category/tag words. |
| TC05 | Search `min:100 max:500`, then `category:transport`. | Amount limits are inclusive. Category search finds Train pass. |
| TC06 | Search `this month`, `last month`, and `month:YYYY-MM`. | Results follow calendar dates. Last month includes the ₹380 dinner. |
| TC07 | Search `after:2026-10-01 before:2026-10-31` with matching sample dates. | Dates are inclusive. Update the dates if testing in another sample month. |
| TC08 | Search an unknown word, then `month:2026-13`. | No-results state appears; malformed month explains the correct format. Clear restores the list. |
| TC09 | Add a ₹250 current-month expense named `V2 test lunch #groceries`, with Tags `#family #groceries`. | Description becomes V2 test lunch. Groceries and family chips appear once each. Total becomes ₹13,588.50. |
| TC10 | Click + Tag beside V2 test lunch, enter `#reimbursable`, and Add. | Chip appears without opening the full edit dialog; totals remain unchanged. |
| TC11 | Add the same tag again, then try `bad!`. | A duplicate is not created. Invalid characters are explained. |
| TC12 | Click × beside reimbursable. Click a groceries chip. | Tag is removed from that record; clicking another chip fills the search and filters matching expenses. |
| TC13 | Edit V2 test lunch to ₹300 and save. Refresh. | Total becomes ₹13,638.50. Edited amount and tags survive refresh. |
| TC14 | Set current-month budget to ₹10,000. | Warning says spending is ₹3,638.50 above the budget. Search cannot suppress the warning. |
| TC15 | Delete V2 test lunch, first choosing Cancel, then confirming. | Cancel leaves it intact. Confirmation removes it and returns total to ₹13,338.50. |
| TC16 | Restore budget to ₹18,000; then test zero and a budget equal to spending. | Normal limit clears warning; zero warns if spending exists; equal spending does not exceed the budget. |
| TC17 | Select the previous month. | Total is ₹380.00 with Food & groceries in its chart. No budget is set for that month. The list still includes all months. |
| TC18 | Try blank/whitespace/tag-only description, zero/negative amount, too many decimals, or invalid date. | No invalid expense is saved; fields or a message explain the correction needed. |
| TC19 | Inspect What’s New and open View test cases. | V2 features and this test document are available. |
| TC20 | Resize to 390px and 1280px. Open a form and add an inline tag. | No horizontal page overflow. Search, converter, chips, edit/delete buttons and dialogs remain usable. |

## Currency conversion tests

| ID | Steps | Expected result |
| --- | --- | --- |
| FX01 | Convert 1000 INR to USD and choose Get latest rate. | A date, rate and estimate appear. Rate varies with the source; the recorded 2026-10-12 check returned 0.01037 and $10.37. Expense totals stay unchanged. |
| FX02 | Select USD → INR, enter amount 10, and manually enter rate 100. | Equivalent is ₹1,000.00. This illustrative manual rate does not change records. |
| FX03 | Select INR → INR with amount 10. | Equivalent is ₹10.00; rate is 1, with no rate request. |
| FX04 | Enter blank or negative amount, or a zero/negative manual rate. | No misleading estimate appears. |
| FX05 | In the test harness choose Network failure, then Get latest rate. Enter rate 0.01. | Failure message offers manual entry; 1000 INR converts to $10.00 with the manual rate. |
| FX06 | In the harness choose Malformed response after setting a valid manual rate. | Invalid payload is rejected; the existing manual estimate is retained. |
| FX07 | In the harness choose Delayed response. Request INR → USD, immediately switch target to EUR and set manual rate 0.02. | The old response never replaces the EUR manual rate; 1000 INR remains €20.00. |

## Voice tests

Keyboard entry must always remain available. For deterministic tests, start `node tests/serve-tests.cjs`, open `/voice-harness`, and use its simulated controls. No audio is captured there.

| ID | Steps | Expected result |
| --- | --- | --- |
| V01 | Choose Add expense. | Keyboard entry is ready. Voice panel and microphone are inactive. |
| V02 | Choose Use voice. | Instructions and audio-processing explanation appear; capture has not begun. |
| V03 | In the harness choose Start listening, then Deliver transcript. | Draft shows ₹250, today's date, Food & groceries, groceries description, groceries/family tags. Nothing is auto-saved. |
| V04 | In the harness set transcript to `Paid two hundred fifty rupees for train pass yesterday tag travel`. Deliver it. | Draft amount is ₹250, date is yesterday, category is Transport, description is train pass, tag is travel. |
| V05 | In the harness Start listening, then Simulate permission denied. | Permission explanation appears and keyboard fields stay editable. |
| V06 | Start listening, cancel the dialog, then deliver a late transcript through outside fixture controls. | Cancelled session cannot create or overwrite an expense. |
| V07 | Choose Stop listening or Use keyboard, or close the dialog with Escape. | Listening stops/cancels; keyboard entry remains possible. |
| V08 | Deliver an invalid/missing amount, invalid date, or a foreign-currency phrase. | Draft warns you to correct the affected fields; foreign currency is not silently recorded as INR. |
| V09 | Use a browser without speech recognition. | Helpful fallback explains that keyboard entry is available. |
| V10 — real device | On the HTTPS app in your target browser, choose Use voice → Start listening, allow microphone permission, and speak the sample sentence. Review and save. | Real speech becomes an accurate reviewable draft; saving creates exactly one INR expense. **Manual device acceptance: not executed by the agent.** |
| V11 — real device | Deny microphone permission or disconnect the speech service. | Appropriate fallback appears. **Actual provider/OS behavior requires manual acceptance; controller error paths were simulated.** |

## Migration and data protection

Automated fixtures cover V1 → V2 preservation of IDs, amounts, dates, descriptions and budgets; V2 tag preservation; invalid saved data; duplicate IDs; real calendar dates; zero budgets; and currency-response validation. Existing numerical amounts retain their values and receive INR labels, without an exchange-rate multiplier. Do not manufacture corrupt fixtures in a browser containing real data.

Run all deterministic checks with `node --test tests/*.test.cjs`.
