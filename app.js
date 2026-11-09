/**
 * app.js
 * 
 * Main controller for QuietStart:
 * - State management and synchronization with browser localStorage
 * - Quick-add task capture (zero-friction, Enter key)
 * - Micro-step breakdown coordination (LLM API with rule-based fallback)
 * - "Just Start" single-step focus mode with a 5-minute timer
 * - Guilt-free gentle reminder scheduler (Browser Notification API)
 * - Quiet daily rollover (no overdue shame, no broken streaks)
 */

// ============================================================================
// 1. Default State & Storage Keys
// ============================================================================
const STORAGE_KEY_TASKS = 'quiet_tasks_v1';
const STORAGE_KEY_SETTINGS = 'quiet_settings_v1';
const STORAGE_KEY_LAST_DATE = 'quiet_last_active_date_v1';
const STORAGE_KEY_HISTORY = 'quiet_history_v1';
const STORAGE_KEY_THEME = 'quiet_theme_v1';

// Default user settings
const DEFAULT_SETTINGS = {
  provider: 'openai',          // 'openai' or 'gemini'
  apiKey: '',                  // Stored strictly in client browser localStorage
  model: 'gpt-4o-mini',        // Or 'gemini-1.5-flash'
  customEndpoint: '',          // Optional custom/local OpenAI-compatible endpoint
  remindersEnabled: false,
  reminderTimes: ['09:30', '14:30', '19:30'], // Gentle reminder times
  lastNotifiedMinute: '',      // Prevents duplicate alerts in the same minute
  doomscrollShieldEnabled: true, // Sudden reminder & tab drift detection
  driftMinutes: 3,             // Minutes away before sending gentle reality check
  randomNudgeEnabled: true     // Surprise pattern-interrupt grounding nudges
};

// Kind, zero-guilt reminder nudges
const KIND_NUDGES = [
  "Whenever you're ready, taking one tiny step is enough.",
  "No rush and no pressure. Take a slow breath and see if you feel like doing one small thing.",
  "You don't have to finish everything today. Simply starting is a victory.",
  "Be kind to yourself right now. Even 2 minutes of focus makes a difference.",
  "Remember: action comes before motivation. Try the easiest tiny step."
];

// Anti-Doomscroll / Drift Nudges (Recognizes that getting pulled into feeds is normal, zero shame)
const DOOMSCROLL_NUDGES = [
  "Did an algorithm grab your attention? It happens to all of us. Drop your shoulders, breathe, and step back in.",
  "Caught in a scroll loop? No guilt, no blame. Take a breath and pick up your tiny step.",
  "Phone or feed pull you away? Totally normal. You don't have to restart everything—just spend 60 seconds on this step.",
  "Gentle reality pause: Unclench your jaw, soften your eyes. Whenever you're ready, come back.",
  "Doomscrolling is engineered to trap our focus. Be kind to yourself, close that tab, and do 1 tiny step."
];

// App State
let tasks = [];
let settings = { ...DEFAULT_SETTINGS };
let history = {}; // Date-keyed map: { 'YYYY-MM-DD': [ { id, title, steps, completed } ] }

// Calendar UI state
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth(); // 0 - 11
let calSelectedDate = new Date().toISOString().split('T')[0];

// "Just Start" Zen Session State
let zenSession = {
  taskId: null,
  stepIndex: 0,
  steps: [],
  timerSeconds: 300, // 5 minutes
  timerInterval: null,
  timerRunning: false
};

// ============================================================================
// 2. Initialization & Daily Rollover Check
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSettings();
  loadTasks();
  loadHistory();
  checkQuietDailyRollover();
  renderTasks();
  initEventListeners();
  initVoiceInput();
  initReminderScheduler();
  initDoomscrollShield();
  initSuddenSurpriseNudges();
});

/**
 * Loads tasks safely from localStorage.
 */
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse tasks from localStorage:', err);
    tasks = [];
  }
}

/**
 * Persists tasks back to localStorage and syncs with history log.
 */
function saveTasks() {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  syncCurrentTasksToHistory();
  renderTasks();
}

