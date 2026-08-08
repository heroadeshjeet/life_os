"""Merge cover PDF + body PDF into the final Life_OS plan PDF."""
import os
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89  # A4 in points

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    # Tight tolerance to force normalization when cover is 0.6pt off
    if abs(w - A4_W) > 0.3 or abs(h - A4_H) > 0.3:
        page.scale_to(A4_W, A4_H)
    return page

def insert_cover(cover_pdf, body_pdf, output_pdf):
    writer = PdfWriter()
    cover_page = PdfReader(cover_pdf).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    for page in PdfReader(body_pdf).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': 'Life_OS v2.0 — Architecture & Migration Plan',
        '/Author': 'Adeshjeet_Official',
        '/Creator': 'Z.ai',
        '/Subject': 'Life_OS v2 planning document — architecture, schema, AI Counselor, streak system, migration roadmap',
    })
    with open(output_pdf, 'wb') as f:
        writer.write(f)

OUT_DIR = '/home/z/my-project/download'
COVER = os.path.join(OUT_DIR, '_life_os_cover.pdf')
BODY  = os.path.join(OUT_DIR, '_life_os_plan_body.pdf')
FINAL = os.path.join(OUT_DIR, 'Life_OS_v2_Architecture_and_Migration_Plan.pdf')

insert_cover(COVER, BODY, FINAL)

# Clean up intermediates
for p in (COVER, BODY):
    if os.path.exists(p):
        os.remove(p)

size_kb = os.path.getsize(FINAL) / 1024
pages = len(PdfReader(FINAL).pages)
print(f'[ok] final PDF: {FINAL}')
print(f'     pages: {pages}, size: {size_kb:.1f} KB')
