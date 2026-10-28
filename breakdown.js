/**
 * breakdown.js
 * 
 * Logic for splitting overwhelming tasks into 3 to 7 tiny, bite-sized micro-steps.
 * Supports:
 *   1. Generative LLM breakdown via browser API call (OpenAI-compatible or Google Gemini)
 *   2. Heuristic rule-based fallback breakdown (100% offline, guaranteed action-verb starters)
 * 
 * Note: Designed for educational demonstration in an Introduction to AI course.
 */

// Comprehensive dictionary of common concrete action verbs for validation & generation
const ACTION_VERBS = [
  'Open', 'Find', 'Read', 'Write', 'Pick', 'Put', 'Place', 'Gather',
  'Clear', 'Select', 'Set', 'Draft', 'Send', 'Review', 'Save', 'Close',
  'List', 'Check', 'Sit', 'Wipe', 'Wash', 'Move', 'Turn', 'Log',
  'Create', 'Print', 'Outline', 'Browse', 'Search', 'Take', 'Drink',
  'Pack', 'Unpack', 'Sort', 'Delete', 'Organize', 'Type', 'Call', 'Ask',
  'Start', 'Add', 'Test', 'Inspect', 'Choose', 'Step', 'Fill', 'Fold',
  'Complete', 'Do', 'Run', 'Work', 'Pull', 'Chop', 'Focus', 'Prepare',
  'Plan', 'Spend', 'Practice', 'Try', 'Begin', 'Finish', 'Listen', 'Watch'
];

/**
 * Checks whether a given text string starts with a recognized action verb.
 * @param {string} stepText
 * @returns {boolean}
 */
function startsWithActionVerb(stepText) {
  if (!stepText || typeof stepText !== 'string') return false;
  const trimmed = stepText.trim();
  const firstWord = trimmed.split(/[\s,.:;!?-]+/)[0];
  if (!firstWord) return false;

  // Case-insensitive comparison against our verb dictionary
  const lowerFirst = firstWord.toLowerCase();
  return ACTION_VERBS.some(v => v.toLowerCase() === lowerFirst);
}

/**
 * Rule-based heuristic breakdown engine.
 * Categorizes task titles based on keyword detection and generates 3-7 micro-steps,
 * ensuring each step begins with a concrete action verb and starts with an easy first step.
 * 
 * @param {string} taskTitle - The raw task string entered by the user
 * @returns {string[]} Array of 3-7 micro-steps
 */
function getRuleBasedBreakdown(taskTitle) {
  const t = (taskTitle || '').toLowerCase().trim();

  // 1. Appointments / Medical / Admin / Paperwork
  // Checked early so "dentist cleaning" matches appointment/dentist, not house cleaning
  if (/appointment|dentist|doctor|clinic|schedule\b|tax|taxes|bill\b|passport|license\b|renew|register\b|paperwork|form\b/i.test(t)) {
    return [
      "Find the paperwork, account website, or phone number needed.",
      "Open the portal or dial the number on your phone.",
      "Fill in the basic personal details (name, date, contact info).",
      "Complete the first required section or confirm your booking.",
      "Save a screenshot or write down the confirmation number."
    ];
  }

  // 2. Communication / Email / Messaging
  // Checked before academic so "email professor about assignment" routes to communication
  if (/email|message|write to|text\b|reply|respond|contact|call\b|ask\b/i.test(t)) {
    return [
      "Open your messaging or email app and click 'New Message'.",
      "Type the recipient's name and a short, clear subject line.",
      "Draft two simple, polite sentences explaining what you need.",
      "Read it over once to ensure clarity and kindness.",
      "Send the message and close the tab."
    ];
  }

  // 3. Presentations / Slides / Speaking
  if (/presentation|slides|slide deck|speech|demo\b/i.test(t)) {
    return [
      "Open your slide presentation app and create a blank title slide.",
      "Type a working title and your name on slide 1.",
      "List 3 main points or section headers you want to talk about.",
      "Add one bullet point or image idea to the first main slide.",
      "Save your presentation file and close the window."
    ];
  }

  // 4. Academic / Writing / Study
  if (/study|exam|quiz|homework|assignment|read\b|chapter|paper|essay|thesis|research|lecture|class\b/i.test(t)) {
    return [
      "Open your study materials or document to the exact page you need.",
      "Read just the first paragraph or review your prompt instructions.",
      "List 2 or 3 quick bullet points of ideas or key terms.",
      "Draft one simple paragraph or solve one practice question.",
      "Review your notes briefly and save your progress."
    ];
  }

  // 5. Cleaning / Chores / Organizing
  if (/clean\b|cleaning\b|wash\b|dishes|laundry|tidy|room\b|kitchen|sweep|vacuum|trash|fold\b|organize|bed\b|closet/i.test(t)) {
    return [
      "Pick up 3 obvious items off the floor or nearest surface.",
      "Put dirty items into their respective bins, sink, or hamper.",
      "Wipe down just one tabletop or counter with a cloth.",
      "Take out the trash bag or clear one small designated corner.",
      "Step back and appreciate the clear space you created."
    ];
  }

  // 6. Coding / Technical / Software
  if (/code\b|program\b|bug\b|debug|function|git\b|repo|app\b|feature|script|compile|website|test\b/i.test(t)) {
    return [
      "Open your code editor and load the specific file you need to edit.",
      "Inspect the exact error message or read the user story requirement.",
      "Add a single console print or test case to observe the behavior.",
      "Write a minimal fix or scaffold the first helper function.",
      "Run the code once to see the result and save your file."
    ];
  }

  // 7. Fitness / Health / Physical Wellness
  if (/workout|gym|run\b|walk\b|exercise|stretch|yoga|hydrate|water\b/i.test(t)) {
    return [
      "Put on comfortable shoes and your favorite workout clothes.",
      "Drink a full glass of cool water.",
      "Do 2 minutes of gentle stretching or arm circles.",
      "Move your body at an easy, enjoyable pace for 5 minutes.",
      "Take 3 slow, deep breaths and celebrate starting."
    ];
  }

  // 8. Cooking / Meals / Food Prep
  if (/cook\b|bake\b|dinner|lunch|breakfast|meal|recipe|groceries|eat\b/i.test(t)) {
    return [
      "Clear a small square of clean counter space.",
      "Pull out the main ingredients and place them on the counter.",
      "Chop or prepare just the first ingredient.",
      "Turn on the heat or oven and start the initial cooking step.",
      "Place used prep tools in the sink to keep the counter clean."
    ];
  }

  // 9. General Intelligent Fallback
  // Formulates concrete, low-friction steps tailored around the user's task
  const cleanTitle = taskTitle.replace(/^(to|do|finish|work on)\s+/i, '').trim();
  return [
    `Open or gather the essential items needed for "${cleanTitle}".`,
    "Sit down in a comfortable spot and take one slow, relaxing breath.",
    "Choose the single easiest piece of the task to tackle first.",
    "Focus on that easy piece for just 3 quiet minutes without judging progress.",
    "Save your work or set things down, knowing you made real progress."
  ];
}

