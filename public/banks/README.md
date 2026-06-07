# Bank logos

Drop bank logo image files here. They're referenced from `src/utils/bankBrand.js`
via the `logo:` field (e.g. `logo: '/banks/enbd.png'`).

Expected files:
- `enbd.png` — Emirates NBD
- `dib.png`  — Dubai Islamic Bank

Tips:
- Use the **icon/symbol only** (not the full horizontal wordmark) so it reads well
  inside the small square badge. A square-ish, transparent or white-background PNG
  (≈128×128 or larger) works best.
- If a file is missing, `BankLogo` automatically falls back to the brand-coloured
  monogram — nothing breaks.
- To add more banks, add a `logo:` path to that bank's entry in `bankBrand.js`.
