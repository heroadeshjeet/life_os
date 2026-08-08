"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createTask, requestNotificationPermission, type Task } from "@/lib/tasks/queries";
import { playSfx, haptic } from "@/components/providers/global-ux";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTask?: Task | null;
}

const PRIORITY_OPTIONS: { value: Task["priority"]; label: string }[] = [
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🔵 Low" },
];

export function TaskModal({ open, onClose, onSaved, editTask }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editTask) {
      setTitle(editTask.title);
      setNotes(editTask.notes);
      setPriority(editTask.priority);
      if (editTask.due_at) {
        const d = new Date(editTask.due_at);
        setDueDate(d.toISOString().slice(0, 10));
        setDueTime(d.toTimeString().slice(0, 5));
      } else {
        setDueDate(""); setDueTime("");
      }
      setReminderEnabled(!!editTask.reminder_at);
    } else {
      setTitle(""); setNotes(""); setPriority("medium");
      setDueDate(new Date().toISOString().slice(0, 10));
      setDueTime("09:00");
      setReminderEnabled(false);
    }
  }, [open, editTask]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      haptic("error");
      return;
    }

    let dueAt: number | null = null;
    if (dueDate) {
      const dateStr = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T09:00`;
      dueAt = new Date(dateStr).getTime();
    }

    let reminderAt: number | null = null;
    if (reminderEnabled && dueAt) {
      reminderAt = dueAt;
      // Request notification permission if not already granted
      await requestNotificationPermission();
    }

    setSaving(true);
    try {
      await createTask({
        title, notes: notes.trim(),
        due_at: dueAt, reminder_at: reminderAt,
        priority,
      });
      playSfx("add"); haptic("success");
      toast.success("Task added");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save task");
      haptic("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details..."
              className="mt-1.5 min-h-[60px]"
            />
          </div>

          <div>
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    "rounded-md border py-2 text-xs font-medium transition-colors",
                    priority === p.value
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="due-date">Due date</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="due-time">Time</Label>
              <Input
                id="due-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Send reminder at due time</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : editTask ? "Update" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