/**
 * Calls an external LLM API to break down a task.
 * Supports OpenAI-compatible endpoints or Google Gemini API.
 * 
 * If no key is provided, or if the API call fails or times out,
 * it returns null so the caller can fall back to the rule-based breakdown.
 * 
 * @param {string} taskTitle
 * @param {object} settings - { provider, apiKey, model, customEndpoint }
 * @returns {Promise<string[]|null>} Array of 3-7 steps or null on error
 */
async function getLLMBreakdown(taskTitle, settings) {
  if (!settings || !settings.apiKey || !settings.apiKey.trim()) {
    return null;
  }

  const apiKey = settings.apiKey.trim();
  const provider = settings.provider || 'openai'; // 'openai' or 'gemini'
  const model = settings.model || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');

  const systemInstructions = 
`You are a compassionate task coach for people who struggle with executive dysfunction and task paralysis.
Break the user's task into 3 to 7 tiny, approachable micro-steps.
Strict Rules:
1. Output MUST be between 3 and 7 steps (inclusive).
2. Each step must be doable in roughly 2-5 minutes.
3. The very first step must be effortless and low-friction (e.g. opening an app, gathering one item).
4. EVERY step MUST begin with a concrete action verb (e.g., Open, Read, Write, Pick, Put, Find, List, Check).
5. Tone must be calm, kind, and completely free of guilt or pressure.
6. Return ONLY a valid JSON array of strings. Do not include markdown code fences or any conversational preamble.`;

  const userPrompt = `Task to break down: "${taskTitle}"`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9-second timeout safeguard

    let response;

    if (provider === 'gemini') {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        }),
        signal: controller.signal
      });
    } else {
      // Default: OpenAI or OpenAI-compatible endpoint
      const endpoint = settings.customEndpoint && settings.customEndpoint.trim()
        ? settings.customEndpoint.trim()
        : 'https://api.openai.com/v1/chat/completions';

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`LLM API returned status ${response.status}. Falling back to rule-based breakdown.`);
      return null;
    }

    const data = await response.json();
    let rawText = '';

    if (provider === 'gemini') {
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      rawText = data?.choices?.[0]?.message?.content || '';
    }

    // Clean any accidental markdown code blocks (```json ... ```)
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length >= 3 && parsed.length <= 7) {
      const sanitized = parsed.map(step => String(step).trim());
      return sanitized;
    }

    console.warn("LLM returned non-standard step count or format. Falling back to rule engine.");
    return null;
  } catch (err) {
    console.warn("LLM breakdown encountered an error or timed out:", err.message);
    return null;
  }
}

/**
 * Master breakdown function: tries LLM if configured, otherwise returns rule-based breakdown.
 * 
 * @param {string} taskTitle
 * @param {object} settings
 * @returns {Promise<{ steps: string[], source: 'llm' | 'rules' }>}
 */
async function generateBreakdown(taskTitle, settings) {
  if (settings && settings.apiKey && settings.apiKey.trim()) {
    try {
      const llmSteps = await getLLMBreakdown(taskTitle, settings);
      if (llmSteps && llmSteps.length >= 3 && llmSteps.length <= 7) {
        return { steps: llmSteps, source: 'llm' };
      }
    } catch (e) {
      // Non-blocking fallback
    }
  }

  return { steps: getRuleBasedBreakdown(taskTitle), source: 'rules' };
}

// Export for Node test runner (if running in Node environment)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACTION_VERBS,
    startsWithActionVerb,
    getRuleBasedBreakdown,
    getLLMBreakdown,
    generateBreakdown
  };
}
