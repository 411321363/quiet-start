# QuietStart — Low-Stress Task & Micro-Step Companion

> **Course Project:** Introduction to AI  
> **Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES6+). Zero build steps, zero external frameworks, zero dependencies.

---

## 1. What It Is

**QuietStart** is a calm, low-clutter web application designed to help people who struggle with forgetting daily tasks or getting stuck in task paralysis. 

Instead of traditional productivity tools that use red overdue alerts, punishing streak counters, and complex tagging systems, QuietStart offers a soothing, guilt-free environment. It uses artificial intelligence (and an algorithmic rule-based fallback) to deconstruct overwhelming tasks into 3 to 7 tiny, non-threatening micro-steps (2–5 minutes each) and guides users to start with a single step at a time.

---

## 2. Who It Is For

- **Students & Learners:** Facing large assignments, term papers, study sessions, or administrative forms.
- **Individuals with ADHD or Executive Dysfunction:** Who experience inertia, demand avoidance, or overwhelm when faced with ambiguous multi-step tasks.
- **Anyone Feeling Overwhelmed:** Who needs a quiet, forgiving workspace to build momentum without judgment.

---

## 3. Key Features

1. **Quick Add (Zero Friction):**
   - Type a task into the bar and press **Enter**.
   - No required categories, priority flags, or due-date pickers. Capture ideas in under two seconds.
2. **Break It Down (AI + Heuristic Fallback):**
   - Splits any task into **3 to 7 tiny micro-steps**, each designed to take **2 to 5 minutes**.
   - Every breakdown begins with an effortless, low-friction first step (e.g., "Open...", "Pick up...", "Find...").
   - **LLM Integration:** If an API key is entered in Settings (OpenAI-compatible or Google Gemini), the app requests a contextual breakdown from the model. The key is stored **exclusively in the user's browser `localStorage`** and is never hardcoded or transmitted elsewhere.
   - **Guaranteed Fallback:** If no API key is provided, if network access drops, or if the API call fails, the app instantly switches to an internal rule-based template engine so it **always works reliably**.
3. **"Just Start" Mode (Single Step Focus):**
   - Opens a peaceful, distraction-free view showing **ONE step at a time**.
   - Includes a **5-minute gentle countdown timer** with Start, Pause, and Reset controls.
   - Features **"Done"** (marks step complete and advances) and **"Skip for now"** (skips without penalty or guilt).
   - Concludes with a warm, encouraging completion message when all steps are finished.
4. **Gentle Reminders:**
   - Lets users schedule reminder times (e.g. `09:30, 14:30, 19:30`).
   - Uses the browser **Notification API** (with polite in-app fallback).
   - Messaging is kind, peaceful, and zero-guilt (e.g., *"No rush or pressure. Take a slow breath and see if there is one small thing you feel like doing."*).
5. **⚡ Sudden Reminders & Anti-Doomscroll Shield:**
   - Designed specifically for the reality of getting sidetracked by social media and rabbit holes even after starting.
   - **Tab Drift Detection:** Uses the `Page Visibility API` (`document.visibilitychange`). If the user drifts away from the tab for 3+ minutes, it sends a kind background reality check: *"Did an algorithm grab your attention? No shame—it happens. Tap here to gently return to your 2-minute step."*
   - **Compassionate Re-Anchoring:** When returning to the tab, users are greeted with a warm, zero-guilt shoulder-drop grounding prompt instead of angry alert sounds.
   - **Surprise Grounding Checks:** Optional periodic pattern-interrupt nudges (every 8–15 minutes) to break automatic scrolling trances.
6. **📅 Gentle Calendar & Repeat Days:**
   - Look back on previous days' quiet accomplishments without pressure.
   - Days with activity display a quiet sage dot (`🌱`). Rest days are calm and neutral—**never red, never crossed out with "failed" marks**.
   - **One-Click Replay:** Found a past routine that worked well? Click **"🔁 Repeat This Entire Day"** to clone all tasks and their micro-steps into today's active list with fresh unchecked boxes.
   - **Cherry-Pick Routine Tasks:** Add individual tasks from any past day into today with one click.
