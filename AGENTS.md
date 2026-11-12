# AGENTS.md

Single-page budget (presupuesto) generator for an Argentine notary office
(escribanía). Pure static HTML/CSS/JS: no package manager, no build, no tests,
no linter, no CI. Git repository with `main`, `staging` and `develop` branches,
pushed to `github.com/PatEche/presupuesto-app`. Open `index.html` in a browser
and press "Imprimir / Guardar en PDF".

## Files

| Path | Role |
| --- | --- |
| `index.html` | Markup only. Loads Tailwind from CDN, then `css/style.css`, then `js/script.js` at the end of `<body>`. |
| `css/style.css` | Screen styles for the logo block; everything else visual lives in one `@media print` block at the bottom. |
| `js/script.js` | `calcular()` recalculation, ARS formatting, amount-in-words, empty-field marking, detail textarea mirror, generation and removal of the non-gravado rows. |
| `assets/3925433-budget-money-stocks-icon_111559.svg` | Favicon. |
| `assets/readme.png` | README screenshot, captured from the real page with mock data. |

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
`.gitattributes` pins `.githooks/**` to LF, because a CRLF hook file makes the
shell fail to parse it.

## Domain rules (hard-coded, do not change silently)

- Locale `es-AR`, currency ARS, always 2 decimals (`Intl.NumberFormat`).
- The budget has **no operation values, no exchange rate and no honorarios**:
  the `Valor Compra`, `Valor Hipoteca`, `Tipo de Cambio` and `Honorarios Esc.`
  fields were removed on purpose. Every amount in the sheet is typed directly in
  pesos; nothing is converted and nothing is derived from a percentage base.
- IVA is 21% and applies **only** to gravado amounts (currently `#valMinutas`).
  Hard-coded at `js/script.js` inside `calcular()`.
- Non-gravado concepts are **editable rows**, not fixed markup: `js/script.js`
  builds them from `CONCEPTOS_NO_GRAVADOS` and the DOM is the single source of
  truth. Each row carries its own name and its own amount in pesos. The user can
  rename, add and delete rows, and the subtotal follows. Rows have no base and no
  percentage: the amount is exactly what was typed.
- `CONCEPTOS_NO_GRAVADOS` is **empty on purpose**: a new budget opens with no
  concept loaded and every row is added by hand. The six concepts the original
  template preloaded (sellos compraventa, aporte compraventa, aporte hipoteca,
  tasa compraventa, tasa hipoteca and sellos matriz y testimonio) used to carry a
  calculation base; that system is gone, so preloading them again would mean
  inventing amounts. Preloading concepts is a domain change, not a cosmetic one.
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
- `.no-print` is now a plain `display: none` for screen-only controls (the
  amount input and the delete button of each non-gravado row, the "+ Agregar"
  row, the footer). It used to collapse table cells to width 0 instead of hiding
  them, because the old "% / Base" column held a `<td class="no-print">` and
  removing it broke the `colspan` of the subtotal rows. That column is gone, the
  table has two columns, and no cell carries `.no-print` anymore: do not put the
  class on a `td` or `th` or the row will lose a cell and the colspans will
  break again.
- In the non-gravado rows the name lives in the first cell (input plus the
  `.concepto-nombre-impreso` mirror) and the second cell holds the amount input,
  the delete button and the `.monto-impreso` mirror. All three screen controls
  are hidden in print, so the printed row shows concept and formatted amount
  only.
- With no non-gravado row, `calcular()` adds `.fila-vacia` to `#filaTituloNoGravado`
  and `#filaSubtotalNoGravado`, and `tr.fila-vacia { display: none !important }`
  drops the section from the paper. Without it a blank budget printed a section
  header and a `$ 0,00` subtotal with nothing under them. The class is screen-safe:
  it is only declared inside the print block.
