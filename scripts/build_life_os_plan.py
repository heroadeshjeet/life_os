"""
Life_OS v2 Architecture & Migration Plan - PDF generator.

Outputs body PDF (ReportLab) with TOC + 15 content sections.
Cover is generated separately as HTML and merged via pypdf.
"""
import os
import sys
import hashlib
import subprocess
from pathlib import Path

# Add the pdf skill scripts dir so we can use install_font_fallback
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Image, HRFlowable, ListFlowable, ListItem, Preformatted,
    Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents

# ─────────────────────────────────────────────────────────────────────────────
# Cascade Palette (auto-generated, do NOT hand-pick colors)
# ─────────────────────────────────────────────────────────────────────────────
PAGE_BG       = colors.HexColor('#f4f4f2')
SECTION_BG    = colors.HexColor('#eeeeed')
CARD_BG       = colors.HexColor('#f1f0ee')
TABLE_STRIPE  = colors.HexColor('#f3f3f2')
HEADER_FILL   = colors.HexColor('#504a36')
COVER_BLOCK   = colors.HexColor('#857851')
BORDER        = colors.HexColor('#bbb7aa')
ICON          = colors.HexColor('#8d7b44')
ACCENT        = colors.HexColor('#92751f')
ACCENT_2      = colors.HexColor('#41a8ca')
TEXT_PRIMARY  = colors.HexColor('#242320')
TEXT_MUTED    = colors.HexColor('#797770')
SEM_SUCCESS   = colors.HexColor('#469761')
SEM_WARNING   = colors.HexColor('#9c8049')
SEM_ERROR     = colors.HexColor('#a35a54')
SEM_INFO      = colors.HexColor('#537aa1')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ─────────────────────────────────────────────────────────────────────────────
# Font registration
# ─────────────────────────────────────────────────────────────────────────────
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

try:
    from pdf import install_font_fallback
    install_font_fallback()
except Exception:
    pass

# ─────────────────────────────────────────────────────────────────────────────
# Styles
# ─────────────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    name='H1', fontName='FreeSerif-Bold', fontSize=20, leading=26,
    textColor=TEXT_PRIMARY, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT,
)
H2 = ParagraphStyle(
    name='H2', fontName='FreeSerif-Bold', fontSize=14, leading=20,
    textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6, alignment=TA_LEFT,
)
H3 = ParagraphStyle(
    name='H3', fontName='FreeSerif-Bold', fontSize=11.5, leading=16,
    textColor=ACCENT, spaceBefore=10, spaceAfter=4, alignment=TA_LEFT,
)
BODY = ParagraphStyle(
    name='Body', fontName='FreeSerif', fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8,
)
BODY_LEFT = ParagraphStyle(
    name='BodyLeft', fontName='FreeSerif', fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=8,
)
MUTED = ParagraphStyle(
    name='Muted', fontName='FreeSerif-Italic', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=6,
)
CODE = ParagraphStyle(
    name='Code', fontName='DejaVuSans', fontSize=8.5, leading=12,
    textColor=TEXT_PRIMARY, backColor=CARD_BG, borderColor=BORDER,
    borderWidth=0.5, borderPadding=8, leftIndent=4, rightIndent=4,
    spaceBefore=8, spaceAfter=12, alignment=TA_LEFT,
)
BULLET = ParagraphStyle(
    name='Bullet', fontName='FreeSerif', fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, leftIndent=18, bulletIndent=6, spaceAfter=4,
    alignment=TA_LEFT,
)
CALLOUT_TITLE = ParagraphStyle(
    name='CalloutTitle', fontName='FreeSerif-Bold', fontSize=10, leading=14,
    textColor=ACCENT, spaceAfter=4, alignment=TA_LEFT,
)
CALLOUT_BODY = ParagraphStyle(
    name='CalloutBody', fontName='FreeSerif', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
TOC_LEVEL0 = ParagraphStyle(
    name='TOC0', fontName='FreeSerif-Bold', fontSize=11, leading=18,
    textColor=TEXT_PRIMARY, leftIndent=0,
)
TOC_LEVEL1 = ParagraphStyle(
    name='TOC1', fontName='FreeSerif', fontSize=10, leading=15,
    textColor=TEXT_MUTED, leftIndent=16,
)

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def heading(text, style, level=0):
    """Heading with TOC bookmark."""
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def h1(text): return heading(text, H1, 0)
def h2(text): return heading(text, H2, 1)

def p(text, style=BODY): return Paragraph(text, style)
def muted(text): return Paragraph(text, MUTED)
def code(text): return Preformatted(text, CODE)

def bullet_list(items, style=BULLET):
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=18, value='•') for item in items],
        bulletType='bullet', bulletColor=ACCENT, leftIndent=18,
    )

def callout(title, body_text, color=ACCENT):
    """A subtle callout box."""
    tbl = Table(
        [[Paragraph(title, CALLOUT_TITLE)],
         [Paragraph(body_text, CALLOUT_BODY)]],
        colWidths=[160*mm], hAlign='CENTER',
    )
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 3, color),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return KeepTogether([tbl, Spacer(1, 12)])

def styled_table(data, col_widths=None, header=True):
    """Standard table with palette colors."""
    tbl = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1 if header else 0)
    cmds = [
        ('FONT', (0, 0), (-1, -1), 'FreeSerif', 9.5),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT_PRIMARY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
    ]
    if header:
        cmds += [
            ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
            ('FONT', (0, 0), (-1, 0), 'FreeSerif-Bold', 9.5),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [TABLE_ROW_EVEN, TABLE_ROW_ODD]),
        ]
    tbl.setStyle(TableStyle(cmds))
    return tbl

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=8, spaceAfter=8)

