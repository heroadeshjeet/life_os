"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Plus, Trash2, ChevronLeft, Lock, Clock, Brain, Coffee,
  X, Upload, FileText, Library,
} from "lucide-react";
import {
  getAllBooks, getBooksByCategory, addBook, deleteBook, getBookById,
  startSession, endSession, updateBookProgress,
  getEntertainmentLimit, getReaderStats, formatReadingTime,
  COVER_COLORS, ENTERTAINMENT_LIMIT_LABEL,
  type ReaderBook, type BookCategory,
} from "@/lib/reader/queries";
import { toast } from "sonner";
import { haptic, playSfx } from "@/components/providers/global-ux";

type View = "library" | "reader";

export function ReaderModule() {
  const [view, setView] = useState<View>("library");
  const [activeBook, setActiveBook] = useState<ReaderBook | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  if (view === "reader" && activeBook) {
    return (
      <PdfReader
        book={activeBook}
        onExit={() => { setView("library"); setActiveBook(null); triggerRefresh(); }}
      />
    );
  }

  return <LibraryView key={refreshKey} onOpenBook={(book) => { setActiveBook(book); setView("reader"); }} onChanged={triggerRefresh} />;
}

// ─── Library View ────────────────────────────────────────────────────────────

function LibraryView({
  onOpenBook, onChanged,
}: {
  onOpenBook: (book: ReaderBook) => void;
  onChanged: () => void;
}) {
  const [books, setBooks] = useState<ReaderBook[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getReaderStats>> | null>(null);
  const [entLimit, setEntLimit] = useState<Awaited<ReturnType<typeof getEntertainmentLimit>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | BookCategory>("all");

  const refresh = useCallback(async () => {
    const [b, s, el] = await Promise.all([getAllBooks(), getReaderStats(), getEntertainmentLimit()]);
    setBooks(b);
    setStats(s);
    setEntLimit(el);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, s, el] = await Promise.all([getAllBooks(), getReaderStats(), getEntertainmentLimit()]);
      if (cancelled) return;
      setBooks(b); setStats(s); setEntLimit(el); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === "all" ? books : books.filter((b) => b.category === filter);

  async function handleOpenBook(book: ReaderBook) {
    // Check entertainment limit
    if (book.category === "entertainment" && entLimit?.isLocked) {
      toast.error("Entertainment limit reached for today. Try again tomorrow!");
      haptic("error");
      return;
    }
    onOpenBook(book);
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-5 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            Reader
          </h1>
          <p className="text-sm text-muted-foreground">{books.length} book(s) in your library</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Book</span>
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Books" value={String(stats.totalBooks)} icon={<BookOpen className="h-4 w-4" />} color="text-sky-600 dark:text-sky-400" />
          <StatCard label="Total min" value={String(stats.totalReadingMinutes)} icon={<Clock className="h-4 w-4" />} color="text-amber-600 dark:text-amber-400" />
          <StatCard label="Sessions today" value={String(stats.sessionsToday)} icon={<FileText className="h-4 w-4" />} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="In progress" value={String(stats.currentBooks.length)} icon={<Brain className="h-4 w-4" />} color="text-violet-600 dark:text-violet-400" />
        </div>
      )}

      {/* Entertainment limit bar */}
      {entLimit && (
        <Card className={cn(
          "border",
          entLimit.isLocked ? "border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20" : "border-amber-200 dark:border-amber-900/50"
        )}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-sm">
                {entLimit.isLocked ? <Lock className="h-4 w-4 text-rose-500" /> : <Coffee className="h-4 w-4 text-amber-500" />}
                <span className="font-medium">Entertainment limit</span>
              </div>
              <span className={cn("text-xs font-mono", entLimit.isLocked ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                {formatReadingTime(entLimit.usedSeconds)} / {ENTERTAINMENT_LIMIT_LABEL}
              </span>
            </div>
            <Progress value={entLimit.usedPercent} className={cn("h-2", entLimit.isLocked && "[&>div]:bg-rose-500")} />
            <p className="text-[10px] text-muted-foreground mt-1">
              {entLimit.isLocked
                ? "🔒 Entertainment locked for today. Knowledge books are still available."
                : `${formatReadingTime(entLimit.remainingSeconds)} remaining for entertainment books today.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add book form */}
      {showAdd && (
        <AddBookForm onAdded={() => { setShowAdd(false); refresh(); onChanged(); }} onCancel={() => setShowAdd(false)} />
      )}

      {/* Filter chips */}
      <div className="flex gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        <FilterChip active={filter === "knowledge"} onClick={() => setFilter("knowledge")} label="📚 Knowledge" />
        <FilterChip active={filter === "entertainment"} onClick={() => setFilter("entertainment")} label="🎮 Entertainment" />
      </div>

      {/* Book grid */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading library...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            No books yet. Add a PDF to start reading.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onOpen={() => handleOpenBook(book)} onDelete={async () => { await deleteBook(book.id); refresh(); onChanged(); }} isLocked={book.category === "entertainment" && entLimit?.isLocked === true} />
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-2">
        <p>© Adeshjeet_official</p>
      </div>
    </div>
  );
}

function AddBookForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<BookCategory>("knowledge");
  const [pdfPath, setPdfPath] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    if (!pdfPath.trim()) { toast.error("Please enter a PDF path"); return; }
    setBusy(true);
    try {
      await addBook({
        title: title.trim(),
        author: author.trim(),
        category,
        pdf_path: pdfPath.trim(),
        cover_color: COVER_COLORS[colorIdx],
      });
      playSfx("add");
      haptic("success");
      toast.success("Book added to library");
      onAdded();
    } catch {
      toast.error("Failed to add book");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-sky-300 dark:border-sky-900/50">
      <CardContent className="p-4 space-y-3">
        <div>
          <Label htmlFor="book-title">Title</Label>
          <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="mt-1.5" autoFocus />
        </div>
        <div>
          <Label htmlFor="book-author">Author (optional)</Label>
          <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name" className="mt-1.5" />
        </div>
        <div>
          <Label>Category</Label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            <button onClick={() => setCategory("knowledge")} className={cn("rounded-md border py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2", category === "knowledge" ? "border-sky-400 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300" : "border-border hover:bg-accent")}>
              <Brain className="h-4 w-4" /> Knowledge
            </button>
            <button onClick={() => setCategory("entertainment")} className={cn("rounded-md border py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2", category === "entertainment" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300" : "border-border hover:bg-accent")}>
              <Coffee className="h-4 w-4" /> Entertainment
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="pdf-path">PDF path (in /assets/books/)</Label>
          <Input id="pdf-path" value={pdfPath} onChange={(e) => setPdfPath(e.target.value)} placeholder="e.g. my-book.pdf" className="mt-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">Place your PDF in public/assets/books/ and enter the filename here.</p>
        </div>
        <div>
          <Label>Cover color</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {COVER_COLORS.map((c, i) => (
              <button key={i} onClick={() => setColorIdx(i)} className={cn("h-7 w-7 rounded-full border-2 transition-all", colorIdx === i ? "border-foreground scale-110" : "border-transparent")} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={handleAdd} disabled={busy}>{busy ? "Adding..." : "Add book"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BookCard({ book, onOpen, onDelete, isLocked }: { book: ReaderBook; onOpen: () => void; onDelete: () => void; isLocked: boolean }) {
  const progressPct = book.total_pages > 0 ? (book.current_page / book.total_pages) * 100 : 0;
  const readMin = Math.round(book.total_reading_seconds / 60);

  return (
    <Card className="group cursor-pointer hover:shadow-md transition-all" onClick={onOpen}>
      <CardContent className="p-3">
        {/* Cover */}
        <div className="relative aspect-[3/4] rounded-lg mb-2 flex items-center justify-center overflow-hidden" style={{ background: book.cover_color }}>
          <BookOpen className="h-10 w-10 text-white/60" />
          {isLocked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Lock className="h-8 w-8 text-white" />
            </div>
          )}
          {progressPct > 0 && progressPct < 100 && (
            <Badge variant="secondary" className="absolute bottom-1 right-1 text-[8px] bg-black/60 text-white">
              {Math.round(progressPct)}%
            </Badge>
          )}
        </div>
        {/* Info */}
        <div className="space-y-0.5">
          <div className="text-sm font-medium truncate">{book.title}</div>
          {book.author && <div className="text-[10px] text-muted-foreground truncate">{book.author}</div>}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {book.category === "knowledge" ? <Brain className="h-2.5 w-2.5" /> : <Coffee className="h-2.5 w-2.5" />}
            <span>{readMin > 0 ? `${readMin}m read` : "Not started"}</span>
          </div>
        </div>
        {/* Delete (appears on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

// ─── PDF Reader View ─────────────────────────────────────────────────────────

function PdfReader({ book, onExit }: { book: ReaderBook; onExit: () => void }) {
  const [currentPage, setCurrentPage] = useState(book.current_page);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [pagesRead, setPagesRead] = useState(0);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const sessionStartPage = useRef(book.current_page);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start session on mount
  useEffect(() => {
    let cancelled = false;
    startSession(book.id).then((id) => {
      if (cancelled) return;
      setSessionId(id);
    });

    // Reading timer
    timerRef.current = setInterval(() => {
      setReadingSeconds((s) => s + 1);
    }, 1000);

    // Entertainment limit checker (every 10 seconds)
    if (book.category === "entertainment") {
      limitCheckRef.current = setInterval(async () => {
        const limit = await getEntertainmentLimit();
        if (limit.isLocked) {
          setShowLimitWarning(true);
        }
      }, 10000);
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (limitCheckRef.current) clearInterval(limitCheckRef.current);
    };
  }, [book.id, book.category]);

  // Save on exit
  async function handleExit() {
    if (sessionId) {
      await endSession(sessionId, pagesRead);
    }
    await updateBookProgress(book.id, currentPage, readingSeconds);
    playSfx("tap");
    onExit();
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
    setPagesRead((p) => p + 1);
    haptic("tap");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button variant="ghost" size="sm" onClick={handleExit} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Library
        </Button>
        <div className="text-center flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{book.title}</div>
          <div className="text-[10px] text-muted-foreground">
            {book.author ? `${book.author} · ` : ""}Page {currentPage}
            {book.total_pages > 0 ? ` / ${book.total_pages}` : ""} · {formatReadingTime(readingSeconds)}
          </div>
        </div>
        <div className="w-20" />
      </div>

      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden bg-muted">
        <iframe
          src={book.pdf_path}
          className="w-full h-full border-0"
          title={book.title}
        />
      </div>

      {/* Page controls */}
      <div className="flex items-center justify-center gap-3 p-3 border-t">
        <Button variant="outline" size="sm" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="text-sm font-medium tabular-nums px-3">
          {currentPage}{book.total_pages > 0 ? ` / ${book.total_pages}` : ""}
        </span>
        <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)}>
          Next
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </Button>
      </div>

      {/* Entertainment limit warning */}
      {showLimitWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="max-w-sm w-full border-rose-300">
            <CardContent className="p-6 text-center space-y-4">
              <Lock className="h-12 w-12 text-rose-500 mx-auto" />
              <div>
                <h2 className="text-lg font-bold">Time&apos;s up!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;ve reached the daily entertainment reading limit ({ENTERTAINMENT_LIMIT_LABEL}).
                  Knowledge books are still available.
                </p>
              </div>
              <Button className="w-full" onClick={handleExit}>Back to library</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("flex items-center gap-1.5 text-xs mb-1", color)}>{icon}</div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active ? "bg-sky-500 text-white" : "bg-muted text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}