/**
 * Loads settings from localStorage.
 */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed to parse settings:', err);
    settings = { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists settings to localStorage.
 */
function saveSettings() {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

/**
 * Daily Reset Feature:
 * Unfinished tasks roll over quietly to the new day.
 * No red 'OVERDUE' stamps, no warning counters, no streak resets.
 */
function checkQuietDailyRollover() {
  const today = new Date().toISOString().split('T')[0];
  const lastActiveDate = localStorage.getItem(STORAGE_KEY_LAST_DATE);

  if (lastActiveDate && lastActiveDate !== today) {
    // A new day has begun: unfinished tasks quietly persist
    const unfinishedCount = tasks.filter(t => !t.completed).length;
    if (unfinishedCount > 0) {
      showToast("A new day is here. Your tasks are right where you left them, no rush.", "kind-nudge");
    }
  }

  // Update last seen active date
  localStorage.setItem(STORAGE_KEY_LAST_DATE, today);
}

// ============================================================================
// 3. UI Event Listeners & Modals
// ============================================================================
function initEventListeners() {
  // Quick Add task form
  const quickAddForm = document.getElementById('quick-add-form');
  const quickAddInput = document.getElementById('quick-add-input');

  quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = quickAddInput.value.trim();
    if (!title) return;

    addTask(title);
    quickAddInput.value = '';
    quickAddInput.focus();
  });

  // Settings Modal controls
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const settingsSaveBtn = document.getElementById('settings-save-btn');
  const settingsCancelBtn = document.getElementById('settings-cancel-btn');

  settingsBtn.addEventListener('click', () => openSettingsModal());
  settingsCloseBtn.addEventListener('click', () => closeSettingsModal());
  settingsCancelBtn.addEventListener('click', () => closeSettingsModal());
  settingsSaveBtn.addEventListener('click', () => saveSettingsFromModal());

  // Close modals on clicking backdrop
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  // "Just Start" Zen Overlay controls
  const zenCloseBtn = document.getElementById('zen-close-btn');
  const zenDoneBtn = document.getElementById('zen-btn-done');
  const zenSkipBtn = document.getElementById('zen-btn-skip');
  const zenTimerToggleBtn = document.getElementById('zen-timer-toggle');
  const zenTimerResetBtn = document.getElementById('zen-timer-reset');
  const zenFinishBackBtn = document.getElementById('zen-finish-back-btn');

  zenCloseBtn.addEventListener('click', () => closeJustStartMode());
  zenDoneBtn.addEventListener('click', () => completeCurrentZenStep());
  zenSkipBtn.addEventListener('click', () => skipCurrentZenStep());
  zenTimerToggleBtn.addEventListener('click', () => toggleZenTimer());
  zenTimerResetBtn.addEventListener('click', () => resetZenTimer());
  zenFinishBackBtn.addEventListener('click', () => closeJustStartMode());

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Unstick button ("Make It Even Smaller")
  const zenUnstickBtn = document.getElementById('zen-btn-unstick');
  if (zenUnstickBtn) zenUnstickBtn.addEventListener('click', unstickCurrentZenStep);

  // Ambient focus sound chips
  document.querySelectorAll('.sound-chip').forEach(chip => {
    chip.addEventListener('click', () => setAmbientSound(chip.dataset.sound));
  });

  // Calendar Modal controls
  const calendarBtn = document.getElementById('calendar-btn');
  const calendarModal = document.getElementById('calendar-modal');
  const calendarCloseBtn = document.getElementById('calendar-close-btn');
  const calPrevBtn = document.getElementById('cal-prev-btn');
  const calNextBtn = document.getElementById('cal-next-btn');
  const calTodayBtn = document.getElementById('cal-today-btn');
  const calRepeatDayBtn = document.getElementById('cal-repeat-day-btn');

  if (calendarBtn) calendarBtn.addEventListener('click', () => openCalendarModal());
  if (calendarCloseBtn) calendarCloseBtn.addEventListener('click', () => closeCalendarModal());
  if (calPrevBtn) calPrevBtn.addEventListener('click', () => navigateCalendarMonth(-1));
  if (calNextBtn) calNextBtn.addEventListener('click', () => navigateCalendarMonth(1));
  if (calTodayBtn) calTodayBtn.addEventListener('click', () => jumpCalendarToToday());
  if (calRepeatDayBtn) calRepeatDayBtn.addEventListener('click', () => repeatEntireDay(calSelectedDate));

  if (calendarModal) {
    calendarModal.addEventListener('click', (e) => {
      if (e.target === calendarModal) closeCalendarModal();
    });
  }

  // Keyboard shortcut: Escape closes overlays
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettingsModal();
      closeJustStartMode();
      closeCalendarModal();
    }
  });
}

// ============================================================================
// 4. Task Management
// ============================================================================

/**
 * Creates a new task and adds it to the list.
 * @param {string} title
 */
function addTask(title) {
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: title,
    completed: false,
    createdAt: new Date().toISOString(),
    steps: [],          // Micro-steps generated by AI or rule-based engine
    stepsExpanded: false,
    breakdownSource: null // 'llm' or 'rules'
  };

  tasks.unshift(newTask);
  saveTasks();
}

/**
 * Toggles overall completion status of a task.
 * @param {string} taskId
 */
function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  task.completed = !task.completed;
  if (task.completed && task.steps.length > 0) {
    // If completing the task, also mark all sub-steps completed
    task.steps.forEach(s => s.completed = true);
  }
  saveTasks();
}

/**
 * Deletes a task cleanly without shame.
 * @param {string} taskId
 */
function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks();
}

/**
 * Toggles completion of an individual micro-step.
 * @param {string} taskId
 * @param {number} stepIndex
 */
function toggleStepCompletion(taskId, stepIndex) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.steps[stepIndex]) return;

  task.steps[stepIndex].completed = !task.steps[stepIndex].completed;

  // Auto-complete parent task if all steps are checked
  const allDone = task.steps.length > 0 && task.steps.every(s => s.completed);
  task.completed = allDone;

  saveTasks();
}

/**
 * Toggles visibility of the breakdown sub-steps accordion.
 * @param {string} taskId
 */
function toggleStepsVisibility(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.stepsExpanded = !task.stepsExpanded;
  saveTasks();
}

// ============================================================================
// 5. Break It Down Feature
// ============================================================================

/**
 * Splits a task into 3-7 manageable micro-steps.
 * Uses LLM if API key is supplied; seamlessly falls back to rules if not.
 * 
 * @param {string} taskId
 */
