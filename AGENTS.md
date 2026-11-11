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
- The operation may be quoted in USD **or** in ARS: `#valCompraUsd` and
  `#valHipotecaUsd` are currency-agnostic despite the historical `Usd` suffix in
  their ids, and `#tipoCambio` is the only converter. For a peso operation the
  user sets `tipoCambio = 1` and the amounts are taken as-is. There is no
  currency selector; the field labels are deliberately neutral ("Valor Compra",
  "Tipo de Cambio") and a screen-only hint explains the `1` case.
- A blank or zero `tipoCambio` with a compra or hipoteca amount silently zeroes
  every percentage-based concept, so `calcular()` shows `#avisoTipoCambio`
  whenever that combination holds and at least one row has a percentage base.
  The warning never blocks printing; it is screen-only.
- Rates are entered as percentages in the UI and divided by 100 in `calcular()`.
- IVA is 21% and applies **only** to gravado amounts (currently `#valMinutas`).
  Hard-coded at `js/script.js` inside `calcular()`.
- Non-gravado concepts are **editable rows**, not fixed markup: `js/script.js`
  builds them from `CONCEPTOS_NO_GRAVADOS` and the DOM is the single source of
  truth. Each row carries its own name, a base (`compra` = % of the compraventa
  amount in ARS, `hipoteca` = % of the hipoteca amount, `fijo` = ARS amount typed
  by hand) and its value. The user can rename, re-base, add and delete rows, and
  the subtotal follows.
- `CONCEPTOS_NO_GRAVADOS` is **empty on purpose**: a new budget opens with no
  concept loaded and every row is added by hand. The six concepts the original
  template used to preload are kept here only as the reference set, in case
  someone decides to preload them again: sellos compraventa (`compra` `1`),
  aporte compraventa (`compra` `0.4`), aporte hipoteca (`hipoteca` `0.3`), tasa
  compraventa (`compra` `0.2`), tasa hipoteca (`hipoteca` `0.2`) and sellos
  matriz y testimonio (`fijo`, empty value). Preloading them again is a domain
  change, not a cosmetic one.
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
- In the non-gravado rows the middle cell (`.no-print`) holds the base selector,
  the value input and the delete button; the printed row therefore shows only
  concept and amount. The row that holds the "+ Agregar concepto" button is a
  `<tr class="no-print">`, which the plain `.no-print` rule hides outright.
- With no non-gravado row, `calcular()` adds `.fila-vacia` to `#filaTituloNoGravado`
  and `#filaSubtotalNoGravado`, and `tr.fila-vacia { display: none !important }`
  drops the section from the paper. Without it a blank budget printed a section
  header and a `$ 0,00` subtotal with nothing under them. The class is screen-safe:
  it is only declared inside the print block. On a completely empty budget the
  printed document therefore starts at "2. CONCEPTOS GRAVADOS POR EL I.V.A.":
  that numbering gap is accepted, an empty form is not a document to hand out.
- The concept name is edited in a single-line `<input class="concepto-nombre">`
  and printed from the `.concepto-nombre-impreso` span, because an input would
  clip long names instead of wrapping them.
- Empty fields carry `.campo-vacio` (transparent text) instead of being hidden,
  so the layout survives printing.
- `#detallePresupuesto` (textarea) is hidden in print and replaced by the
  `#detalleTextoImpreso` mirror, because a fixed-height textarea clips long text
  in the PDF.
- Manually typed amounts (`#valMinutas`) hide in print; the formatted
  `.monto-impreso` span shows instead. The non-gravado rows need no mirror: their
  amount cell is already the formatted value on screen and on paper.
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
- Commits follow Conventional Commits. No AI attribution or `Co-Authored-By`
  trailers.

## Known gaps (as of 2026-11-11)

- `#honorariosUsd` is rendered but never read by any calculation. Honorarios are
  not part of the total yet.
- Non-gravado rows are not persisted: reloading the page opens an empty table
  again and whatever was typed (including added rows) is lost.
- No automated tests. Verification is manual (see below).

## Manual verification checklist

1. Open `index.html`. Empty state: the non-gravado section is absent from the
   printout (no header, no subtotal row), the amount-in-words line stays blank and
   the totals read `$ 0,00`. Section 2, its minutas row and the totals **do**
   print: the page is a form, and only the concept list disappears.
2. Sanity check the math. Add three non-gravado rows first: sellos compraventa
   (`compra` `1`), aporte compraventa (`compra` `0.4`) and tasa compraventa
   (`compra` `0.2`). Then compra `100000`, TC `1000`, minutas `500000`.
   Expect sellos 1.000.000, aporte compra 400.000, tasa compra 200.000,
   subtotal no gravado 1.600.000, IVA 105.000, total 2.205.000, and
   `SON PESOS DOS MILLONES DOSCIENTOS CINCO MIL CON 00/100`.
3. Add a non-gravado row, set `% Hipoteca` `0.5` with a hipoteca of `60000` U$S
   at TC `1450`, and confirm the row shows 435.000 and the subtotal rises by that
   amount. Rename a concept, switch its base to `$ Fijo`, and delete a row: the
   subtotal must follow every change.
4. Fill a long detail text and confirm it prints complete.
5. `Ctrl+P`: one page only, black and white, no placeholders, no cut-off text,
   and the non-gravado rows print concept + amount only (no selector, no value
   input, no delete button, no "+ Agregar" row). With a long detail, up to 11
   non-gravado rows fit on one page; more than that legitimately spills to a
   second page.
