"use client";

import { CommandPalette } from "./command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

/** Mounts the command palette and global keyboard shortcuts once in the shell. */
export function CommandRoot() {
  useKeyboardShortcuts();
  return <CommandPalette />;
}