async function triggerBreakdown(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const btn = document.getElementById(`breakdown-btn-${taskId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '✨ Finding tiny steps...';
  }

  try {
    // Call our breakdown engine from breakdown.js
    const result = await generateBreakdown(task.title, settings);

    task.steps = result.steps.map(stepText => ({
      text: stepText,
      completed: false
    }));
    task.breakdownSource = result.source;
    task.stepsExpanded = true;

    saveTasks();

    if (result.source === 'llm') {
      showToast('✨ Broken down using AI assistance.');
    } else {
      showToast('🌿 Broken down into tiny, actionable steps.');
    }
  } catch (err) {
    console.error('Breakdown error:', err);
    // Absolute fallback guarantee
    const fallback = getRuleBasedBreakdown(task.title);
    task.steps = fallback.map(text => ({ text, completed: false }));
    task.breakdownSource = 'rules';
    task.stepsExpanded = true;
    saveTasks();
    showToast('🌿 Broken down into tiny steps.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Break down';
    }
  }
}

// ============================================================================
// 6. "Just Start" Mode (One Step at a Time + 5-Minute Timer)
// ============================================================================

/**
 * Enters focused single-step mode.
 * @param {string} taskId
 * @param {number} specificStepIndex
 */
async function launchJustStart(taskId, specificStepIndex = 0) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  // If task has no steps yet, generate them first
  if (!task.steps || task.steps.length === 0) {
    const result = await generateBreakdown(task.title, settings);
    task.steps = result.steps.map(stepText => ({ text: stepText, completed: false }));
    task.breakdownSource = result.source;
    task.stepsExpanded = true;
    saveTasks();
  }

  // Find the first uncompleted step or start at requested index
  let targetIndex = specificStepIndex;
  if (targetIndex === 0) {
    const firstUnfinished = task.steps.findIndex(s => !s.completed);
    if (firstUnfinished !== -1) {
      targetIndex = firstUnfinished;
    }
  }

  zenSession.taskId = taskId;
  zenSession.stepIndex = targetIndex;
  zenSession.steps = task.steps;

  // Reset 5-minute timer
  resetZenTimer();

  // Show overlay
  const overlay = document.getElementById('just-start-overlay');
  const activeView = document.getElementById('zen-active-view');
  const completeView = document.getElementById('zen-complete-view');

  activeView.style.display = 'flex';
  completeView.style.display = 'none';
  overlay.classList.add('active');

  updateZenUI();
}

/**
 * Updates the Zen UI for the active step.
 */
function updateZenUI() {
  const step = zenSession.steps[zenSession.stepIndex];
  if (!step) {
    showZenCompletion();
    return;
  }

  const counterEl = document.getElementById('zen-counter');
  const textEl = document.getElementById('zen-step-text');
  const shieldEl = document.getElementById('zen-shield-indicator');

  counterEl.textContent = `Step ${zenSession.stepIndex + 1} of ${zenSession.steps.length}`;
  textEl.textContent = step.text;

  if (shieldEl) {
    shieldEl.style.display = settings.doomscrollShieldEnabled ? 'inline-flex' : 'none';
  }
}

/**
 * Advances to the next step when user clicks "Done".
 */
function completeCurrentZenStep() {
  const task = tasks.find(t => t.id === zenSession.taskId);
  if (task && task.steps[zenSession.stepIndex]) {
    task.steps[zenSession.stepIndex].completed = true;
    saveTasks();
  }

  zenSession.stepIndex++;
  if (zenSession.stepIndex >= zenSession.steps.length) {
    showZenCompletion();
  } else {
    resetZenTimer();
    updateZenUI();
  }
}

/**
 * Advances to the next step when user clicks "Skip" (zero guilt).
 */
function skipCurrentZenStep() {
  zenSession.stepIndex++;
  if (zenSession.stepIndex >= zenSession.steps.length) {
    showZenCompletion();
  } else {
    resetZenTimer();
    updateZenUI();
  }
}

/**
 * Shows the completion celebration inside Zen mode.
 */
function showZenCompletion() {
  pauseZenTimer();
  stopAmbientSound();
  const activeView = document.getElementById('zen-active-view');
  const completeView = document.getElementById('zen-complete-view');

  activeView.style.display = 'none';
  completeView.style.display = 'flex';
}

/**
 * Exits Zen mode.
 */
function closeJustStartMode() {
  pauseZenTimer();
  stopAmbientSound();
  const overlay = document.getElementById('just-start-overlay');
  overlay.classList.remove('active');
  renderTasks();
}

// 5-Minute Timer Logic
function toggleZenTimer() {
  if (zenSession.timerRunning) {
    pauseZenTimer();
  } else {
    startZenTimer();
  }
}

function startZenTimer() {
  zenSession.timerRunning = true;
  const toggleBtn = document.getElementById('zen-timer-toggle');
  toggleBtn.textContent = 'Pause';

  // If user selected an ambient focus sound, start playing smoothly
  if (currentAmbientMode !== 'off') {
    playAmbientSound(currentAmbientMode);
  }

  zenSession.timerInterval = setInterval(() => {
    if (zenSession.timerSeconds > 0) {
      zenSession.timerSeconds--;
      renderZenClock();
    } else {
      pauseZenTimer();
      playGentleChime();
      showToast('5 minutes completed. Take a pause or continue whenever ready.', 'kind-nudge');
    }
  }, 1000);
}

function pauseZenTimer() {
  zenSession.timerRunning = false;
  if (zenSession.timerInterval) {
    clearInterval(zenSession.timerInterval);
    zenSession.timerInterval = null;
  }
  const toggleBtn = document.getElementById('zen-timer-toggle');
  if (toggleBtn) toggleBtn.textContent = 'Start';
  stopAmbientSound();
}

function resetZenTimer() {
  pauseZenTimer();
  zenSession.timerSeconds = 300; // 5 minutes
  renderZenClock();
}

function renderZenClock() {
  const clockEl = document.getElementById('zen-clock');
  const mins = Math.floor(zenSession.timerSeconds / 60);
  const secs = zenSession.timerSeconds % 60;
  clockEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Plays a calm synthesized sine wave chime via Web Audio API.
 * Requires zero external audio files.
 */
function playGentleChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime); // Soothing 528 Hz tone
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    // Audio context may be restricted before user interaction
  }
}

// ============================================================================
// 7. Gentle Reminders (Browser Notification API)
// ============================================================================

/**
 * Initializes minute-by-minute interval to check for user-chosen reminder times.
 */
function initReminderScheduler() {
  setInterval(() => {
    if (!settings.remindersEnabled) return;

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    // Ensure we trigger only once per scheduled minute
    if (currentTimeStr === settings.lastNotifiedMinute) return;

    if (settings.reminderTimes && settings.reminderTimes.includes(currentTimeStr)) {
      settings.lastNotifiedMinute = currentTimeStr;
      triggerGentleNotification();
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Fires a kind, guilt-free reminder.
 */
function triggerGentleNotification() {
  const randomNudge = KIND_NUDGES[Math.floor(Math.random() * KIND_NUDGES.length)];

  // Try browser Notification API if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('QuietStart Nudge', {
        body: randomNudge,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2352796f"><circle cx="12" cy="12" r="10"/></svg>'
      });
    } catch (e) {
      console.warn('Notification API call failed:', e);
    }
  }

  // Always show kind toast in-app as well
  showToast(randomNudge, 'kind-nudge');
}

/**
 * Requests browser permission for notifications.
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications are not supported in this browser.');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('Gentle reminders enabled in browser.');
    return true;
  } else {
    showToast('Browser notifications were declined. In-app nudges will still show.');
    return false;
  }
}

// ============================================================================
// 7B. Sudden Reminders & Anti-Doomscroll Drift Detection
// ============================================================================

let tabHiddenTime = null;
let driftTimerTimeout = null;
let suddenNudgeTimeout = null;

/**
 * Monitors browser tab visibility to catch users who drift away to social media
 * or other tabs, helping them return without guilt or shame.
 */
function initDoomscrollShield() {
  document.addEventListener('visibilitychange', () => {
    if (!settings.doomscrollShieldEnabled) return;

    if (document.hidden) {
      // User switched away from the app
      tabHiddenTime = Date.now();
      const waitMs = (settings.driftMinutes || 3) * 60 * 1000;

      // Set sudden reminder timeout while tab is in background
      driftTimerTimeout = setTimeout(() => {
        triggerDoomscrollNotification();
      }, waitMs);
    } else {
      // User returned to the app
      if (driftTimerTimeout) {
        clearTimeout(driftTimerTimeout);
        driftTimerTimeout = null;
      }

      if (tabHiddenTime) {
        const elapsedMinutes = (Date.now() - tabHiddenTime) / (1000 * 60);
        tabHiddenTime = null;

        // If user was away longer than the drift threshold, greet them with compassion
        if (elapsedMinutes >= (settings.driftMinutes || 3)) {
          triggerWelcomeBackPrompt(elapsedMinutes);
        }
      }
    }
  });
}

/**
 * Fires a kind, guilt-free notification while the user is away.
 */
function triggerDoomscrollNotification() {
  const nudge = DOOMSCROLL_NUDGES[Math.floor(Math.random() * DOOMSCROLL_NUDGES.length)];

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('🌿 Reality Check (Anti-Doomscroll)', {
        body: nudge,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2352796f"><circle cx="12" cy="12" r="10"/></svg>'
      });
    } catch (e) {
      console.warn('Background notification error:', e);
    }
  }
}

/**
 * Displays a warm, zero-shame welcome-back grounding prompt when returning to the tab.
 * @param {number} minutesAway
 */
function triggerWelcomeBackPrompt(minutesAway) {
  playGentleChime();
  const roundedMins = Math.round(minutesAway);
  const msg = `Welcome back! If you drifted into a scroll loop (${roundedMins}m), take a breath and drop your shoulders. No guilt—pick up right where you left off.`;
  showToast(msg, 'drift-alert');
}

/**
 * Periodically schedules sudden surprise grounding nudges (every 8 to 15 minutes)
 * to break automatic trance scrolling.
 */
function initSuddenSurpriseNudges() {
  if (suddenNudgeTimeout) {
    clearTimeout(suddenNudgeTimeout);
    suddenNudgeTimeout = null;
  }

  if (!settings.randomNudgeEnabled) return;

  // Random delay between 8 and 15 minutes
  const randomMinutes = 8 + Math.random() * 7;
  const delayMs = randomMinutes * 60 * 1000;

  suddenNudgeTimeout = setTimeout(() => {
    if (settings.randomNudgeEnabled && !document.hidden) {
      playGentleChime();
      const nudge = DOOMSCROLL_NUDGES[Math.floor(Math.random() * DOOMSCROLL_NUDGES.length)];
      showToast(`⚡ Sudden pause: ${nudge}`, 'surprise-check');
    }
    // Re-schedule next surprise check-in
    initSuddenSurpriseNudges();
  }, delayMs);
}

// ============================================================================
// 8. Settings Modal Logic
// ============================================================================

function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const providerSelect = document.getElementById('setting-provider');
  const apiKeyInput = document.getElementById('setting-api-key');
  const modelInput = document.getElementById('setting-model');
  const endpointInput = document.getElementById('setting-endpoint');
  const remindersToggle = document.getElementById('setting-reminders-toggle');
  const reminderTimesInput = document.getElementById('setting-reminder-times');
  const doomscrollToggle = document.getElementById('setting-doomscroll-toggle');
  const driftMinutesSelect = document.getElementById('setting-drift-minutes');
  const randomNudgeToggle = document.getElementById('setting-random-nudge-toggle');

  providerSelect.value = settings.provider || 'openai';
  apiKeyInput.value = settings.apiKey || '';
  modelInput.value = settings.model || '';
  endpointInput.value = settings.customEndpoint || '';
  remindersToggle.checked = !!settings.remindersEnabled;
  reminderTimesInput.value = (settings.reminderTimes || []).join(', ');

  // Sudden Reminders & Anti-Doomscroll Shield
  if (doomscrollToggle) doomscrollToggle.checked = !!settings.doomscrollShieldEnabled;
  if (driftMinutesSelect) driftMinutesSelect.value = String(settings.driftMinutes || 3);
  if (randomNudgeToggle) randomNudgeToggle.checked = !!settings.randomNudgeEnabled;

  modal.classList.add('active');
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  modal.classList.remove('active');
}

async function saveSettingsFromModal() {
  const providerSelect = document.getElementById('setting-provider');
  const apiKeyInput = document.getElementById('setting-api-key');
  const modelInput = document.getElementById('setting-model');
  const endpointInput = document.getElementById('setting-endpoint');
  const remindersToggle = document.getElementById('setting-reminders-toggle');
  const reminderTimesInput = document.getElementById('setting-reminder-times');
  const doomscrollToggle = document.getElementById('setting-doomscroll-toggle');
  const driftMinutesSelect = document.getElementById('setting-drift-minutes');
  const randomNudgeToggle = document.getElementById('setting-random-nudge-toggle');

  settings.provider = providerSelect.value;
  settings.apiKey = apiKeyInput.value.trim();
  settings.model = modelInput.value.trim();
  settings.customEndpoint = endpointInput.value.trim();
  settings.remindersEnabled = remindersToggle.checked;

  // Parse comma-separated times: e.g. "09:30, 14:30"
  const parsedTimes = reminderTimesInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => /^\d{2}:\d{2}$/.test(t));
  settings.reminderTimes = parsedTimes.length > 0 ? parsedTimes : DEFAULT_SETTINGS.reminderTimes;

  // Save Sudden Reminders & Anti-Doomscroll configuration
  if (doomscrollToggle) settings.doomscrollShieldEnabled = doomscrollToggle.checked;
  if (driftMinutesSelect) settings.driftMinutes = parseInt(driftMinutesSelect.value, 10) || 3;
  if (randomNudgeToggle) settings.randomNudgeEnabled = randomNudgeToggle.checked;

  // Request notification permissions if either reminder type is enabled
  if ((settings.remindersEnabled || settings.doomscrollShieldEnabled) && 'Notification' in window && Notification.permission !== 'granted') {
    await requestNotificationPermission();
  }

  // Re-start sudden surprise timer if setting changed
  initSuddenSurpriseNudges();

  saveSettings();
  closeSettingsModal();
  showToast('Settings saved quietly in your browser.');
}

// ============================================================================
// 9. Rendering & Toasts
// ============================================================================

/**
 * Renders the task list cleanly.
 */
function renderTasks() {
  const container = document.getElementById('task-list-container');
  const counterEl = document.getElementById('active-task-counter');

  const activeCount = tasks.filter(t => !t.completed).length;
  if (counterEl) {
    counterEl.textContent = activeCount === 1 ? '1 active task' : `${activeCount} active tasks`;
  }

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌱</div>
        <div class="empty-state-title">A quiet, open space</div>
        <p class="empty-state-text">Type any task above and press Enter. Whenever you're ready, we can break it down together.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const isCompleted = task.completed;
    const hasSteps = task.steps && task.steps.length > 0;
    const completedStepsCount = hasSteps ? task.steps.filter(s => s.completed).length : 0;

    return `
      <li class="task-card ${isCompleted ? 'completed' : ''}" id="task-card-${task.id}">
        <div class="task-card-main">
          <button class="task-checkbox-custom" onclick="toggleTaskCompletion('${task.id}')" aria-label="Toggle task completion">
            ${isCompleted ? '✓' : ''}
          </button>
          
          <div class="task-content">
            <div class="task-title">${escapeHTML(task.title)}</div>
            <div class="task-meta">
              ${hasSteps ? `<span>${completedStepsCount} of ${task.steps.length} steps</span>` : '<span>Single step</span>'}
              ${task.breakdownSource === 'llm' ? '<span>• AI assisted</span>' : ''}
            </div>
          </div>
        </div>

        <div class="task-actions">
          ${!hasSteps ? `
            <button class="action-pill-btn primary" id="breakdown-btn-${task.id}" onclick="triggerBreakdown('${task.id}')">
              ✨ Break down
            </button>
          ` : `
            <button class="action-pill-btn" onclick="toggleStepsVisibility('${task.id}')">
              ${task.stepsExpanded ? 'Hide steps' : `Show steps (${task.steps.length})`}
            </button>
          `}

          <button class="action-pill-btn primary" onclick="launchJustStart('${task.id}')">
            ▶ Just Start
          </button>

          <button class="delete-btn" onclick="deleteTask('${task.id}')" aria-label="Delete task">
            Remove
          </button>
        </div>

        ${hasSteps && task.stepsExpanded ? `
          <div class="steps-container">
            <div class="steps-header">
              <span>Bite-sized micro-steps (2-5 mins each):</span>
            </div>
            <ul class="steps-list">
              ${task.steps.map((step, idx) => `
                <li class="step-item ${step.completed ? 'completed' : ''}">
                  <input 
                    type="checkbox" 
                    class="step-checkbox" 
                    ${step.completed ? 'checked' : ''} 
                    onchange="toggleStepCompletion('${task.id}', ${idx})"
                  />
                  <span>${escapeHTML(step.text)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </li>
    `;
  }).join('');
}

/**
 * Escapes raw strings for safe HTML rendering.
 */
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Displays a non-intrusive floating toast message.
 * @param {string} message
 * @param {string} customClass
 */
function showToast(message, customClass = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${customClass}`;
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4500);
}

// ============================================================================
// 10. Gentle Calendar & Repeat Days Feature
// ============================================================================

const CAL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Loads task history and seeds demonstration data if history is empty.
 */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    history = raw ? JSON.parse(raw) : {};
  } catch (err) {
    history = {};
  }

  // Seed demo history (yesterday) if brand new, so student can demo repeat immediately
  if (Object.keys(history).length === 0) {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = formatDateKey(yDate);

    history[yStr] = [
      {
        id: 'hist_demo_1',
        title: 'Morning gentle walk & fresh air',
        completed: true,
        steps: [
          { text: 'Put on comfortable walking shoes.', completed: true },
          { text: 'Drink a full glass of cool water.', completed: true },
          { text: 'Step outside and stroll around one block.', completed: true }
        ]
      },
      {
        id: 'hist_demo_2',
        title: 'Review lecture notes for 15 minutes',
        completed: true,
        steps: [
          { text: 'Open your notebook or course slides.', completed: true },
          { text: 'Read the summary of the previous lecture.', completed: true },
          { text: 'List 3 key terms to remember.', completed: true }
        ]
      }
    ];
    saveHistory();
  }
}

