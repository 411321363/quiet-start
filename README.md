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

1. **Quick Add & Voice Thought Dump (Zero Friction):**
   - Type a task into the bar and press **Enter**, or click the **🎙️ microphone button** to speak your thoughts aloud using the browser's native **Web Speech API**.
   - No required categories, priority flags, or due-date pickers. Capture ideas in under two seconds.
2. **Break It Down & "Make It Even Smaller" (De-escalation):**
   - Splits any task into **3 to 7 tiny micro-steps**, each designed to take **2 to 5 minutes**, guaranteed to start with concrete action verbs.
   - **🤏 "Make It Even Smaller" Unstick Feature:** If even a 2-minute step feels too hard or overwhelming, click the unstick button to de-escalate it into 2 ultra-tiny 30-second actions (e.g. *"Touch just the first item"* or *"Type 1 single word"*).
   - **LLM Integration:** If an API key is entered in Settings (OpenAI-compatible or Google Gemini), the app requests a contextual breakdown. The key is stored **exclusively in the browser `localStorage`**.
   - **Guaranteed Fallback:** Seamless offline symbolic rule engine guarantees 100% reliability if offline or if no API key is supplied.
3. **"Just Start" Mode with Ambient Focus Audio:**
   - Opens a peaceful view showing **ONE step at a time** with a **5-minute gentle countdown timer**.
   - **🎧 Synthesized Focus Sounds:** Toggle between **Brown Noise** (deep warmth for ADHD focus) and **Soft Rain**, mathematically generated on the fly via the browser's **Web Audio API** with zero external audio downloads.
   - Features **"Done"** and non-judgmental **"Skip for now"**.
4. **🌙 Calming Day & Night Modes:**
   - Easily toggle between soft sage/cream daytime aesthetic and a gentle, low-contrast midnight slate theme for late-night study sessions.
5. **Gentle Reminders:**
   - Lets users schedule reminder times (e.g. `09:30, 14:30, 19:30`).
   - Uses the browser **Notification API** with polite in-app fallback and kind wording.
6. **⚡ Sudden Reminders & Anti-Doomscroll Shield:**
   - **Tab Drift Detection:** Uses `document.visibilitychange`. If you drift to social media or other tabs for 3+ minutes, sends a gentle reality check: *"Did an algorithm grab your attention? No shame—it happens. Come back whenever you're ready."*
   - **Compassionate Re-Anchoring:** Returning plays a calming 528 Hz chime and shows a warm, zero-guilt prompt to drop your shoulders.
   - **Surprise Grounding Checks:** Optional periodic pattern-interrupt nudges (every 8–15 minutes).
7. **📅 Gentle Calendar & Repeat Days:**
   - Review quiet wins with calm sage dots (`🌱`). Rest days are neutral—never red or crossed out.
   - **One-Click Replay:** Click **"🔁 Repeat This Entire Day"** to clone past routines with fresh, unchecked boxes.
8. **Quiet Daily Reset:**
   - Unfinished tasks quietly roll over to the next day with zero red overdue marks and no broken streaks.

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