- The two section headers carry **no number** ("CONCEPTOS NO GRAVADOS POR EL
  I.V.A.", "CONCEPTOS GRAVADOS POR EL I.V.A."). They used to read "1." and "2.",
  which left the printed sheet starting at "2." whenever the non-gravado section
  was empty. Do not renumber them: the non-gravado section comes and goes.
- The concept name is edited in a single-line `<input class="concepto-nombre">`
  and printed from the `.concepto-nombre-impreso` span, because an input would
  clip long names instead of wrapping them.
- Empty fields carry `.campo-vacio` (transparent text) instead of being hidden,
  so the layout survives printing.
- `#detallePresupuesto` (textarea) is hidden in print and replaced by the
  `#detalleTextoImpreso` mirror, because a fixed-height textarea clips long text
  in the PDF.
- Manually typed amounts hide in print; the formatted `.monto-impreso` span
  shows instead. This applies to `#valMinutas` and to the amount of every
  non-gravado row (its input carries `.no-print`).
- The budget number prints left-aligned inside its box (`#nroPresupuesto`) and
  the `.fila-etiqueta` rows use a 1mm gap. The screen box is fixed-width and
  right-aligned, so in paper the number used to float 13mm away from the colon.
- The total row stacks on screen below `lg` (label over amount) so it never
  breaks "($):" onto its own line. The print block forces it back to one row:
  label on the left, amount on the right; remove that override and the paper
  total stacks too.
- Browser headers/footers (date, URL, title) cannot be suppressed from CSS. The
  footer explains how to disable them in the print dialog.
- The "Documento no válido como factura" notice **is** printed, as flat uppercase
  text above the budget number (`.aviso-no-factura`, intentionally not
  `.no-print`). Do not add a `display` declaration to that rule: two `!important`
  declarations of equal specificity resolve by source order, so it would override
  `.no-print` and silently defeat the convention.
- Font families are deliberately **not** reset in the print block. Adding
  `font-family: inherit` to the universal `*` rule also hits `<html>`, which has
  no parent to inherit from and therefore falls back to the browser's initial
  serif font (Times New Roman). That single declaration is what used to print the
  whole PDF in Times while the screen showed the system sans font.

## Conventions

- UI copy and code comments are in Spanish. Identifiers stay in English/camelCase.
- No bundler, no framework, no npm. The only external dependency is the Tailwind
  CDN script tag; keep it that way.
- Keep print rules in `css/style.css`; do not scatter them into inline styles.
- Screen-only layout for phones lives in one `@media screen and
  (max-width: 639.98px)` block in `css/style.css`, above the print block. Below
  that width the two-column table becomes a stack of blocks (concept on top,
  amount and delete button below). The media type is `screen` on purpose: those
  rules must never fire while printing, or the A4 layout collapses.
- Editable controls are 16px on phones (`input:not([readonly])`, `select`,
  `textarea`): iOS zooms the whole page when a field below 16px gets focus. The
  readonly letterhead inputs keep their smaller size so the phone/email line
  fits on a phone.
- Commits follow Conventional Commits. No AI attribution or `Co-Authored-By`
  trailers.

## Known gaps (as of 2026-11-12)

- Non-gravado rows are not persisted: reloading the page opens an empty table
  again and whatever was typed (including added rows) is lost.
- No automated tests. Verification is manual (see below).

## Manual verification checklist

1. Open `index.html`. Empty state: the non-gravado section is absent from the
   printout (no header, no subtotal row), the amount-in-words line stays blank and
   the totals read `$ 0,00`. Section 2, its minutas row and the totals **do**
   print: the page is a form, and only the concept list disappears. There is no
   Valor Compra, Valor Hipoteca, Tipo de Cambio or Honorarios field anymore.
2. Sanity check the math. Add two non-gravado rows with amounts `1000000` and
   `435000` (concept names are free text), and set minutas to `500000`.
   Expect subtotal no gravado 1.435.000, IVA 105.000, total 2.040.000, and
   `SON PESOS DOS MILLONES CUARENTA MIL CON 00/100`.
3. Rename a concept, add a row and delete it: the subtotal must follow every
   change, and each row must take an amount in pesos only — there is no base
   selector and no percentage field.
4. Fill a long detail text and confirm it prints complete.
5. `Ctrl+P`: one page only, black and white, no placeholders, no cut-off text,
   and the non-gravado rows print concept + amount only (no amount input, no
   delete button, no "+ Agregar" row). With a long detail, up to 11 non-gravado
   rows fit on one page; more than that legitimately spills to a second page.
   The budget number prints as `Presupuesto N°: 00000123`, one space after the
   colon.
6. Narrow the window below 640 px (or open it on a phone): the table stacks
   (concept on top, amount and the delete button below), nothing scrolls
   sideways, the letterhead phone/email line is not cut and the total never
   breaks "($):" onto its own line.