/**
 * Saves task history log to localStorage.
 */
function saveHistory() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

/**
 * Syncs active & completed tasks into today's history slot.
 */
function syncCurrentTasksToHistory() {
  const todayKey = formatDateKey(new Date());
  if (tasks.length > 0) {
    history[todayKey] = tasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      steps: t.steps ? t.steps.map(s => ({ text: s.text, completed: s.completed })) : []
    }));
    saveHistory();
  }
}

/**
 * Helper to produce standard YYYY-MM-DD from local date object.
 */
function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats YYYY-MM-DD into a human-friendly date string.
 */
function formatReadableDate(dateStr) {
  const parts = (dateStr || '').split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function openCalendarModal() {
  const modal = document.getElementById('calendar-modal');
  if (!modal) return;

  const today = new Date();
  calViewYear = today.getFullYear();
  calViewMonth = today.getMonth();
  calSelectedDate = formatDateKey(today);

  renderCalendar();
  modal.classList.add('active');
}

function closeCalendarModal() {
  const modal = document.getElementById('calendar-modal');
  if (modal) modal.classList.remove('active');
}

function navigateCalendarMonth(direction) {
  calViewMonth += direction;
  if (calViewMonth > 11) {
    calViewMonth = 0;
    calViewYear++;
  } else if (calViewMonth < 0) {
    calViewMonth = 11;
    calViewYear--;
  }
  renderCalendar();
}

function jumpCalendarToToday() {
  const today = new Date();
  calViewYear = today.getFullYear();
  calViewMonth = today.getMonth();
  calSelectedDate = formatDateKey(today);
  renderCalendar();
}

function selectCalendarDate(dateStr) {
  calSelectedDate = dateStr;
  renderCalendar();
}

/**
 * Renders the calendar month grid and activity dots.
 */
function renderCalendar() {
  const monthTitle = document.getElementById('cal-month-title');
  const grid = document.getElementById('cal-grid');
  if (!monthTitle || !grid) return;

  monthTitle.textContent = `${CAL_MONTH_NAMES[calViewMonth]} ${calViewYear}`;

  const firstDayIndex = new Date(calViewYear, calViewMonth, 1).getDay();
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calViewYear, calViewMonth, 0).getDate();

  const todayStr = formatDateKey(new Date());
  let cellsHTML = '';

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    const prevDate = new Date(calViewYear, calViewMonth - 1, dNum);
    const dateStr = formatDateKey(prevDate);
    const hasActivity = history[dateStr] && history[dateStr].length > 0;
    const isSelected = dateStr === calSelectedDate;

    cellsHTML += `
      <div class="cal-cell other-month ${isSelected ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}" 
           onclick="selectCalendarDate('${dateStr}')">
        <span>${dNum}</span>
      </div>
    `;
  }

  // Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(calViewYear, calViewMonth, d);
    const dateStr = formatDateKey(curDate);

    const isToday = dateStr === todayStr;
    const isSelected = dateStr === calSelectedDate;
    const hasActivity = history[dateStr] && history[dateStr].length > 0;

    cellsHTML += `
      <div class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}"
           onclick="selectCalendarDate('${dateStr}')">
        <span>${d}</span>
      </div>
    `;
  }

  // Leading days for next month
  const totalCells = firstDayIndex + daysInMonth;
  const remainingCells = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
  for (let nextD = 1; nextD <= remainingCells; nextD++) {
    const nextDate = new Date(calViewYear, calViewMonth + 1, nextD);
    const dateStr = formatDateKey(nextDate);
    const hasActivity = history[dateStr] && history[dateStr].length > 0;
    const isSelected = dateStr === calSelectedDate;

    cellsHTML += `
      <div class="cal-cell other-month ${isSelected ? 'selected' : ''} ${hasActivity ? 'has-activity' : ''}"
           onclick="selectCalendarDate('${dateStr}')">
        <span>${nextD}</span>
      </div>
    `;
  }

  grid.innerHTML = cellsHTML;
  renderSelectedDayTasks();
}

