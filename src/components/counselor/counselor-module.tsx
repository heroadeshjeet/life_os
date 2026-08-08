"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Brain, Volume2, VolumeX, Trash2, Sparkles, User,
  CheckCircle2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  classifyIntent, handleLocalIntent,
} from "@/lib/counselor/router";
import {
  buildContext, serializeContext, type ContextSnapshot,
} from "@/lib/counselor/context";
import {
  getConversationHistory, saveUserMessage, saveCounselorMessage, clearConversation,
} from "@/lib/counselor/storage";
import {
  speakCounselor, stopSpeaking, isSpeaking, isTTSSupported,
  type CounselorVoiceId,
} from "@/lib/counselor/tts";
import { getVoiceDef, COUNSELOR_VOICES } from "@/lib/counselor/tts";
import { useAuthStore } from "@/lib/stores/auth-store";
import { db } from "@/lib/db/life-os-db";
import { toast } from "sonner";
import { haptic, playSfx } from "@/components/providers/global-ux";

interface Message {
  id: string;
  role: "user" | "counselor";
  content: string;
  createdAt: number;
  contextUsed?: boolean;
  local?: boolean;
}

const THINKING_STEPS = [
  "Reading your recent journals...",
  "Checking your task streak...",
  "Reviewing your spending...",
  "Looking at your workouts...",
  "Reviewing your meditation...",
  "Reflecting...",
];

