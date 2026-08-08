/**
 * Life_OS v2 — Reader queries.
 *
 * Manages books + reading sessions. Entertainment books have a daily
 * time limit (default 30 min/day). Knowledge books are unlimited.
 */
import { db, uid, todayStr, type ReaderBook, type ReaderSession, type BookCategory } from "@/lib/db/life-os-db";

const ENTERTAINMENT_DAILY_LIMIT_SEC = 30 * 60; // 30 minutes per day

// ─── Book CRUD ──────────────────────────────────────────────────────────────

export async function getAllBooks(): Promise<ReaderBook[]> {
  return db.reader_books.orderBy("title").toArray();
}

export async function getBooksByCategory(category: BookCategory): Promise<ReaderBook[]> {
  const all = await getAllBooks();
  return all.filter((b) => b.category === category);
}

export async function getBookById(id: string): Promise<ReaderBook | undefined> {
  return db.reader_books.get(id);
}

export async function addBook(input: {
  title: string;
  author: string;
  category: BookCategory;
  pdf_path: string;
  cover_color: string;
  total_pages?: number;
}): Promise<string> {
  const id = uid("book_");
  const book: ReaderBook = {
    id,
    title: input.title,
    author: input.author,
    category: input.category,
    pdf_path: input.pdf_path,
    cover_color: input.cover_color,
    total_pages: input.total_pages ?? 0,
    current_page: 1,
    total_reading_seconds: 0,
    created_at: Date.now(),
  };
  await db.reader_books.add(book);
  return id;
}

export async function updateBookProgress(id: string, page: number, readingSeconds: number): Promise<void> {
  const book = await db.reader_books.get(id);
  if (!book) return;
  await db.reader_books.update(id, {
    current_page: page,
    total_reading_seconds: book.total_reading_seconds + readingSeconds,
  });
}

export async function deleteBook(id: string): Promise<void> {
  await db.reader_books.delete(id);
  await db.reader_sessions.where("book_id").equals(id).delete();
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function startSession(bookId: string): Promise<string> {
  const id = uid("rs_");
  const session: ReaderSession = {
    id,
    book_id: bookId,
    started_at: Date.now(),
    ended_at: null,
    duration_s: 0,
    pages_read: 0,
    date: todayStr(),
  };
  await db.reader_sessions.add(session);
  return id;
}

export async function endSession(sessionId: string, pagesRead: number): Promise<void> {
  const session = await db.reader_sessions.get(sessionId);
  if (!session) return;
  const duration = Math.round((Date.now() - session.started_at) / 1000);
  await db.reader_sessions.update(sessionId, {
    ended_at: Date.now(),
    duration_s: duration,
    pages_read: pagesRead,
  });

  // Update book total reading time
  const book = await db.reader_books.get(session.book_id);
  if (book) {
    await db.reader_books.update(session.book_id, {
      total_reading_seconds: book.total_reading_seconds + duration,
    });
  }
}

// ─── Entertainment daily limit ──────────────────────────────────────────────

export interface EntertainmentLimit {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  isLocked: boolean;
  usedPercent: number;
}

export async function getEntertainmentLimit(): Promise<EntertainmentLimit> {
  const today = todayStr();
  const sessions = await db.reader_sessions.where("date").equals(today).toArray();

  // Sum durations of entertainment book sessions today
  const entertainmentBookIds = new Set(
    (await db.reader_books.where("category").equals("entertainment").toArray()).map((b) => b.id)
  );

  let usedSeconds = 0;
  for (const s of sessions) {
    if (entertainmentBookIds.has(s.book_id)) {
      // If session is ongoing (no end time), count elapsed so far
      const dur = s.ended_at ? s.duration_s : Math.round((Date.now() - s.started_at) / 1000);
      usedSeconds += dur;
    }
  }

  const remainingSeconds = Math.max(0, ENTERTAINMENT_DAILY_LIMIT_SEC - usedSeconds);
  const isLocked = remainingSeconds <= 0;
  const usedPercent = Math.min(100, (usedSeconds / ENTERTAINMENT_DAILY_LIMIT_SEC) * 100);

  return {
    usedSeconds,
    limitSeconds: ENTERTAINMENT_DAILY_LIMIT_SEC,
    remainingSeconds,
    isLocked,
    usedPercent,
  };
}

export const ENTERTAINMENT_LIMIT_LABEL = "30 min/day";

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface ReaderStats {
  totalBooks: number;
  totalReadingSeconds: number;
  totalReadingMinutes: number;
  sessionsToday: number;
  entertainmentUsedToday: number;
  knowledgeReadToday: number;
  currentBooks: ReaderBook[]; // books with current_page > 1 and < total_pages
}

export async function getReaderStats(): Promise<ReaderStats> {
  const [allBooks, allSessions] = await Promise.all([
    getAllBooks(),
    db.reader_sessions.toArray(),
  ]);

  const today = todayStr();
  const todaySessions = allSessions.filter((s) => s.date === today);
  const entertainmentIds = new Set(allBooks.filter((b) => b.category === "entertainment").map((b) => b.id));

  let entertainmentUsed = 0;
  let knowledgeUsed = 0;
  for (const s of todaySessions) {
    const dur = s.ended_at ? s.duration_s : Math.round((Date.now() - s.started_at) / 1000);
    if (entertainmentIds.has(s.book_id)) entertainmentUsed += dur;
    else knowledgeUsed += dur;
  }

  const totalReadingSeconds = allBooks.reduce((s, b) => s + b.total_reading_seconds, 0);
  const currentBooks = allBooks.filter((b) => b.current_page > 1 && (b.total_pages === 0 || b.current_page < b.total_pages));

  return {
    totalBooks: allBooks.length,
    totalReadingSeconds,
    totalReadingMinutes: Math.round(totalReadingSeconds / 60),
    sessionsToday: todaySessions.length,
    entertainmentUsedToday: entertainmentUsed,
    knowledgeReadToday: knowledgeUsed,
    currentBooks,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatReadingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const COVER_COLORS = [
  "#e0a96d", "#8aa884", "#7a9ec9", "#b08ac9", "#d97a8e",
  "#c9a96e", "#c97b4a", "#5b9bd5", "#e8b4b8", "#a8c686",
];

// ─── Book manifest (scans /assets/books/ for PDFs) ──────────────────────────

export interface BookManifestEntry {
  path: string;
  name: string;
  size: number;
}

export async function getBookManifest(): Promise<BookManifestEntry[]> {
  try {
    const manifestRes = await fetch("/assets/manifest.json");
    if (!manifestRes.ok) return [];
    const manifest = await manifestRes.json();
    // The manifest is generated by scripts/scan-assets.js — but it doesn't
    // scan /assets/books/ yet. We'll scan it separately.
    return [];
  } catch {
    return [];
  }
}