/**
 * Renders the tasks list for the selected day in the calendar.
 */
function renderSelectedDayTasks() {
  const titleEl = document.getElementById('cal-selected-date-title');
  const countEl = document.getElementById('cal-selected-count');
  const repeatDayBtn = document.getElementById('cal-repeat-day-btn');
  const tasksListEl = document.getElementById('cal-selected-tasks-list');

  if (!titleEl || !countEl || !tasksListEl) return;

  const dayTasks = history[calSelectedDate] || [];
  titleEl.textContent = formatReadableDate(calSelectedDate);
  countEl.textContent = dayTasks.length === 1 ? '1 task logged' : `${dayTasks.length} tasks logged`;

  if (dayTasks.length > 0) {
    if (repeatDayBtn) repeatDayBtn.style.display = 'inline-flex';

    tasksListEl.innerHTML = dayTasks.map((t, idx) => `
      <div class="cal-task-item">
        <div class="cal-task-item-title">
          <span>${t.completed ? '✓ ' : ''}${escapeHTML(t.title)}</span>
          ${t.steps && t.steps.length > 0 ? `<div class="cal-task-item-meta">${t.steps.length} micro-steps</div>` : ''}
        </div>
        <button class="action-pill-btn" onclick="repeatSingleTaskFromHistory('${calSelectedDate}', ${idx})">
          + Add to Today
        </button>
      </div>
    `).join('');
  } else {
    if (repeatDayBtn) repeatDayBtn.style.display = 'none';
    tasksListEl.innerHTML = `
      <div class="cal-empty-day-hint">
        🌱 A quiet day of rest. Nothing was logged, and that's completely okay.
      </div>
    `;
  }
}