# ─────────────────────────────────────────────────────────────────────────────
# TocDocTemplate with header/footer
# ─────────────────────────────────────────────────────────────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def header_footer(canvas, doc):
    canvas.saveState()
    # Footer
    canvas.setFont('FreeSerif', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(doc.leftMargin, 12*mm, 'Life_OS v2.0  ·  Architecture & Migration Plan')
    canvas.drawRightString(A4[0] - doc.rightMargin, 12*mm, f'{doc.page}')
    # Top accent line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.4)
    canvas.line(doc.leftMargin, A4[1] - 12*mm, A4[0] - doc.rightMargin, A4[1] - 12*mm)
    canvas.restoreState()

# ─────────────────────────────────────────────────────────────────────────────
# Build story
# ─────────────────────────────────────────────────────────────────────────────
story = []

# --- TOC --------------------------------------------------------------------
toc = TableOfContents()
toc.levelStyles = [TOC_LEVEL0, TOC_LEVEL1]
story.append(Paragraph('Table of Contents', H1))
story.append(Spacer(1, 12))
story.append(toc)
story.append(PageBreak())

# ============================================================================
# 1. Executive Summary
# ============================================================================
story.append(h1('1. Executive Summary'))
story.append(p(
    'Life_OS is a personal life-management web application designed to help social-media '
    'and habit-addicted young people become the best version of themselves. It bundles '
    'a journal, task manager, exercise tracker, finance dashboard, meditation suite, '
    'secure vault, life manual, and an AI Counselor into a single, cohesive experience.'
))
story.append(p(
    'Today, Life_OS exists as nine standalone HTML files totalling roughly 10,800 lines of code. '
    'Each file was built independently: they share no data layer, no authentication system, '
    'no design language, and no navigation. Ten of the twelve launcher links are broken. '
    'The vault stores its PIN in plaintext. The launcher\'s Notes and Calendar panels lose '
    'all data on refresh. There is no AI anywhere. The product feels less like "an app that '
    'manages your life" and more like "nine apps wearing the same name badge" — which '
    'undermines the entire premise.'
))
story.append(p(
    'This document proposes Life_OS v2.0: a single Next.js 16 Progressive Web App with '
    'on-device encrypted IndexedDB storage, a master password that unlocks every module, '
    'a unified dashboard with a streak system and a "Day-in-Life" calendar, a hybrid AI '
    'Counselor that reads user context before responding, an expanded exercise library '
    'beyond today\'s full-body and six-pack plans, browser-based focus mode for '
    'anti-distraction, and one-click encrypted data export and import. The build is '
    'scoped for 8 to 10 weeks of part-time work (10 to 15 hours per week) and starts '
    'with a fresh Next.js scaffold rather than refactoring the existing files in place.'
))
story.append(callout(
    'Headline decisions',
    '<b>Tech stack:</b> Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Dexie (IndexedDB) + next-pwa. '
    '<b>Storage:</b> 100 percent on-device, AES-GCM encrypted with a master-password-derived key. '
    '<b>Counselor:</b> Hybrid — local rule engine for quick intents, cloud LLM (via server-side proxy) for deep reflection. '
    '<b>v2 scope:</b> Master password, unified dashboard, AI Counselor, water tracking, focus mode, one-click backup, streak calendar, expanded exercise library. '
    '<b>Timeline:</b> 8 to 10 weeks at 10 to 15 hours per week.',
))

# ============================================================================
# 2. Current State Diagnosis
# ============================================================================
story.append(h1('2. Current State Diagnosis'))
story.append(p(
    'A line-by-line audit of the nine existing HTML files reveals a project that grew '
    'organically, one app at a time, with no shared foundation. Each file is a '
    'self-contained single-page application with its own styling, its own storage keys, '
    'its own modal and toast implementations, and frequently its own authentication. '
    'The table below summarises the state of each file as found in August 2026.'
))

audit_data = [
    ['File', 'App Name', 'Storage Key', 'Auth', 'Lines'],
    ['launch.html', 'Life OS Launcher', '(in-memory only)', 'None', '1,049'],
    ['dd.html', 'Inkwell', 'inkwell_*  +  Firebase', 'Firebase', '766'],
    ['finance.html', 'Financia', 'Financia_*', 'SHA-256 key', '2,573'],
    ['taskiee.html', 'Taskiee', 'taskiee_v2_db', 'None', '932'],
    ['Life_manual.html', 'Life_OS Manual', 'life_os_v1', 'None', '1,418'],
    ['meditation_zone.html', 'Aura', 'aura_*', 'None', '1,123'],
    ['exercise.html', 'Full Body Workout', 'fbw_state', 'None', '1,286'],
    ['vault.html', 'LifeOS Vault', 'lifeos_vault_data (PIN plaintext)', '4-digit PIN', '1,157'],
    ['index.html', 'Exerciness', '(broken: missing app.js)', 'None', '477'],
    ['TOTAL', '9 apps', '8 incompatible prefixes', '3 systems', '10,781'],
]
story.append(styled_table(audit_data, col_widths=[36*mm, 32*mm, 42*mm, 25*mm, 18*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 1. Audit of the nine existing Life_OS HTML files.'))

story.append(h2('2.1 Critical issues found'))
story.append(bullet_list([
    '<b>Broken navigation:</b> 10 of 12 launcher links point to nonexistent subdirectory paths (e.g. ./dd/dd.html) because all files actually live flat in one folder.',
    '<b>Eight incompatible localStorage prefixes:</b> inkwell_, Financia_, taskiee_, life_os_v1, aura_, fbw_state, lifeos_vault_data, plus the launcher\'s unpersisted notes. Zero cross-app data sharing.',
    '<b>Three incompatible auth systems:</b> Firebase (dd.html), SHA-256 secret key (finance.html), and a 4-digit PIN stored in plaintext (vault.html). A user signed into one is unknown to any other.',
    '<b>Two overlapping exercise apps:</b> index.html (Exerciness — 30-day six-pack plan, currently broken) and exercise.html (Full Body Workout — 12 exercises with water tracking). Both compete for the same user need.',
    '<b>Four different navigation patterns:</b> bottom tabs (dd, finance, taskiee), sidebar (meditation_zone, vault), scroll-spy (Life_manual), launcher grid (launch). No back-to-launcher button anywhere.',
    '<b>Two styling systems:</b> hand-rolled CSS in seven files vs Tailwind CDN in two. Every file ships its own modal, toast, and color palette.',
    '<b>Security gaps:</b> vault.html PIN is stored as plaintext in localStorage. Anti-debugging boilerplate is copy-pasted into seven files (and twice into finance.html) yet provides no real protection.',
    '<b>No AI:</b> The "Counselor" feature does not exist. All "tips" and "prompts" are static arrays of 17 to 20 hardcoded strings.',
    '<b>No PWA:</b> No service worker, no manifest, no offline support, no install prompt.',
    '<b>Data loss bug:</b> launch.html\'s Notes and Calendar panels store data only in JavaScript variables, so every page refresh wipes them.',
]))

# ============================================================================
# 3. Vision & Principles
# ============================================================================
story.append(h1('3. Vision & Principles'))
story.append(p(
    'Life_OS exists for one audience: young people who know that social media and '
    'dopamine-loop habits are quietly hollowing out their attention, their health, '
    'their finances, and their self-image — and who want a tool that helps them build '
    'back, day by day, the disciplines that compound into a good life. The product is '
    'not a habit tracker, not a journal, not a finance app; it is the connective tissue '
    'between all of those, paired with an AI Counselor that actually knows the user. '
    'Six principles guide every design decision in v2.'
))

story.append(h2('3.1 One app, not nine'))
story.append(p(
    'The user should never feel like they are switching contexts. A single persistent shell '
    'holds the sidebar, the theme, the auth state, and the currently active module. Switching '
    'from journaling to checking the budget should feel like turning a page, not opening a '
    'different product. This principle is the direct response to the v1 fragmentation: nine '
    'self-contained HTML files cannot, by construction, deliver a unified experience.'
))

story.append(h2('3.2 Privacy by default'))
story.append(p(
    'User data — journals, moods, finances, vault contents, meditation history — never leaves '
    'the device unless the user explicitly opts into cloud sync (a future feature). The local '
    'IndexedDB database is encrypted with a key derived from the user\'s master password, so '
    'even physical access to the device cannot read the data. This matches the promise already '
    'made in Life_manual.html: "Everything stays in your browser. Nothing is sent anywhere." '
    'v2 honours that promise cryptographically, not just verbally.'
))

story.append(h2('3.3 The Counselor earns trust by reading context, not by hallucinating'))
story.append(p(
    'The Counselor is not a generic chatbot bolted onto the side. Before responding, it pulls '
    'the user\'s recent journals, moods, exercise adherence, spending trends, and task completion '
    'into a structured context window — and the UI shows this happening ("Reading your last '
    'three journal entries... Reviewing this week\'s spending..."). The model is grounded in '
    'specific user data, cites it in responses, and falls back to "I don\'t know" rather than '
    'inventing facts. Trust is the product.'
))

story.append(h2('3.4 Streaks and the Day-in-Life calendar create emotional gravity'))
story.append(p(
    'Habit apps fail when they feel like homework. Life_OS succeeds when the user opens the app '
    'not because they have to, but because they want to see their streak grow and flip through '
    'past days like a photo album. Every tracked action — a journal entry, a workout, a glass of '
    'water, a completed task, a meditation session — contributes to that day\'s streak score. '
    'Click any past date on the calendar and see everything you did that day: which exercises, '
    'how many water glasses, the journal excerpt, the mood, the spending. This is the "force '
    'that attracts the user towards the app" the original brief asked for.'
))

story.append(h2('3.5 Progressive disclosure: simple surface, deep capability'))
story.append(p(
    'A new user sees only the dashboard, the Counselor, and a few primary modules. Power '
    'features — custom exercise plans, budget categories, vault trusted contacts, Counselor '
    'system prompts — are tucked behind settings and revealed as the user explores. The app '
    'should feel light on day one and gain depth over weeks of use, not overwhelm on first '
    'launch. This principle directly addresses the v1 problem where each module\'s UI was '
    'designed in isolation and never simplified for first-time use.'
))

story.append(h2('3.6 Web-first so it works everywhere'))
story.append(p(
    'A native Android app could block social media more aggressively (the original black-and-white '
    'screen idea), but it locks the product to one platform and consumes significant battery for '
    'always-on monitoring. A Progressive Web App installs on Android, iOS, and desktop, works '
    'offline, and updates instantly without an app-store review. The trade-off — softer '
    'anti-distraction features — is acceptable because the Counselor\'s behavioural nudges, '
    'combined with the streak system, can achieve most of the same outcome without OS-level '
    'surveillance.'
))

# ============================================================================
# 4. Technology Stack Decisions
# ============================================================================
story.append(h1('4. Technology Stack Decisions'))
story.append(p(
    'The choice to move from vanilla HTML/CSS/JS to Next.js is the single most consequential '
    'decision in this plan, and it deserves an honest justification rather than a buzzword '
    'defence. The comparison table below shows how each v2 goal maps to the two realistic '
    'options: stay in vanilla with shared Web Components, or commit to Next.js as a PWA.'
))

stack_data = [
    ['v2 Goal', 'Vanilla JS + Web Components', 'Next.js + PWA'],
    ['Unified master password', 'Hand-rolled, repeated per page', 'Middleware + session, written once'],
    ['AI Counselor with cross-module data', 'Painful — each page loads its own slice', 'Server route reads from one DB'],
    ['Cross-module dashboard tracker', 'Hand-rolled state sync via storage events', 'React Context + Server Components'],
    ['One-click data export/import', 'Each module needs its own exporter', 'One API route dumps everything'],
    ['Offline use', 'Manual service worker per file', 'next-pwa does it in five lines'],
    ['Installable on phone', 'Possible but clunky', 'PWA install prompt out of the box'],
    ['New feature velocity', 'Each feature = new file, new boilerplate', 'Each feature = new component in shared shell'],
    ['Type safety on finance + vault data', 'None — runtime bugs only', 'TypeScript catches 80 percent before runtime'],
]
story.append(styled_table(stack_data, col_widths=[55*mm, 55*mm, 55*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 2. Vanilla JS vs Next.js across the eight v2 goals.'))

story.append(h2('4.1 The "comfortable with vanilla" trap'))
story.append(p(
    'The current comfort with vanilla HTML/CSS/JS is exactly why the app is fragmented. Every '
    'new module starts by copy-pasting a fresh HTML file, then re-doing the auth, the storage, '
    'the modal system, the toast system, and the lock screen — and ends up as a ninth incompatible '
    'version. A framework eliminates that copy-paste tax permanently. There is a one-to-two-week '
    'learning curve if React is unfamiliar, but that cost is paid once and saves multiples of '
    'itself within the first month of development.'
))

story.append(h2('4.2 Chosen libraries'))
story.append(bullet_list([
    '<b>Next.js 16 (App Router):</b> one codebase, deploys anywhere, file-system routing, server components for the Counselor route.',
    '<b>TypeScript:</b> non-negotiable for a finance and vault app — type errors caught at compile time are bugs that never ship.',
    '<b>Tailwind CSS 4:</b> already half-familiar from Life_manual.html and vault.html; eliminates the duplicated CSS variables across files.',
    '<b>shadcn/ui:</b> free, accessible, copy-paste components (modals, tabs, toasts, dialogs) so development stops re-writing them per module.',
    '<b>Dexie.js (IndexedDB wrapper):</b> structured queries, transactions, and live observability — far beyond what localStorage can offer, with a clean TypeScript API.',
    '<b>next-pwa:</b> service worker generation, manifest, offline fallback, install prompt — all configured in next.config.js.',
    '<b>z-ai-web-dev-sdk:</b> server-side LLM calls for the Counselor; API key stays on the server, never exposed to the browser.',
    '<b>tRPC or Server Actions:</b> for type-safe data mutations between client and server (chosen at Phase 5 when the Counselor lands).',
]))

# ============================================================================
# 5. System Architecture
# ============================================================================
story.append(h1('5. System Architecture'))
story.append(p(
    'Life_OS v2 is organised in four layers, each depending only on the layer below it. '
    'Modules never import from each other directly; they communicate exclusively through '
    'the shared data layer. This is what makes the system cohesive rather than nine silos '
    'in a shared layout.'
))

story.append(h2('5.1 Layered overview'))
story.append(code(
    '┌─────────────────────────────────────────────────────────────┐\n'
    '│                  Shell Layer                                 │\n'
    '│  Sidebar · Topbar · Theme · Auth context · Focus mode       │\n'
    '└─────────────────────────────────────────────────────────────┘\n'
    '         │              │              │             │\n'
    '    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐\n'
    '    │Journal  │    │Tasks    │    │Exercise │   │Finances │\n'
    '    │+ Moods  │    │+ Remind │    │+ Water  │   │+ Budget │\n'
    '    └─────────┘    └─────────┘    └─────────┘   └─────────┘\n'
    '    ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌─────────┐\n'
    '    │Meditate │    │ Vault   │    │Counselor│   │Settings │\n'
    '    │+ Focus  │    │(encrypt)│   │  (AI)   │   │(import/ │\n'
    '    └─────────┘    └─────────┘    └─────────┘   │ export) │\n'
    '                                                  └─────────┘\n'
    '         │                                              │\n'
    '    ┌────┴──────────────────────────────────────────────┴────┐\n'
    '    │           Unified Data Layer (Dexie + IndexedDB)         │\n'
    '    │  Encrypted with master-password-derived AES-GCM key      │\n'
    '    └──────────────────────────────────────────────────────────┘\n'
    '                          │\n'
    '    ┌─────────────────────┴──────────────────────────────────┐\n'
    '    │   AI Layer (server routes, never expose API key)         │\n'
    '    │   Hybrid: local rule engine + cloud LLM fallback         │\n'
    '    └──────────────────────────────────────────────────────────┘'
))

story.append(h2('5.2 How modules communicate'))
story.append(p(
    'A module never reads another module\'s tables directly. Instead, each module writes only '
    'to its own tables and to the shared <font name="DejaVuSans">day_in_life_rollups</font> table '
    '(see section 6). The dashboard reads from rollups; the Counselor reads from rollups and '
    'recent raw entries. This isolation means a bug in the Finances module cannot corrupt the '
    'Journal, and a schema migration in Tasks does not require changes in Meditation.'
))

story.append(h2('5.3 The shell as the only persistent UI'))
story.append(p(
    'The shell renders once and never unmounts. It owns the sidebar, the top bar (with the '
    'master-password lock state, the streak counter, and the focus-mode toggle), the theme '
    'provider, the notification permission state, and the global toast/modal container. Modules '
    'mount inside an outlet and may use any of the shell\'s services via React Context. When '
    'the user switches from Journal to Finances, only the outlet\'s content changes — the '
    'sidebar, theme, and lock state persist without a flicker.'
))

# ============================================================================
# 6. Data Schema
# ============================================================================
story.append(h1('6. Data Schema (Dexie / IndexedDB)'))
story.append(p(
    'All persistent data lives in a single Dexie database named <font name="DejaVuSans">life_os</font>. '
    'Sensitive tables (journals, vault_items, transactions, moods) are stored as encrypted blobs; '
    'non-sensitive tables (user_profile, exercise_plans, categories) are stored in plaintext for '
    'faster queries. The schema below is the v2.0 target; migrations are versioned via Dexie\'s '
    'built-in versioning.'
))

story.append(h2('6.1 Tables'))
schema_data = [
    ['Table', 'Purpose', 'Encrypted'],
    ['user_profile', 'Name, avatar, joined_at, preferences, recovery_code_hash', 'No (metadata)'],
    ['journals', 'Daily diary entries with rich-text HTML, mood_id, gratitude', 'Yes'],
    ['moods', 'Per-entry mood (emoji, intensity 1-5, tags)', 'Yes'],
    ['tasks', 'Todo items with due_at, reminder_at, completed_at, priority', 'No'],
    ['exercise_plans', 'Reusable plans: name, category, list of exercises', 'No'],
    ['exercise_sessions', 'Per-workout logs: plan_id, started_at, ended_at, sets[], total_volume', 'No'],
    ['water_logs', 'Per-day water intake in ml, with timestamps', 'No'],
    ['transactions', 'Income/expense: amount, category_id, type, date, note', 'Yes'],
    ['categories', 'User-defined finance categories: name, emoji, color, kind', 'No'],
    ['budgets', 'Monthly budget per category: limit, period, current_spend (computed)', 'No'],
    ['vault_items', 'Documents, images, files, cards, notes, contacts — stored as encrypted blobs', 'Yes'],
    ['meditation_sessions', 'Started_at, ended_at, type (breath/focus/pomodoro), duration_s', 'No'],
    ['habits', 'User-defined habits with cadence and current streak', 'No'],
    ['streak_days', 'Per-date rollup: date, score, activities_completed (json)', 'No'],
    ['day_in_life_rollups', 'Per-date summary: exercise, water, mood, journal, tasks, spending', 'No'],
    ['counselor_conversations', 'Threaded messages: role, content, context_snapshot, created_at', 'Yes'],
]
story.append(styled_table(schema_data, col_widths=[42*mm, 90*mm, 25*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 3. Dexie tables for Life_OS v2.0.'))

story.append(h2('6.2 Dexie schema definition'))
story.append(code(
    '// lib/db/schema.ts\n'
    'import Dexie, { Table } from "dexie";\n'
    '\n'
    'export class LifeOSDB extends Dexie {\n'
    '  user_profile!: Table<UserProfile>;\n'
    '  journals!: Table<Journal>;\n'
    '  moods!: Table<Mood>;\n'
    '  tasks!: Table<Task>;\n'
    '  exercise_plans!: Table<ExercisePlan>;\n'
    '  exercise_sessions!: Table<ExerciseSession>;\n'
    '  water_logs!: Table<WaterLog>;\n'
    '  transactions!: Table<Transaction>;\n'
    '  categories!: Table<Category>;\n'
    '  budgets!: Table<Budget>;\n'
    '  vault_items!: Table<VaultItem>;\n'
    '  meditation_sessions!: Table<MeditationSession>;\n'
    '  habits!: Table<Habit>;\n'
    '  streak_days!: Table<StreakDay>;\n'
    '  day_in_life_rollups!: Table<DayInLife>;\n'
    '  counselor_conversations!: Table<CounselorMessage>;\n'
    '\n'
    '  constructor() {\n'
    '    super("life_os");\n'
    '    this.version(1).stores({\n'
    '      user_profile:            "id",\n'
    '      journals:                "id, date, mood_id, created_at",\n'
    '      moods:                   "id, journal_id, intensity, created_at",\n'
    '      tasks:                   "id, due_at, completed_at, priority",\n'
    '      exercise_plans:          "id, category, name",\n'
    '      exercise_sessions:       "id, plan_id, started_at",\n'
    '      water_logs:              "id, date",\n'
    '      transactions:            "id, category_id, type, date",\n'
    '      categories:              "id, kind, name",\n'
    '      budgets:                 "id, category_id, period",\n'
    '      vault_items:             "id, kind, created_at",\n'
    '      meditation_sessions:     "id, type, started_at",\n'
    '      habits:                  "id, cadence, current_streak",\n'
    '      streak_days:             "date, score",\n'
    '      day_in_life_rollups:     "date",\n'
    '      counselor_conversations: "id, thread_id, role, created_at",\n'
    '    });\n'
    '  }\n'
    '}\n'
    '\n'
    'export const db = new LifeOSDB();'
))

story.append(h2('6.3 The "Day-in-Life" rollup table'))
story.append(p(
    'The <font name="DejaVuSans">day_in_life_rollups</font> table is the magic that powers the '
    'streak calendar\'s click-through feature. Every time a user completes any tracked action — '
    'writes a journal entry, logs a workout, drinks a glass of water, completes a task, finishes '
    'a meditation session, records a transaction — a background worker updates that date\'s rollup '
    'row. The row stores a compact JSON summary: which exercises were done, total water in ml, '
    'mood of the day, journal excerpt (first 200 characters), tasks completed count, total '
    'spending, and a streak score from 0 to 100. When the user clicks any past date on the '
    'streak calendar, the UI reads a single row and renders the full day summary in under 50 '
    'milliseconds — no joins, no aggregation, no waiting.'
))
story.append(callout(
    'Why this matters',
    'The rollup table trades a small amount of write amplification (every action updates two '
    'tables instead of one) for massive read performance and a dramatically simpler UI. Without '
    'it, opening a past date would require five separate IndexedDB queries across journals, '
    'moods, exercise_sessions, water_logs, transactions, and tasks — each with its own date '
    'filter — and the calendar would feel sluggish. With it, the calendar feels instant, which '
    'is the difference between a feature the user loves and one they stop using.',
))

# ============================================================================
# 7. Master Password & Encryption
# ============================================================================
story.append(h1('7. Master Password & Encryption'))
story.append(p(
    'The master password replaces the three incompatible auth systems in v1 (Firebase, '
    'SHA-256 secret key, plaintext PIN) with a single, cryptographically sound scheme. '
    'The user sets one master password on first launch. That password never touches storage '
    'in any form — instead, it derives an encryption key that wraps a per-install random data '
    'encryption key (DEK), and the DEK encrypts the sensitive IndexedDB tables.'
))

story.append(h2('7.1 Key derivation and wrapping'))
story.append(p(
    'The design uses PBKDF2 with 200,000 iterations of SHA-256 to derive a 256-bit key '
    'encryption key (KEK) from the master password. A random 256-bit DEK is generated at '
    'first launch and wrapped (encrypted) with the KEK using AES-GCM. The wrapped DEK and '
    'the PBKDF2 salt are stored in plaintext — they are useless without the master password. '
    'A separate verifier hash (different salt, fewer iterations) lets the app check whether '
    'the user typed the right password without storing the password itself.'
))

story.append(code(
    '// lib/crypto/master-key.ts\n'
    'const PBKDF2_ITERATIONS = 200_000;\n'
    'const SALT_LENGTH   = 16;  // bytes\n'
    'const KEY_LENGTH    = 32;  // 256 bits\n'
    'const IV_LENGTH     = 12;  // AES-GCM standard\n'
    '\n'
    'export async function deriveKEK(password: string, salt: Uint8Array) {\n'
    '  const baseKey = await crypto.subtle.importKey(\n'
    '    "raw", new TextEncoder().encode(password),\n'
    '    "PBKDF2", false, ["deriveKey"]\n'
    '  );\n'
    '  return crypto.subtle.deriveKey(\n'
    '    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },\n'
    '    baseKey,\n'
    '    { name: "AES-GCM", length: 256 },\n'
    '    false,  // not extractable\n'
    '    ["wrapKey", "unwrapKey", "encrypt", "decrypt"]\n'
    '  );\n'
    '}\n'
    '\n'
    'export async function setupMasterPassword(password: string) {\n'
    '  const salt   = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));\n'
    '  const dek    = await crypto.subtle.generateKey(\n'
    '    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]\n'
    '  );\n'
    '  const kek    = await deriveKEK(password, salt);\n'
    '  const iv     = crypto.getRandomValues(new Uint8Array(IV_LENGTH));\n'
    '  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv });\n'
    '  return { salt, iv, wrapped };\n'
    '}'
))

story.append(h2('7.2 Auto-lock and recovery'))
story.append(p(
    'The unwrapped DEK lives only in memory, in a closure that the shell controls. After five '
    'minutes of inactivity (configurable down to one minute, up to thirty), the shell drops the '
    'DEK reference and shows the lock screen — the user must re-enter the master password to '
    'continue. Because the DEK never persists, an attacker with the device after auto-lock '
    'cannot read the encrypted tables.'
))
story.append(p(
    'Recovery from a forgotten master password is honest: it is impossible. There is no server, '
    'no backdoor, no email reset — by design, because any recovery path is also an attack path. '
    'To soften this, the setup flow generates a one-time recovery code (24 random words) that '
    'the user is asked to write down and store offline. The code can decrypt the wrapped DEK '
    'via a parallel PBKDF2 derivation. If the user loses both the password and the code, the '
    'data is gone. The setup UI repeats this warning three times.'
))

story.append(h2('7.3 Comparison to v1'))
v1v2_data = [
    ['Aspect', 'v1 (today)', 'v2 (target)'],
    ['Auth systems', '3 incompatible (Firebase, SHA-256, plaintext PIN)', '1 master password'],
    ['Password storage', 'Plaintext PIN in localStorage; Firebase token in localStorage', 'Wrapped DEK + salt; password never stored'],
    ['Cross-module SSO', 'None — sign in 3 times', 'Yes — unlock once, use everywhere'],
    ['Auto-lock', 'Only in vault.html', 'App-wide, configurable'],
    ['Recovery', 'Firebase email reset; others none', 'One-time 24-word code shown at setup'],
    ['Crypto primitive', 'SHA-256 (hash only, no encryption)', 'PBKDF2 + AES-GCM (industry standard)'],
]
story.append(styled_table(v1v2_data, col_widths=[35*mm, 65*mm, 60*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 4. Auth and encryption: v1 vs v2.'))

# ============================================================================
# 8. Unified Dashboard & Streak System
# ============================================================================
story.append(h1('8. Unified Dashboard & Streak System'))
story.append(p(
    'The dashboard is the home screen — the first thing the user sees after unlocking. It '
    'replaces the nine siloed homepages of v1 with a single, information-dense view that '
    'pulls from every module via the day_in_life_rollups table. The design goal is simple: '
    'a glance at the dashboard should tell the user both "what am I doing today?" and "how '
    'am I trending?" in under five seconds.'
))

story.append(h2('8.1 Dashboard widgets'))
story.append(bullet_list([
    '<b>Today\'s tasks:</b> top three priority tasks for today, with quick-complete checkboxes. Pulled from the tasks table where due_at is today and completed_at is null.',
    '<b>Water ring:</b> an SVG progress ring showing today\'s water intake vs the user\'s daily goal (default 2.5 litres). Tap to add 250 ml.',
    '<b>Workout of the day:</b> today\'s scheduled exercise session from the active plan, with a one-tap "start" button.',
    '<b>Mood graph (7-day):</b> a small line chart of mood intensity over the past week, with the emoji for each day. Tapping a point opens that day\'s journal.',
    '<b>Spending vs budget:</b> this month\'s total spend vs the total budget, with a thin bar showing percentage used.',
    '<b>Meditation streak:</b> current consecutive days of at least one meditation session, with the longest streak shown as a target.',
    '<b>Counselor\'s daily note:</b> a short, AI-generated one-paragraph reflection based on yesterday\'s data. Tapping opens the Counselor chat.',
    '<b>Streak counter:</b> the headline number — consecutive days with at least one tracked activity. Loss aversion does the rest.',
]))

story.append(h2('8.2 The streak system'))
story.append(p(
    'A "streak day" is any calendar date on which the user completed at least one tracked '
    'activity. Tracked activities are: writing a journal entry, completing at least one task, '
    'logging a workout, meeting the water goal, finishing a meditation session, or hitting '
    'a habit target. Each activity contributes points to that day\'s streak score (out of 100), '
    'so a day with all six is a "perfect 100" and a day with just a journal entry might be a 20. '
    'The streak counter itself counts consecutive days with a score above zero — a low bar, '
    'deliberately, so the user never feels the streak is unreachable.'
))

story.append(h2('8.3 The Day-in-Life calendar'))
story.append(p(
    'Below the dashboard widgets sits a monthly calendar grid. Each day cell shows the streak '
    'score as a small coloured square (white = no activity, pale = low score, deep accent = '
    'high score). Clicking any date — past, present, or future — opens a modal that reads '
    'the day_in_life_rollups row for that date and renders a full day summary:'
))
story.append(bullet_list([
    'Which exercises were done, with sets, reps, and total volume.',
    'How many glasses of water, with the timestamps of each log.',
    'The mood of the day, with intensity and tags.',
    'The first 200 characters of that day\'s journal entry, with a "read full entry" link.',
    'Tasks completed that day, with completion timestamps.',
    'Total spending that day, broken down by category.',
    'Any meditation sessions, with type and duration.',
    'The day\'s streak score, with a breakdown of which activities contributed.',
]))
story.append(p(
    'This is the emotional core of the product. The user opens the app not because they have '
    'to log something, but because they want to see their streak grow and flip through past '
    'days like a photo album of their life. That is the "force that attracts the user towards '
    'the app" the original brief asked for — and it is built on a single Dexie table.'
))

# ============================================================================
# 9. AI Counselor (Hybrid)
# ============================================================================
story.append(h1('9. AI Counselor Design (Hybrid)'))
story.append(p(
    'The Counselor is the differentiator. It is not a generic chatbot; it is a hybrid system '
    'that grounds every response in the user\'s actual data. Two tiers handle different '
    'classes of intent: a local rule engine for quick, deterministic responses, and a cloud '
    'LLM (via a server-side route) for deep reflection and open-ended advice. The split keeps '
    'API costs low (most messages never hit the cloud) while preserving quality for the '
    'moments that matter.'
))

story.append(h2('9.1 Tier 1: Local rule engine'))
story.append(p(
    'A lightweight intent classifier runs entirely in the browser, with no network call. It '
    'handles greetings, mood check-ins, simple finance queries ("how much did I spend this '
    'week?"), habit nudges ("did I meditate today?"), and streak queries. Responses are '
    'template-based but populated with real data from Dexie. The rule engine responds in '
    'under 50 milliseconds, works offline, and costs nothing.'
))

story.append(h2('9.2 Tier 2: Cloud LLM with context grounding'))
story.append(p(
    'When the user asks something open-ended — "how am I doing this month?", "I\'m feeling '
    'stuck, what should I do?", "reflect on my recent journals" — the request escalates to '
    'a server-side Next.js route. The route builds a context window by pulling from Dexie '
    '(via a server-side Dexie instance or a serialised snapshot sent from the client), then '
    'calls the LLM with a grounded system prompt. The API key never leaves the server.'
))

story.append(h2('9.3 The context builder'))
story.append(code(
    '// app/api/counselor/route.ts  (server-side, API key stays here)\n'
    'import { buildContext } from "@/lib/counselor/context";\n'
    'import { callLLM } from "@/lib/counselor/llm";\n'
    '\n'
    'export async function POST(req: Request) {\n'
    '  const { message, threadId } = await req.json();\n'
    '\n'
    '  // 1. Pull user context from Dexie (server-side snapshot)\n'
    '  const context = await buildContext({\n'
    '    moods:        { days: 7 },  // last 7 days of moods\n'
    '    journals:     { count: 3 }, // last 3 journal entries\n'
    '    exercise:     { days: 7 },  // this week\'s sessions\n'
    '    spending:     { days: 30 }, // recent spending vs budget\n'
    '    tasks:        { days: 7, completedOnly: true },\n'
    '    meditation:   { days: 7 },\n'
    '    streak:       true,         // current streak + 7-day trend\n'
    '  });\n'
    '\n'
    '  // 2. Build grounded system prompt\n'
    '  const system = `\n'
    'You are the Life_OS Counselor. You are talking to a real user about THEIR life.\n'
    'Below is their actual data from the past week. Cite specific entries when relevant.\n'
    'If you don\'t know something, say so — never invent facts about the user.\n'
    'Keep responses under 200 words unless asked for detail.\n'
    '\n'
    '=== USER CONTEXT ===\n'
    '${context.serialize()}\n'
    '=== END CONTEXT ===\n'
    '`;\n'
    '\n'
    '  // 3. Call LLM and stream response back\n'
    '  const reply = await callLLM({ system, userMessage: message, threadId });\n'
    '  return Response.json({ reply, contextUsed: context.summary });\n'
    '}'
))

story.append(h2('9.4 The "thinking" UI'))
story.append(p(
    'When the Counselor is processing a Tier 2 request, the chat UI shows live "thinking" '
    'steps as the context builder runs: "Reading your last three journal entries...", '
    '"Reviewing this week\'s spending...", "Checking your exercise adherence...", '
    '"Reflecting...". Each step appears for 400 to 800 milliseconds. This is not a fake '
    'loading animation — the steps correspond to real DB queries — but the visible pacing '
    'builds trust. The user sees that the Counselor is reading their actual data before '
    'responding, not just generating plausible-sounding text. This single design choice is '
    'what separates the Counselor from every other chatbot the user has interacted with.'
))

story.append(h2('9.5 Intent router (pseudocode)'))
story.append(code(
    '// lib/counselor/router.ts\n'
    'export function route(message: string): "local" | "cloud" {\n'
    '  const m = message.toLowerCase();\n'
    '\n'
    '  // Tier 1: deterministic intents — handle locally\n'
    '  if (/\\b(hi|hello|hey|good morning|good night)\\b/.test(m))        return "local";\n'
    '  if (/\\b(spent|spending|expense|budget)\\b/.test(m)\n'
    '      && m.length < 60)                                           return "local";\n'
    '  if (/\\b(did i (meditate|workout|journal|drink)).*today\\b/.test(m)) return "local";\n'
    '  if (/\\b(streak|how many days)\\b/.test(m))                        return "local";\n'
    '  if (/\\b(mood|feeling)\\b/.test(m) && m.length < 80)               return "local";\n'
    '\n'
    '  // Tier 2: everything else — escalate to cloud\n'
    '  return "cloud";\n'
    '}'
))

# ============================================================================
# 10. Expanded Exercise Library
# ============================================================================
story.append(h1('10. Expanded Exercise Library'))
story.append(p(
    'v1 ships two overlapping exercise apps: index.html (Exerciness, a 30-day six-pack plan, '
    'currently broken) and exercise.html (Full Body Workout, 12 exercises with water tracking). '
    'v2 replaces both with a single structured exercise module organised by category. Each '
    'category has 4 to 6 sample exercises with sensible rep, set, and time defaults. Users '
    'can pick a pre-built plan or build a custom one.'
))

story.append(h2('10.1 Categories and sample exercises'))
exercise_data = [
    ['Category', 'Sample Exercises', 'Default Tracking'],
    ['Strength — Upper', 'Push-up, Pull-up, Bench dip, Pike push-up, Incline row', 'Sets × Reps × Weight'],
    ['Strength — Lower', 'Squat, Lunge, Calf raise, Glute bridge, Wall sit', 'Sets × Reps × Weight'],
    ['Strength — Core', 'Plank, Crunch, Russian twist, Leg raise, Six-pack day', 'Sets × Reps or Time'],
    ['Strength — Full Body', 'Burpee, Kettlebell swing, Thruster, Man-maker', 'Sets × Reps × Weight'],
    ['Cardio', 'Running, Cycling, Rowing, Jump rope, Stairs', 'Time × Distance × HR'],
    ['HIIT', 'Tabata, 30/30 intervals, EMOM, AMRAP, Circuit', 'Time × Rounds'],
    ['Mobility', 'Hip opener, Cat-cow, World\'s greatest stretch, Pigeon', 'Time per side'],
    ['Yoga', 'Sun salutation, Vinyasa flow, Yin sequence, Restorative', 'Time × Sequence'],
    ['Skill', 'Handstand hold, Planche progression, Muscle-up drill, L-sit', 'Time × Hold quality (RPE)'],
]
story.append(styled_table(exercise_data, col_widths=[36*mm, 80*mm, 40*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 5. Exercise categories for v2, replacing v1\'s two overlapping apps.'))

story.append(h2('10.2 Replacing missing GIFs'))
story.append(p(
    'v1\'s exercise.html references GIF files (pushup.gif, plank.gif, etc.) that do not exist '
    'in the upload directory, so the UI falls back to icon-only display. v2 fixes this with '
    'a three-tier media strategy: (1) YouTube short embeds for popular exercises, fetched by '
    'exercise ID and cached offline via the service worker; (2) inline SVG illustrations for '
    'simpler movements, drawn once and bundled with the app; (3) user-uploaded form videos '
    'stored in the vault (encrypted), linked to the exercise by ID. This gives every exercise '
    'a visual reference without bloating the bundle.'
))

story.append(h2('10.3 Exercise session schema'))
story.append(code(
    '// lib/db/types.ts (excerpt)\n'
    'interface ExerciseSession {\n'
    '  id: string;\n'
    '  plan_id: string | null;     // null for ad-hoc sessions\n'
    '  started_at: number;         // unix ms\n'
    '  ended_at: number | null;\n'
    '  exercises: Array<{\n'
    '    exercise_id: string;\n'
    '    name: string;\n'
    '    category: ExerciseCategory;\n'
    '    sets: Array<{\n'
    '      reps: number | null;\n'
    '      weight_kg: number | null;\n'
    '      duration_s: number | null;\n'
    '      rpe: number | null;      // rate of perceived exertion, 1-10\n'
    '      completed: boolean;\n'
    '    }>;\n'
    '  }>;\n'
    '  total_volume_kg: number;    // sum of reps × weight, computed\n'
    '  perceived_effort: number;   // session-level RPE\n'
    '  notes: string;\n'
    '}'
))

# ============================================================================
# 11. Focus Mode & Anti-Distraction
# ============================================================================
story.append(h1('11. Focus Mode & Anti-Distraction'))
story.append(p(
    'The original brief proposed making the Android phone\'s screen go black-and-white when '
    'the user opened social media outside allowed times. This is technically impossible from '
    'a web app — browsers cannot detect or control other apps on the device, by design. A '
    'native Android app could do it via accessibility services, but at the cost of significant '
    'battery drain and platform-specific complexity. v2 chooses a different path: a browser-based '
    'approximation that, combined with the Counselor\'s behavioural nudges, achieves most of '
    'the same outcome without OS-level surveillance.'
))

story.append(h2('11.1 Focus session'))
story.append(p(
    'When the user starts a focus session (default 25 minutes, configurable), the Life_OS PWA '
    'enters a full-screen "breathing" overlay. If the user switches to another tab or minimises '
    'the browser, the <font name="DejaVuSans">visibilitychange</font> event fires and the app '
    'records a "focus break". When the user returns, a gentle modal shows how long they were '
    'away and asks whether they want to continue the session or end it. The session log feeds '
    'into the day_in_life_rollups table, so past focus sessions appear on the streak calendar.'
))

story.append(h2('11.2 Daily screen-time self-report'))
story.append(p(
    'Once per evening, the dashboard prompts the user to log their social-media minutes for '
    'the day (a single number, with quick-pick buttons for common ranges). The Counselor '
    'reviews trends across weeks, not days — a single bad day is not punished, but a sustained '
    'increase triggers a gentle, non-judgmental conversation. This is honest about its '
    'limitations: self-reported data is less accurate than OS-level measurement, but it avoids '
    'the privacy cost of always-on monitoring.'
))

story.append(h2('11.3 Counselor nudges'))
story.append(p(
    'If the user opens the Life_OS PWA during a scheduled focus block (set in advance, e.g. '
    '"9am to 11am, weekdays"), the Counselor intercepts the load and asks: "You\'re in a '
    'focus block until 11. Want to start the session, or postpone it?" This converts the '
    'moment of distraction into a moment of intention. The streak system ties in: excessive '
    'self-reported screen time (above the user\'s personal weekly average) reduces that day\'s '
    'streak score by up to 20 points, providing a soft, gamified cost without moralising.'
))

story.append(callout(
    'Honest scope',
    'These features are roughly 70 percent as effective as a native Android app with '
    'accessibility-service monitoring. The remaining 30 percent — hard blocks on specific '
    'apps, screen-colour manipulation, force-quit interventions — is out of reach for any '
    'web app. The bet is that 70 percent effectiveness, combined with the Counsellor\'s '
    'behavioural design and the streak system\'s loss aversion, is enough to move the needle '
    'for most users, while keeping the app cross-platform and battery-friendly.',
    color=SEM_WARNING,
))

# ============================================================================
# 12. One-Click Data Portability
# ============================================================================
story.append(h1('12. One-Click Data Portability'))
story.append(p(
    'v1 scatters four separate export/import buttons across dd.html, finance.html, vault.html, '
    'and Life_manual.html, each exporting only its own module\'s data in its own JSON format. '
    'v2 replaces this with a single Settings screen that exports the entire Dexie database as '
    'one encrypted <font name="DejaVuSans">.lifeos</font> file. The file is encrypted with the '
    'master password, so even if it leaks, the data inside is unreadable.'
))

story.append(h2('12.1 Export'))
story.append(p(
    'The export flow dumps all Dexie tables to a single JSON object, attaches a schema_version '
    'field, serialises to JSON, encrypts with AES-GCM using the master-password-derived KEK, '
    'and downloads as a <font name="DejaVuSans">.lifeos</font> file. The whole operation takes '
    'under two seconds for a typical database (under 50 MB) and works offline. A progress bar '
    'shows the encryption step explicitly, because users feel safer when they see "Encrypting..." '
    'rather than a generic "Exporting..." spinner.'
))

story.append(h2('12.2 Import'))
story.append(p(
    'Import is drag-and-drop: the user drops a <font name="DejaVuSans">.lifeos</font> file '
    'onto the Settings screen, the app prompts for the master password that encrypted it (which '
    'may differ from the current device\'s master password), decrypts, validates the schema '
    'version, and offers two merge modes: "Replace all" (wipe current data, restore from file) '
    'or "Merge" (add file data alongside current data, with conflict resolution by timestamp). '
    'A dry-run preview shows exactly what will change before the user commits.'
))

story.append(h2('12.3 Per-module exports'))
story.append(p(
    'For users who want to share a single module — e.g., exporting only their journal to send '
    'to a therapist, or only their finance data to send to an accountant — the Settings screen '
    'also offers per-module exports. These are exported as plain JSON (user choice: encrypted '
    'or not), with a clear warning that unencrypted exports should be deleted after sharing. '
    'Per-module exports are scoped to a date range to avoid dumping years of data when only '
    'a month is needed.'
))

story.append(h2('12.4 Schema versioning and migration'))
story.append(p(
    'Every export includes a <font name="DejaVuSans">schema_version</font> field matching the '
    'Dexie version at export time. On import, if the file\'s version is older than the current '
    'app\'s version, the app runs a sequence of migration functions (v1 to v2, v2 to v3, etc.) '
    'to bring the data up to current shape. If the file\'s version is newer than the app '
    'supports, the import is refused with a clear "please update Life_OS" message. This makes '
    'exports forward-compatible — a backup taken on v2.0 can be imported into v2.5 without '
    'manual intervention.'
))

# ============================================================================
# 13. Migration Roadmap
# ============================================================================
story.append(h1('13. Migration Roadmap (8-10 Weeks)'))
story.append(p(
    'The build is scoped for 10 to 15 hours per week of focused development. The phases are '
    'sequenced so that each one delivers a usable, testable increment — never a half-built '
    'feature spanning multiple phases. The order prioritises the foundation (Phase 0), the '
    'shell and dashboard (Phase 1), and the highest-value modules first (Journal, Finances, '
    'Tasks), with the Counselor landing in Phase 5 once enough data exists for it to be useful.'
))

roadmap_data = [
    ['Phase', 'Weeks', 'What you build', 'Outcome'],
    ['0. Foundation', '1', 'Next.js + Tailwind + shadcn + Dexie + master password + crypto layer', 'Working skeleton with lock screen'],
    ['1. Shell & Dashboard', '1', 'Sidebar, topbar, theme, dashboard with empty widgets, streak counter', 'One app, not nine'],
    ['2. Migrate Inkwell', '1', 'Port dd.html into React components, connect to journals + moods tables', 'Journal works in new shell'],
    ['3. Migrate Financia', '2', 'Port finance.html, hook Chart.js → Recharts, connect to transactions + budgets', 'Finance works in new shell'],
    ['4. Migrate Taskiee', '1', 'Port taskiee.html, connect to tasks table, port reminder notifications', 'Tasks work in new shell'],
    ['5. Build Counselor', '1.5', 'Hybrid router, context builder, server route, "thinking" UI, LLM integration', 'The differentiator ships'],
    ['6. Streak + Calendar', '1', 'day_in_life_rollups worker, streak scoring, calendar modal, click-through', 'Emotional core lands'],
    ['7. Exercise module', '1', 'Expanded library (9 categories), plan builder, session logger', 'Wellness suite (part 1)'],
    ['8. Migrate Vault', '0.5', 'Port vault.html with proper encryption (fix plaintext PIN), connect to vault_items', 'Secure vault in new shell'],
    ['9. Migrate Aura + Focus', '1', 'Port meditation_zone.html, ambient sounds, focus mode with visibilitychange', 'Wellness suite (part 2)'],
    ['10. PWA + Polish + Ship', '0.5', 'next-pwa, manifest, install prompt, icons, splash, final QA', 'Shippable v2.0'],
]
story.append(styled_table(roadmap_data, col_widths=[33*mm, 14*mm, 70*mm, 40*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 6. Phase-by-phase breakdown for an 8-10 week part-time build.'))

story.append(h2('13.1 Why this order'))
story.append(p(
    'Phase 0 (Foundation) comes first because every other phase depends on the master password, '
    'the Dexie schema, and the shell layout. Phase 1 (Shell & Dashboard) comes second so that '
    'every migrated module has a place to live. Journal is migrated before Finances because '
    'it is simpler (no charts, no recurring logic) and proves the data layer end-to-end. '
    'Finances is the longest migration (2 weeks) because of Chart.js, recurring transactions, '
    'and category management. The Counselor lands in Phase 5 — late enough that there is real '
    'data for it to read, early enough that user testing can shape its behaviour. The streak '
    'calendar follows immediately because it depends on rollup data that the previous phases '
    'have been generating. Vault and Aura come last because they are self-contained and do not '
    'block other modules.'
))

# ============================================================================
# 14. Risks & Mitigations
# ============================================================================
story.append(h1('14. Risks & Mitigations'))
story.append(p(
    'Five risks could derail the build. Each is acknowledged below with a concrete mitigation, '
    'not a vague "we\'ll handle it". Honesty about risk is what separates a plan from a wish.'
))

risks_data = [
    ['Risk', 'Likelihood', 'Mitigation'],
    ['IndexedDB quota cap on iOS Safari (~1GB) blocks large vaults',
     'Medium',
     'Storage eviction warning at 80% quota; vault items over 50MB auto-compressed; user prompted to export and delete old data'],
    ['Master password loss = total data loss (no recovery)',
     'Low but catastrophic',
     'One-time 24-word recovery code shown at setup; three repeated warnings to write it down; periodic reminders to export backup'],
    ['AI Counselor hallucinates facts about the user',
     'Medium',
     'Grounded system prompt that cites specific entries; "I don\'t know" fallback; user can flag any response as inaccurate for review'],
    ['Migration introduces bugs in existing user data',
     'Medium',
     'Import validator with dry-run mode; v1 data is read-only during migration; user can roll back to v1 at any time before deleting old files'],
    ['React learning curve slows Phase 0',
     'High for new React devs',
     'shadcn/ui templates hide complexity; Phase 0 scope is deliberately minimal (auth + shell + 1 demo module); pair with AI assistant for boilerplate'],
]
story.append(styled_table(risks_data, col_widths=[55*mm, 22*mm, 80*mm]))
story.append(Spacer(1, 6))
story.append(muted('Table 7. Top five risks with mitigations.'))

# ============================================================================
# 15. Next Steps
# ============================================================================
story.append(h1('15. Next Steps'))
story.append(p(
    'Three concrete actions for the user this week, before any code is written:'
))
story.append(bullet_list([
    '<b>Review this plan end to end.</b> Flag anything that does not match the vision — especially the streak scoring weights, the exercise categories, and the Counselor\'s "voice" in the system prompt. It is much cheaper to change the plan now than to change code later.',
    '<b>Back up all nine existing HTML files to a git repository</b> before any migration begins. v2 does not modify v1 files, but having them in git means a clean rollback point if Phase 0 reveals an unforeseen problem.',
    '<b>Choose a domain name for the PWA</b> (e.g. lifeos.app, mylifeos.dev). The PWA install prompt and service worker both require HTTPS, so a real domain (even a free one) is needed before Phase 10.',
]))

story.append(h2('15.1 What I will do next'))
story.append(p(
    'Immediately after this plan is reviewed, I will scaffold the Next.js 16 project as Phase 0: '
    'create the project structure, install Tailwind CSS 4 and shadcn/ui, set up Dexie with the '
    'full schema from section 6, implement the master password setup and lock screen from '
    'section 7 (with PBKDF2 key derivation and AES-GCM wrapping), and build a minimal shell '
    'with a placeholder dashboard. The output is a runnable Next.js project at '
    '<font name="DejaVuSans">/home/z/my-project/life_os_v2/</font> that the user can run with '
    '<font name="DejaVuSans">npm run dev</font>, install on their phone, and use as the '
    'foundation for Phase 1 onwards. A short README will document the file structure, the '
    'commands, and the next module to build.'
))

story.append(h2('15.2 What success looks like at the end of Phase 0'))
story.append(bullet_list([
    'Running <font name="DejaVuSans">npm run dev</font> opens a Next.js app at localhost:3000',
    'First-time users see a master-password setup screen with the 24-word recovery code',
    'Returning users see a lock screen; entering the wrong password shows a clear error',
    'After unlock, a minimal shell renders with a sidebar (placeholders for the 9 modules) and a topbar with the streak counter (showing 0)',
    'The Dexie database <font name="DejaVuSans">life_os</font> exists in the browser with all 17 tables created',
    'Settings screen has a working "Export .lifeos" button that downloads an encrypted backup',
    'The app installs as a PWA on Android and desktop (manifest + service worker configured)',
]))

# ─────────────────────────────────────────────────────────────────────────────
# Build body PDF
# ─────────────────────────────────────────────────────────────────────────────
OUTPUT_DIR = '/home/z/my-project/download'
os.makedirs(OUTPUT_DIR, exist_ok=True)
BODY_PDF = os.path.join(OUTPUT_DIR, '_life_os_plan_body.pdf')

doc = TocDocTemplate(
    BODY_PDF, pagesize=A4,
    leftMargin=22*mm, rightMargin=22*mm,
    topMargin=20*mm, bottomMargin=18*mm,
    title='Life_OS v2.0 — Architecture & Migration Plan',
    author='Adeshjeet_Official',
    subject='Life_OS v2 planning document',
    creator='Z.ai',
)

doc.multiBuild(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f'[ok] body PDF generated: {BODY_PDF}')
print(f'     pages: {doc.page}')
