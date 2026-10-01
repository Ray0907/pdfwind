#!/bin/sh
# Builds the README screenshots from the E2E outputs. Run the e2e scripts first (they write out/).
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
page1() { pdftoppm -r 110 -f 1 -l 1 -png "$1" "$tmp/$2" && mv "$tmp/$2"-1.png "$tmp/$2.png" 2>/dev/null || mv "$tmp/$2"-01.png "$tmp/$2.png"; }
tile() { montage -font /System/Library/Fonts/Supplemental/Arial.ttf +label "$@" -tile "$T" -geometry "$G" -background '#f4f4f5' -bordercolor '#d4d4d8' -border 1 "docs/images/$OUT"; }

for n in classic consultant corporate creative minimal modern; do page1 out/phase3a/$n.pdf inv-$n; done
T=3x2 G=420x594+14+14 OUT=invoices.png tile $tmp/inv-classic.png $tmp/inv-modern.png $tmp/inv-corporate.png $tmp/inv-creative.png $tmp/inv-consultant.png $tmp/inv-minimal.png

for n in financial marketing operations security; do page1 out/phase3b1/report-$n.pdf rep-$n; done
T=4x1 G=420x594+14+14 OUT=reports.png tile $tmp/rep-financial.png $tmp/rep-marketing.png $tmp/rep-operations.png $tmp/rep-security.png

page1 out/phase3b1/event-agenda.pdf b-agenda; page1 out/phase3b1/gift-certificate.pdf b-cert
for n in lesson-plan medical-intake-form meeting-minutes packing-slip press-release work-order; do page1 out/phase3b2/$n.pdf b-$n; done
T=4x2 G=420x594+14+14 OUT=blocks.png tile $tmp/b-agenda.png $tmp/b-lesson-plan.png $tmp/b-medical-intake-form.png $tmp/b-meeting-minutes.png $tmp/b-packing-slip.png $tmp/b-press-release.png $tmp/b-work-order.png $tmp/b-cert.png

page1 out/phase3b1/event-ticket.pdf s-ticket; page1 out/phase3b2/shipping-label.pdf s-label
T=2x1 G=620x420+14+14 OUT=small-formats.png tile $tmp/s-ticket.png $tmp/s-label.png

T=3x2 G=420x594+14+14 OUT=components.png tile out/phase2a/heading-1.png out/phase2a/card-1.png out/phase2a/list-1.png out/phase2b/data-table-1.png out/phase2b/graph-1.png out/phase2b/form-1.png
ls -la docs/images