/**
 * Replays all tasks from a past day into today's active workspace.
 * Resets completed status so the user can conquer the routine fresh.
 * @param {string} dateStr
 */
function repeatEntireDay(dateStr) {
  const dayTasks = history[dateStr] || [];
  if (dayTasks.length === 0) return;

  dayTasks.forEach(item => {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: item.title,
      completed: false,
      createdAt: new Date().toISOString(),
      steps: (item.steps || []).map(s => ({
        text: s.text,
        completed: false
      })),
      stepsExpanded: false,
      breakdownSource: 'repeat'
    };
    tasks.unshift(newTask);
  });

  saveTasks();
  closeCalendarModal();
  showToast(`🔁 Repeated ${dayTasks.length} task(s) from ${formatReadableDate(dateStr)} into today!`);
}

/**
 * Adds an individual task from history into today's active task list.
 * @param {string} dateStr
 * @param {number} taskIndex
 */
function repeatSingleTaskFromHistory(dateStr, taskIndex) {
  const dayTasks = history[dateStr] || [];
  const item = dayTasks[taskIndex];
  if (!item) return;

  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: item.title,
    completed: false,
    createdAt: new Date().toISOString(),
    steps: (item.steps || []).map(s => ({
      text: s.text,
      completed: false
    })),
    stepsExpanded: false,
    breakdownSource: 'repeat'
  };

  tasks.unshift(newTask);
  saveTasks();
  showToast(`Added "${item.title}" to today.`);
}

