"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Lightbulb,
  Calendar as CalIcon, Heart,
} from "lucide-react";
import {
  getOrCreateToday, saveEntry, randomPrompt, formatDateLong, todayStr,
  type Journal,
} from "@/lib/journal/queries";
import { MoodPicker } from "./mood-picker";
import { toast } from "sonner";

export function WriteView() {
  const [entry, setEntry] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [gratitude, setGratitude] = useState<string[]>(["", "", ""]);
  const [title, setTitle] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedAt = useRef<number>(0);

  // Load today's entry
  useEffect(() => {
    let cancelled = false;
    getOrCreateToday()
      .then((e) => {
        if (cancelled) return;
        setEntry(e);
        setTitle(e.title);
        setGratitude(e.gratitude.length === 3 ? e.gratitude : ["", "", ""]);
        if (editorRef.current) {
          editorRef.current.innerHTML = e.content_html;
        }
      })
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Debounced save
  const scheduleSave = useCallback(() => {
    if (!entry) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const content = editorRef.current?.innerHTML ?? "";
      const updated: Journal = {
        ...entry,
        title,
        content_html: content,
        gratitude,
        updated_at: Date.now(),
      };
      await saveEntry(updated);
      lastSavedAt.current = Date.now();
      setEntry(updated);
    }, 1200);
  }, [entry, title, gratitude]);

  // Trigger save on field changes
  useEffect(() => { scheduleSave(); }, [title, gratitude, scheduleSave]);

  // Cleanup pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function exec(command: string) {
    document.execCommand(command, false);
    editorRef.current?.focus();
    scheduleSave();
  }

  function newPrompt() {
    setPrompt(randomPrompt());
  }

  function insertPromptIntoEditor() {
    if (!prompt || !editorRef.current) return;
    const node = document.createElement("p");
    node.textContent = prompt;
    node.style.fontStyle = "italic";
    node.style.color = "#92751f";
    editorRef.current.appendChild(node);
    // Add a blank line after
    editorRef.current.appendChild(document.createElement("p"));
    editorRef.current.focus();
    setPrompt(null);
    scheduleSave();
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading today&apos;s page...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 pb-12">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
          <CalIcon className="h-4 w-4" />
          <span>{formatDateLong(todayStr())}</span>
          <span className="text-muted-foreground ml-2">— today&apos;s page</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-saves as you type. Everything stays encrypted on your device.
        </p>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)..."
        className="text-lg font-semibold border-none px-0 focus-visible:ring-0 bg-transparent"
      />

      {/* Editor toolbar */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur border-b flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={() => exec("bold")} icon={<Bold className="h-4 w-4" />} label="Bold" />
        <ToolbarButton onClick={() => exec("italic")} icon={<Italic className="h-4 w-4" />} label="Italic" />
        <ToolbarButton onClick={() => exec("underline")} icon={<Underline className="h-4 w-4" />} label="Underline" />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} icon={<List className="h-4 w-4" />} label="Bullet list" />
        <ToolbarButton onClick={() => exec("insertOrderedList")} icon={<ListOrdered className="h-4 w-4" />} label="Numbered list" />
        <ToolbarButton onClick={() => exec("formatBlock", "<blockquote>")} icon={<Quote className="h-4 w-4" />} label="Quote" />
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={newPrompt} className="gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prompt</span>
        </Button>
      </div>

      {/* Prompt popover */}
      {prompt && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm italic text-amber-900 dark:text-amber-100">{prompt}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={insertPromptIntoEditor}>
                Insert into entry
              </Button>
              <Button size="sm" variant="ghost" onClick={newPrompt}>
                Another one
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPrompt(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rich text editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        className="min-h-[300px] prose prose-sm dark:prose-invert max-w-none focus:outline-none
                   rounded-lg border border-input bg-background p-4
                   [&_blockquote]:border-l-4 [&_blockquote]:border-rose-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                   [&_ul]:list-disc [&_ul]:pl-6
                   [&_ol]:list-decimal [&_ol]:pl-6"
        data-placeholder="What's on your mind today?"
      />

      {/* Gratitude */}
      <Card className="border-rose-200 dark:border-rose-900/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-300">
            <Heart className="h-4 w-4" />
            Three things I&apos;m grateful for
          </div>
          <div className="space-y-2">
            {gratitude.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50 text-xs font-medium text-rose-700 dark:text-rose-300">
                  {i + 1}
                </span>
                <Input
                  value={g}
                  onChange={(e) => {
                    const next = [...gratitude];
                    next[i] = e.target.value;
                    setGratitude(next);
                  }}
                  placeholder="Something I'm grateful for..."
                  className="border-none focus-visible:ring-0 bg-transparent"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mood */}
      <Card>
        <CardContent className="p-4">
          {entry && <MoodPicker journalId={entry.id} />}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>Auto-saved · © Adeshjeet_official</p>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {icon}
    </button>
  );
}
