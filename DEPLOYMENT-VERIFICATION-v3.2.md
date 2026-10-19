# Penny 3.2 deployment verification

19 October 2026, 1:23 pm IST publication.

- Release: https://github.com/debasisr66/PennyExpenseManager/releases/tag/v3.2
- Source and tag: fff33cc66f171275c3c6b8aabf168257387bf704
- Verification workflow succeeded: https://github.com/debasisr66/PennyExpenseManager/actions/runs/39218745577
- Pages deployment succeeded: https://github.com/debasisr66/PennyExpenseManager/actions/runs/39218746070
- Studio notification succeeded: https://github.com/debasisr66/PennyExpenseManager/actions/runs/39218745623
- Hosted URL: https://debasisr66.github.io/PennyExpenseManager/?release=v3.2
- All 13 hosted runtime asset SHA-256 hashes matched the source commit.
- Exact public-browser regression: Hindi selected; dictated text `spend rs.50 on donation`; English draft `Spent 50 rupees on donation`; Use English draft populated Amount `50.00`, Category `Other`, Description `donation`. No test expense was saved.
- 633 automated tests passed locally and in Docker; GitHub CI repeated the syntax, full test and Docker-build gates successfully.
- Word document render review: journey 5 pages, journey v2 6 pages, scorecard 1 page; every page inspected.

Real iPhone audio/native-speaker/full accessibility/usability acceptance and GHCR/multi-platform/image scanning remain open and are disclosed in the release notes. This application release does not claim public registry images.

The published GitHub release is immutable. Its seven assets were uploaded before publication; these post-deployment records are committed separately without replacing or retagging the release.