// ============================================================================
// 11. Theme Management (Dark & Light Mode)
// ============================================================================

function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-icon');
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    if (icon) {
      // Sun icon when in dark mode (click to return to light)
      icon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    }
  } else {
    document.body.classList.remove('dark-theme');
    localStorage.setItem(STORAGE_KEY_THEME, 'light');
    if (icon) {
      // Moon icon when in light mode (click to switch to dark)
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  applyTheme(isDark ? 'light' : 'dark');
  showToast(isDark ? "🌿 Switched to soft day mode." : "🌙 Switched to soothing night mode.");
}

// ============================================================================
// 12. Voice Thought Dump (Web Speech API)
// ============================================================================
let speechRecognitionInstance = null;
let isVoiceListening = false;

function initVoiceInput() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceBtn = document.getElementById('voice-input-btn');
  if (!voiceBtn) return;

  if (!SpeechRec) {
    voiceBtn.title = "Speech recognition is not supported in this browser";
    voiceBtn.style.opacity = '0.6';
    voiceBtn.addEventListener('click', () => {
      showToast("Speech recognition isn't supported in this browser. You can type directly!", "kind-nudge");
    });
    return;
  }

  speechRecognitionInstance = new SpeechRec();
  speechRecognitionInstance.continuous = false;
  speechRecognitionInstance.interimResults = true;
  speechRecognitionInstance.lang = 'en-US';

  const inputEl = document.getElementById('quick-add-input');

  speechRecognitionInstance.onstart = () => {
    isVoiceListening = true;
    voiceBtn.classList.add('listening');
    showToast("🎙️ Listening... speak your thought calmly.", "kind-nudge");
  };

  speechRecognitionInstance.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    if (inputEl) {
      inputEl.value = transcript;
    }
  };

  speechRecognitionInstance.onerror = (err) => {
    console.warn("Speech recognition error:", err);
    stopVoiceInput();
  };

  speechRecognitionInstance.onend = () => {
    stopVoiceInput();
  };

  voiceBtn.addEventListener('click', () => {
    if (isVoiceListening) {
      speechRecognitionInstance.stop();
    } else {
      try {
        speechRecognitionInstance.start();
      } catch (e) {
        speechRecognitionInstance.stop();
      }
    }
  });
}

