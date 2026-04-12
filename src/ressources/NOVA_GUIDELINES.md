# NOVA - Design System & Behavior Guidelines

## 1. Purpose

Nova is a futuristic developer assistant interface designed to feel like a personal AI system (Jarvis-like), focused on clarity, efficiency, and control.

This document defines the **design system**, **UX rules**, and **behavior principles** that MUST be respected across the entire project.

---

## 2. Core Philosophy

- Minimalistic but powerful
- Developer-first experience
- Clean, structured, and readable
- No visual noise
- Every UI element must have a purpose

Nova is NOT:

- A flashy gaming UI
- A generic chatbot
- A marketing-style interface

Nova IS:

- A personal AI console
- A productivity tool
- A technical control surface

---

## 3. Visual Identity

### 3.1 Colors

- Background: `#0B0F14` (deep dark)
- Secondary background: `#111827`
- Primary accent: `#00BFFF` (electric blue)
- Accent glow: `rgba(0, 191, 255, 0.4)`
- Text primary: `#E5E7EB`
- Text secondary: `#9CA3AF`
- Border: `#1F2937`

### 3.2 Style

- Dark theme ONLY
- Subtle glow effects (never excessive)
- Soft shadows
- Slight transparency allowed (light glassmorphism)

### 3.3 Typography

- Font: modern sans-serif (Inter, SF Pro, or equivalent)
- Clear hierarchy:
  - Titles: bold
  - Content: regular
  - Metadata: lighter / smaller

---

## 4. Layout Rules

### 4.1 Global Structure

- Fixed header at top:
  - Label: "Nova Interface Console"
  - Must remain visible on scroll
  - Can shrink slightly on scroll

- Main areas:
  1. Chat / Output zone
  2. Input zone (clearly separated)

### 4.2 Separation

- Input and chat MUST be visually separated
- Use border or contrast difference
- No ambiguous zones

---

## 5. Chat Behavior

### 5.1 Streaming

- Messages should appear progressively (streaming)
- Token-by-token or sentence-by-sentence

### 5.2 Cursor

- A blinking cursor `▌` is displayed:
  - ONLY on the last assistant message
  - NEVER on previous messages

### 5.3 Stability

- No rendering glitches
- No "undefined" or broken outputs
- Partial responses must still display correctly if interrupted

---

## 6. Input Behavior

### 6.1 Textarea

- Multi-line input
- Expands up to 5 lines max
- After that: internal scroll

### 6.2 Send Button

- Positioned to the RIGHT of the input
- Must be vertically centered with the input field

### 6.3 Interaction

- Enter = send message
- Shift + Enter = new line

---

## 7. Scroll & UX

- Smooth scroll behavior
- Auto-scroll to bottom on new messages
- Scrollbar:
  - Minimal
  - Dark themed
  - Discreet

---

## 8. Components Principles

Every component must follow:

- Clear responsibility
- No unnecessary props
- Optimized rendering (React.memo when needed)
- No duplicated logic
- Separation between:
  - UI (component)
  - Logic (hooks / services)

---

## 9. Animation Rules

- Subtle only
- No aggressive motion
- No distracting effects

Allowed:

- Fade-in
- Slight slide
- Cursor blinking

Forbidden:

- Bouncing elements
- Overly dynamic transitions

---

## 10. Developer Experience

- Code must be:
  - Readable
  - Modular
  - Maintainable

- Prefer:
  - TypeScript
  - Clear naming
  - Small components

---

## 11. AI Behavior (Critical)

The AI integrated into Nova MUST:

- Be concise but precise
- Provide structured answers
- Avoid unnecessary verbosity
- Prefer actionable outputs
- Avoid generic or vague responses

Tone:

- Intelligent
- Slightly geeky
- Occasionally light humor (never excessive)

---

## 12. Anti-Patterns (Strictly Forbidden)

- Flashy UI (RGB, gradients everywhere)
- Inconsistent spacing
- Unaligned elements
- Mixed design styles
- Overloaded interfaces
- Non-deterministic behavior

---

## 13. Summary

Nova is a **futuristic developer console**, not a toy.

Every decision must answer:

> Does this improve clarity, control, or efficiency?

If not, it should not exist.