7. **Quiet Daily Reset:**
   - Unfinished tasks quietly roll over to the next day.
   - **No red overdue lists**, no broken-streak warnings, and no shame. Each morning is a fresh, clean slate.

---

## 4. Project Folder Structure

```text
midterm project/
├── .gitignore          # Git exclusion rules for OS and editor artifacts
├── README.md           # Project documentation, architecture, and instructions
├── index.html          # Semantic HTML5 layout and modal overlays
├── styles.css          # Calming color palette, accessible mobile-friendly styles
├── app.js              # Application state, localStorage sync, timer, UI coordination
├── breakdown.js        # AI LLM prompt caller and offline heuristic breakdown engine
├── tests.js            # Automated test suite (runs 12 diverse test tasks)
└── tests.html          # Interactive visual browser test runner
```

---

## 5. How to Run It

Because the application has **no build step and no dependencies**, you can run it immediately using any of the methods below:

### Option A: Direct Browser Launch (Simplest)
1. Navigate to the project folder.
2. Double-click `index.html` (or right-click → **Open With** → Google Chrome, Mozilla Firefox, Microsoft Edge, or Apple Safari).
3. The application will run entirely in your browser.

### Option B: Local Static Server (Recommended for Browser Notifications & API Calls)
If testing browser notifications or external API endpoints, running a local HTTP server prevents browser security restrictions on the `file://` protocol:

- **Using Python 3:**
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000` in your browser.

- **Using Node (npx):**
  ```bash
  npx serve .
  ```

---

## 6. How to Run the Tests

The project includes automated tests verifying that task breakdowns consistently generate **3 to 7 steps**, that **every step begins with a concrete action verb**, and that the **first step is low-friction**.

### Run via Command Line (Node.js):
```bash
node tests.js
```
*Expected output: `12 / 12 tests passed (100%)` with exit code 0.*

### Run in the Browser:
Double-click or open `tests.html` in any browser to see an interactive, color-coded test dashboard displaying the generated steps and action verbs for each test task.

---

## 7. AI Concepts & Design Rationale (For Class Presentation)

When explaining this project to your AI class and professor:

1. **Hybrid Architecture (Generative AI + Symbolic Heuristics):**
   - Relying solely on external LLMs creates single points of failure (rate limits, latency, API downtime, user lack of an API key).
   - QuietStart uses a **graceful degradation pattern**: it attempts prompt-engineered LLM generation first, but guarantees 100% availability through a rule-based expert heuristic fallback.
2. **Prompt Engineering for Cognitive Ergonomics:**
   - The LLM prompt enforces strict behavioral boundaries:
     - Constrains step count to 3–7 items (Miller's Law of working memory).
     - Mandates imperative action verbs at the start of every sentence to minimize cognitive translation friction.
     - Enforces low-friction entry steps under 2 minutes to overcome initial task inertia.
3. **Local-First Privacy Architecture:**
   - No backend database or server logs.
   - User tasks, settings, and API credentials are kept strictly on the client device via `localStorage`.

---

## 8. Limitations

1. **Client-Side Storage:** Tasks and settings are stored in browser `localStorage`. Clearing browser data or switching devices will not automatically sync tasks.
2. **Browser Notifications:** The Notification API requires user permission and only triggers while the browser app or background tab is open.
3. **LLM Key Usage:** When using the AI breakdown feature, API calls are made directly from the client's browser to the LLM provider (OpenAI or Gemini), requiring internet access and active provider quota.

---

## 9. Important Disclaimer

> **Notice:** This application is a self-help and educational productivity project created for an Introduction to AI university course. It is **not** medical, psychiatric, or therapeutic advice. It is not intended to diagnose, treat, cure, or prevent any mental health condition, ADHD, or psychiatric disorder. If you are experiencing persistent distress, please consult a qualified healthcare professional.