function stopVoiceInput() {
  isVoiceListening = false;
  const voiceBtn = document.getElementById('voice-input-btn');
  if (voiceBtn) voiceBtn.classList.remove('listening');
}

// ============================================================================
// 13. Ambient Focus Audio Synthesizer (Web Audio API)
// Mathematically synthesized 100% offline, zero audio files needed
// ============================================================================
let ambientAudioCtx = null;
let ambientSourceNode = null;
let ambientGainNode = null;
let currentAmbientMode = 'off'; // 'off' | 'brown' | 'rain'

function getAudioContext() {
  if (!ambientAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ambientAudioCtx = new AudioCtx();
  }
  if (ambientAudioCtx && ambientAudioCtx.state === 'suspended') {
    ambientAudioCtx.resume();
  }
  return ambientAudioCtx;
}

function setAmbientSound(mode) {
  currentAmbientMode = mode;
  document.querySelectorAll('.sound-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.sound === mode);
  });

  if (mode === 'off') {
    stopAmbientSound();
    showToast("🎧 Ambient focus audio paused.");
  } else {
    playAmbientSound(mode);
    showToast(`🎧 Playing calming ${mode === 'brown' ? 'Brown Noise' : 'Soft Rain'}...`);
  }
}

function playAmbientSound(mode) {
  stopAmbientSound();
  const ctx = getAudioContext();
  if (!ctx) return;

  const sampleRate = ctx.sampleRate;
  const bufferDuration = 5; // 5-second seamless noise buffer
  const totalSamples = sampleRate * bufferDuration;
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  if (mode === 'brown') {
    // True Brownian Noise (integrated white noise, low frequency focus sound)
    let lastOut = 0.0;
    for (let i = 0; i < totalSamples; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.2; // Gain compensation
    }
  } else if (mode === 'rain') {
    // Gentle Rain: Pink-filtered noise with gentle random water drops
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < totalSamples; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      
      const drop = Math.random() > 0.998 ? (Math.random() * 0.35) : 0;
      data[i] = (pink * 0.12) + drop;
    }
  }

  ambientSourceNode = ctx.createBufferSource();
  ambientSourceNode.buffer = buffer;
  ambientSourceNode.loop = true;

  ambientGainNode = ctx.createGain();
  ambientGainNode.gain.setValueAtTime(0.001, ctx.currentTime);
  ambientGainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 1.2); // Gentle fade-in

  // Biquad filter to keep frequencies smooth and warm
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(mode === 'brown' ? 380 : 1200, ctx.currentTime);

  ambientSourceNode.connect(filter);
  filter.connect(ambientGainNode);
  ambientGainNode.connect(ctx.destination);

  ambientSourceNode.start();
}

function stopAmbientSound() {
  if (ambientGainNode && ambientAudioCtx) {
    try {
      ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, ambientAudioCtx.currentTime);
      ambientGainNode.gain.exponentialRampToValueAtTime(0.0001, ambientAudioCtx.currentTime + 0.4);
      setTimeout(() => {
        if (ambientSourceNode) {
          try { ambientSourceNode.stop(); } catch (e) {}
          ambientSourceNode.disconnect();
          ambientSourceNode = null;
        }
      }, 450);
    } catch (e) {
      if (ambientSourceNode) {
        try { ambientSourceNode.stop(); } catch (e) {}
        ambientSourceNode = null;
      }
    }
  } else if (ambientSourceNode) {
    try { ambientSourceNode.stop(); } catch (e) {}
    ambientSourceNode = null;
  }
}

// ============================================================================
// 14. Step Unstick De-escalation ("Make It Even Smaller")
// ============================================================================

function unstickCurrentZenStep() {
  const task = tasks.find(t => t.id === zenSession.taskId);
  if (!task || !zenSession.steps[zenSession.stepIndex]) return;

  const currentStep = zenSession.steps[zenSession.stepIndex];
  
  // Call splitMicroStep from breakdown.js
  const smallerParts = typeof splitMicroStep === 'function'
    ? splitMicroStep(currentStep.text)
    : [
        `Sit comfortably and look at what is needed for: ${currentStep.text}`,
        `Spend 60 seconds starting the first tiny piece.`
      ];

  const newSubSteps = smallerParts.map(txt => ({
    text: txt,
    completed: false
  }));

  // Splice into task.steps replacing the current step with 2 smaller ones
  task.steps.splice(zenSession.stepIndex, 1, ...newSubSteps);
  
  // Update active zen session
  zenSession.steps = task.steps;

  saveTasks();
  resetZenTimer();
  updateZenUI();
  
  showToast("🤏 De-escalated into 2 tiny, low-pressure steps.", "kind-nudge");
}