export function CounselorModule() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceId, setVoiceId] = useState<CounselorVoiceId>("counselor-warm");
  const [currentlySpeaking, setCurrentlySpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const profile = useAuthStore((s) => s.profile);

  // Load voice preference from profile + conversation history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load voice preference
      const stored = profile?.auth && (await db.user_profile.get("single"));
      // Voice preference is stored on the client for now (not on profile schema)
      const storedVoice = localStorage.getItem("counselor_voice") as CounselorVoiceId | null;
      if (storedVoice) setVoiceId(storedVoice);

      const storedVoiceEnabled = localStorage.getItem("counselor_voice_enabled");
      if (storedVoiceEnabled !== null) {
        setVoiceEnabled(storedVoiceEnabled === "true");
      }

      // Load history
      const history = await getConversationHistory(30);
      if (cancelled) return;
      if (history.length === 0) {
        // Welcome message
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        const welcome: Message = {
          id: "welcome",
          role: "counselor",
          content: `${greeting}. I'm your Life_OS Counselor. I can see your journals, moods, tasks, finances, workouts, and meditation history — and I use that context to give you grounded, specific guidance rather than generic advice. What's on your mind today?`,
          createdAt: Date.now(),
          local: true,
        };
        setMessages([welcome]);
      } else {
        setMessages(history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // Stop speaking on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    setInput("");
    haptic("tap");

    // Add user message to UI immediately
    const userMsg: Message = {
      id: "u_" + Date.now(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Save user message to DB
    await saveUserMessage(text);

    // Classify intent
    const intent = classifyIntent(text);

    if (intent !== "cloud") {
      // Local response — instant
      const local = await handleLocalIntent(intent, text, voiceId);
      if (local.handled) {
        const counselorMsg: Message = {
          id: "c_" + Date.now(),
          role: "counselor",
          content: local.text,
          createdAt: Date.now(),
          local: true,
        };
        setMessages((prev) => [...prev, counselorMsg]);
        await saveCounselorMessage(local.text);
        playSfx("success");
        haptic("success");

        if (voiceEnabled) {
          speakCounselor(local.text, voiceId, {
            onStart: () => setCurrentlySpeaking(true),
            onEnd: () => setCurrentlySpeaking(false),
          });
        }
        return;
      }
    }

    // Cloud response — show thinking animation, build context, call LLM
    setThinking(true);
    setThinkingStep(0);

    try {
      // Run thinking steps in parallel with context building
      const stepInterval = setInterval(() => {
        setThinkingStep((s) => Math.min(s + 1, THINKING_STEPS.length - 1));
      }, 600);

      const context = await buildContext((step) => {
        const idx = THINKING_STEPS.findIndex((s) => s.toLowerCase().includes(step.toLowerCase().split("...")[0].split("your ")[1]?.split(" ")[0] ?? ""));
        if (idx >= 0) setThinkingStep(idx);
      });

      const contextSummary = serializeContext(context);
      const voiceDef = getVoiceDef(voiceId);

      // Build history for LLM (last 10 messages)
      const history = messages.slice(-10).map((m) => ({
        role: m.role as "user" | "counselor",
        content: m.content,
      }));

      clearInterval(stepInterval);
      setThinkingStep(THINKING_STEPS.length - 1);

      // Call server route
      const response = await fetch("/api/counselor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          contextSummary,
          systemPrompt: voiceDef.systemPrompt,
          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to get response");
      }

      const counselorMsg: Message = {
        id: "c_" + Date.now(),
        role: "counselor",
        content: data.reply,
        createdAt: Date.now(),
        contextUsed: true,
      };
      setMessages((prev) => [...prev, counselorMsg]);
      await saveCounselorMessage(data.reply, contextSummary);
      playSfx("success");
      haptic("success");

      if (voiceEnabled) {
        speakCounselor(data.reply, voiceId, {
          onStart: () => setCurrentlySpeaking(true),
          onEnd: () => setCurrentlySpeaking(false),
        });
      }
    } catch (err) {
      console.error("[counselor] error:", err);
      const errorMsg: Message = {
        id: "c_" + Date.now(),
        role: "counselor",
        content: "I'm having trouble right now. Please try again in a moment.",
        createdAt: Date.now(),
        local: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      playSfx("error");
      haptic("error");
      toast.error("Counselor encountered an error");
    } finally {
      setThinking(false);
      setThinkingStep(0);
    }
  }, [input, thinking, voiceId, voiceEnabled, messages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    localStorage.setItem("counselor_voice_enabled", String(next));
    if (!next) {
      stopSpeaking();
      setCurrentlySpeaking(false);
    }
    haptic("tap");
  }

  function toggleSpeaking() {
    if (currentlySpeaking) {
      stopSpeaking();
      setCurrentlySpeaking(false);
    }
    haptic("tap");
  }

  async function handleClear() {
    if (!confirm("Clear entire conversation? This cannot be undone.")) return;
    await clearConversation();
    setMessages([{
      id: "welcome",
      role: "counselor",
      content: "Fresh start. What's on your mind?",
      createdAt: Date.now(),
      local: true,
    }]);
    toast.success("Conversation cleared");
  }

  function changeVoice(id: CounselorVoiceId) {
    setVoiceId(id);
    localStorage.setItem("counselor_voice", id);
    stopSpeaking();
    setCurrentlySpeaking(false);
    haptic("tap");
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading conversation...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="border-b bg-background/95 backdrop-blur px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold">Counselor</div>
            <div className="text-[10px] text-muted-foreground">
              {getVoiceDef(voiceId).label.split(" — ")[0]} · {isTTSSupported() ? "voice on" : "voice N/A"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {currentlySpeaking && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSpeaking} title="Stop speaking">
              <VolumeX className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant={voiceEnabled ? "ghost" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={toggleVoice}
            title={voiceEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear} title="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Voice selector */}
      <div className="border-b bg-muted/30 px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground flex-shrink-0">Voice:</span>
        {COUNSELOR_VOICES.map((v) => (
          <button
            key={v.id}
            onClick={() => changeVoice(v.id)}
            className={cn(
              "flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
              voiceId === v.id
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {v.label.split(" — ")[0]}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {/* Thinking animation */}
          {thinking && (
            <div className="flex gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 flex-shrink-0">
                <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 p-3 space-y-2 max-w-md">
                <div className="space-y-1.5">
                  {THINKING_STEPS.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-all",
                        i < thinkingStep && "text-emerald-600 dark:text-emerald-400",
                        i === thinkingStep && "text-violet-700 dark:text-violet-300 font-medium",
                        i > thinkingStep && "text-muted-foreground/40",
                      )}
                    >
                      {i < thinkingStep ? (
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                      ) : i === thinkingStep ? (
                        <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background/95 backdrop-blur p-3">
        <div className="mx-auto max-w-2xl flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your Counselor anything..."
            disabled={thinking}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || thinking}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        <div className="mx-auto max-w-2xl mt-2">
          <p className="text-[10px] text-muted-foreground text-center">
            Counselor reads your journals, moods, tasks, finances, and workouts before responding.
            {voiceEnabled && " · Voice enabled — tap the speaker to mute."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0",
        isUser
          ? "bg-sky-100 dark:bg-sky-900/30"
          : "bg-violet-100 dark:bg-violet-900/30",
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        ) : (
          <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        )}
      </div>
      <div className={cn(
        "rounded-2xl p-3 max-w-md",
        isUser
          ? "rounded-tr-sm bg-sky-100 dark:bg-sky-950/30 text-sky-900 dark:text-sky-100"
          : "rounded-tl-sm bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50",
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.contextUsed && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300">
              grounded
            </Badge>
          )}
          {message.local && !isUser && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
              local
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
