# AGENTS.md

Single-page budget (presupuesto) generator for an Argentine notary office
(escribanía). Pure static HTML/CSS/JS: no package manager, no build, no tests,
no linter, no CI. Git repository with `main`, `staging` and `develop` branches
and no remote yet. Open `index.html` in a browser and press
"Imprimir / Guardar en PDF".

## Files

| Path | Role |
| --- | --- |
| `index.html` | Markup only. Loads Tailwind from CDN, then `css/style.css`, then `js/script.js` at the end of `<body>`. |
| `css/style.css` | Screen styles for the logo block; everything else visual lives in one `@media print` block at the bottom. |
| `js/script.js` | `calcular()` recalculation, ARS formatting, amount-in-words, empty-field marking, detail textarea mirror. |
| `assets/3925433-budget-money-stocks-icon_111559.svg` | Favicon. |

There is no `plantilla_presupuesto_escribania.html` anymore: the old
self-contained template was split into the files above. Do not recreate it.

## Branch flow

`develop` → `staging` → `main`, promoted by hand. There is no CI, so the gate is
a human opening the page and checking the print preview.

- **`develop`** — default working branch. All commits land here. Feature branches
  are optional and merge back into `develop`.
- **`staging`** — frozen candidate for review. It only ever receives merges from
  `develop`; never commit on it directly. The point is that what you test is
  exactly what `develop` held at that moment.
- **`main`** — the version that is safe to print for a real client. Promotion
  only from `staging`.

Promote a candidate:

```bash
git checkout staging && git merge --no-ff develop -m "chore: stage <what>"
# open index.html, verify the checklist below, fix on develop if something breaks
git checkout main && git merge --no-ff staging -m "chore: release <what>"
```

If review finds a bug, fix it on `develop`, then merge `develop` into `staging`
again. Never patch `staging` or `main` directly: the fix would be lost on the next
promotion and the branches would drift apart.

The rule is enforced by a tracked hook: `.githooks/pre-commit` rejects direct
commits on `staging` and `main` and allows merges (it checks for `MERGE_HEAD`).
Git config is not versioned, so after cloning run:

```bash
git config core.hooksPath .githooks
```

`git commit --no-verify` bypasses it on purpose; use it only when you know why.

## Domain rules (hard-coded, do not change silently)

- Locale `es-AR`, currency ARS, always 2 decimals (`Intl.NumberFormat`).
- Rates are entered as percentages in the UI and divided by 100 in `calcular()`.
- IVA is 21% and applies **only** to gravado amounts (currently `#valMinutas`).
  Hard-coded at `js/script.js` inside `calcular()`.
- Non-gravado: sellos, aporte compraventa, aporte hipoteca, tasa compraventa,
  tasa hipoteca, and the fixed sellos matriz amount.
- `TOTAL = subtotalNoGravado + subtotalGravado + iva`.
- Amount in words uses the long scale as used in Argentina: `1.000.000.000` =
  `MIL MILLONES`, `1.000.000.000.000` = `UN BILLÓN`. Apocope `UNO → UN` and
  `VEINTIUNO → VEINTIÚN` before `MIL` / `MILLÓN`. Format:
  `SON PESOS <letras> CON <centavos>/100`. With total 0 the line stays empty on
  purpose, so a blank budget does not print "SON PESOS CERO CON 00/100".

## Print contract (this is the fragile part)

Goal: exactly one A4 portrait page, flat black text on white, no backgrounds,
colors, shadows, rounded corners or input boxes.

- Never set `height` on `html`/`body` to the paper size, and never use
  `overflow: hidden` to hide overflow. Both produce a second blank page or
  silently clip content.
- The printable width is 182mm ≈ 688px, which is **below** Tailwind's `md:`
  breakpoint (768px). The print block therefore re-forces the wide two-column
  layouts by hand. Any new `md:` layout needs its print counterpart, or the
  document collapses to a single column and spills to page two.
- `.no-print` table cells are collapsed to width 0 and emptied, not removed with
  `display: none`: removing them breaks the `colspan` of the subtotal rows.
- Empty fields carry `.campo-vacio` (transparent text) instead of being hidden,
  so the layout survives printing.
- `#detallePresupuesto` (textarea) is hidden in print and replaced by the
  `#detalleTextoImpreso` mirror, because a fixed-height textarea clips long text
  in the PDF.
- Manually typed amounts (`#valMinutas`, `#valSellosMatriz`) hide in print; the
  formatted `.monto-impreso` spans show instead.
- Browser headers/footers (date, URL, title) cannot be suppressed from CSS. The
  footer explains how to disable them in the print dialog.

## Conventions

- UI copy and code comments are in Spanish. Identifiers stay in English/camelCase.
- No bundler, no framework, no npm. The only external dependency is the Tailwind
  CDN script tag; keep it that way.
- Keep print rules in `css/style.css`; do not scatter them into inline styles.
- Commits follow Conventional Commits. No AI attribution or `Co-Authored-By`
  trailers.

## Known gaps (as of 2026-11-11)

- `#honorariosUsd` is rendered but never read by any calculation. Honorarios are
  not part of the total yet.
- No automated tests. Verification is manual (see below).

## Manual verification checklist

1. Open `index.html`. Empty state: no stray `$0,00` in the printed version and
   no "SON PESOS CERO".
2. Sanity check the math: compra `100000` U$S, TC `1000`, minutas `500000`.
   Expect sellos 1.000.000, aporte compra 400.000, tasa compra 200.000,
   subtotal no gravado 1.600.000, IVA 105.000, total 2.205.000, and
   `SON PESOS DOS MILLONES DOSCIENTOS CINCO MIL CON 00/100`.
3. Fill a long detail text and confirm it prints complete.
4. `Ctrl+P`: one page only, black and white, no placeholders, no cut-off text.
