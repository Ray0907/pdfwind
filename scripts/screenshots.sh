#!/bin/sh
# Builds the README screenshots (docs/images/*.png) from the E2E outputs under out/. Run the E2E scripts first:
#   phase3a, phase3b1, phase3b2 (invoices, reports, blocks), phase4a (theme contact sheet), phase4b (Theme Builder), phase5 (showcase).
# Needs poppler (pdftoppm) and ImageMagick 7 (`magick`). No fonts are needed: tiles are laid out with plain -append, no labels.
set -e
cd "$(dirname "$0")/.."
command -v pdftoppm >/dev/null || { echo "screenshots.sh: pdftoppm (poppler) not found" >&2; exit 1; }
if ! command -v magick >/dev/null; then
  command -v convert >/dev/null || { echo "screenshots.sh: install ImageMagick (brew install imagemagick / apt-get install imagemagick)" >&2; exit 1; }
  magick() { convert "$@"; }
fi
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir -p docs/images
BG='#f4f4f5'; EDGE='#d4d4d8'

# pdf page -> png at 110 dpi: pageN <pdf> <page> <name>
pageN() { pdftoppm -r 110 -f "$2" -l "$2" -png -singlefile "$1" "$tmp/$3"; }
page1() { pageN "$1" 1 "$2"; }
# grid <columns> <cell WxH> <out.png> <in...>: every input is fitted into a cell, with a 1px edge and padding, rows joined with +append / -append
grid() {
  cols=$1; cell=$2; out=$3; shift 3
  n=0; row=0; rowfiles=""
  for f in "$@"; do
    magick "$f" -resize "$cell" -background "$BG" -gravity center -extent "$cell" -bordercolor "$EDGE" -border 1 -bordercolor "$BG" -border 14 "$tmp/cell-$n.png"
    rowfiles="$rowfiles $tmp/cell-$n.png"; n=$((n + 1))
    if [ $((n % cols)) -eq 0 ]; then magick $rowfiles +append "$tmp/row-$row.png"; row=$((row + 1)); rowfiles=""; fi
  done
  if [ -n "$rowfiles" ]; then # last, partial row: pad with empty cells so every row has the same width
    while [ $((n % cols)) -ne 0 ]; do magick -size "$cell" "xc:$BG" -bordercolor "$BG" -border 15 "$tmp/cell-$n.png"; rowfiles="$rowfiles $tmp/cell-$n.png"; n=$((n + 1)); done
    magick $rowfiles +append "$tmp/row-$row.png"; row=$((row + 1))
  fi
  rows=""; i=0; while [ $i -lt $row ]; do rows="$rows $tmp/row-$i.png"; i=$((i + 1)); done
  magick $rows -append "docs/images/$out"
}

for n in classic consultant corporate creative minimal modern; do page1 out/phase3a/$n.pdf inv-$n; done
grid 3 420x594 invoices.png $tmp/inv-classic.png $tmp/inv-modern.png $tmp/inv-corporate.png $tmp/inv-creative.png $tmp/inv-consultant.png $tmp/inv-minimal.png

for n in financial marketing operations security; do page1 out/phase3b1/report-$n.pdf rep-$n; done
grid 4 420x594 reports.png $tmp/rep-financial.png $tmp/rep-marketing.png $tmp/rep-operations.png $tmp/rep-security.png

page1 out/phase3b1/event-agenda.pdf b-agenda; page1 out/phase3b1/gift-certificate.pdf b-cert
for n in lesson-plan medical-intake-form meeting-minutes packing-slip press-release work-order; do page1 out/phase3b2/$n.pdf b-$n; done
grid 4 420x594 blocks.png $tmp/b-agenda.png $tmp/b-lesson-plan.png $tmp/b-medical-intake-form.png $tmp/b-meeting-minutes.png $tmp/b-packing-slip.png $tmp/b-press-release.png $tmp/b-work-order.png $tmp/b-cert.png

page1 out/phase3b1/event-ticket.pdf s-ticket; page1 out/phase3b2/shipping-label.pdf s-label
grid 2 620x420 small-formats.png $tmp/s-ticket.png $tmp/s-label.png

# components: the purpose-made showcase document (playground/demos.js "showcase"), default theme and dark theme (out/phase5/pdf/showcase-*.pdf)
for t in default dark; do pageN out/phase5/pdf/showcase-$t.pdf 1 sc-$t-1; pageN out/phase5/pdf/showcase-$t.pdf 2 sc-$t-2; done
grid 2 560x792 components.png $tmp/sc-default-1.png $tmp/sc-default-2.png
grid 2 560x792 components-dark.png $tmp/sc-dark-1.png $tmp/sc-dark-2.png

# themes contact sheet (phase4a) and the Theme Builder (phase4b)
magick out/phase4a/themes-invoice-modern.png -resize 1800x docs/images/themes.png
magick out/phase4b/builder-1280.png -resize 1500x docs/images/theme-builder.png

ls -la docs/images
