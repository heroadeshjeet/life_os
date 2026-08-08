"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search as SearchIcon, X } from "lucide-react";
import {
  searchEntries, formatDateLong,
  type SearchResult,
} from "@/lib/journal/queries";
import { cn } from "@/lib/utils";

export function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const r = await searchEntries(trimmed);
      if (cancelled) return;
      setResults(r);
      setLoading(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Derived: when query is empty, show no results
  const trimmedQuery = query.trim();
  const effectiveResults = trimmedQuery ? results : [];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find any past entry by title, content, or gratitude.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your journal..."
          className="pl-10 pr-10"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {!trimmedQuery ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Start typing to search across all your entries.
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Searching...</div>
      ) : effectiveResults.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No entries found for &ldquo;{query}&rdquo;
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {effectiveResults.length} {effectiveResults.length === 1 ? "result" : "results"}
          </div>
          <div className="space-y-2">
            {effectiveResults.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.moodEmoji && <span className="text-base">{r.moodEmoji}</span>}
                    <span className="font-medium text-sm truncate">{r.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {formatDateLong(r.date)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.snippet}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Result modal — reuses the calendar entry viewer pattern */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <Card
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selected.moodEmoji && <span className="text-xl">{selected.moodEmoji}</span>}
                  <span className="font-medium">{selected.title}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-muted-foreground">{formatDateLong(selected.date)}</div>
              <div className="text-sm whitespace-pre-wrap">{selected.snippet}</div>
              <div className="text-[10px] text-muted-foreground pt-2 border-t">
                Open the Calendar tab to read the full entry.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
