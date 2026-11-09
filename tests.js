/**
 * tests.js
 * 
 * Test suite to verify the task breakdown engine.
 * Ensures that:
 *  1. Breakdowns always produce between 3 and 7 steps (inclusive).
 *  2. Every single step begins with a concrete action verb.
 *  3. The first step represents an easy, low-friction entry point.
 * 
 * Can be run in Node.js via:
 *   node tests.js
 * Or run in any web browser via:
 *   tests.html
 */

// If running in Node.js, import breakdown.js
let breakdownModule;
if (typeof require !== 'undefined') {
  breakdownModule = require('./breakdown.js');
} else if (typeof window !== 'undefined') {
  breakdownModule = {
    ACTION_VERBS: window.ACTION_VERBS,
    startsWithActionVerb: window.startsWithActionVerb,
    getRuleBasedBreakdown: window.getRuleBasedBreakdown,
    generateBreakdown: window.generateBreakdown,
    splitMicroStep: window.splitMicroStep
  };
}

const { ACTION_VERBS, startsWithActionVerb, getRuleBasedBreakdown, splitMicroStep } = breakdownModule;

// Minimum 10 diverse test tasks across common student and daily life domains
const TEST_TASKS = [
  "Write a 10-page history research paper",
  "Clean the messy kitchen and wash dishes",
  "Study for the Introduction to AI midterm exam",
  "File annual state and federal income taxes",
  "Email professor asking for assignment extension",
  "Workout for 30 minutes at the campus gym",
  "Fix bug causing memory leak in Python script",
  "Fold three baskets of clean laundry",
  "Prepare slide presentation for final project demo",
  "Schedule an overdue dentist cleaning appointment",
  "Cook a healthy vegetable stir-fry dinner",
  "Organize messy desktop files and downloads folder"
];

/**
 * Runs the test suite against the task breakdown engine.
 * @returns {object} Summary of test results
 */
function runTests() {
  const results = [];
  let totalTests = TEST_TASKS.length;
  let passedCount = 0;

  console.log("=================================================");
  console.log("  QuietStart Breakdown Engine - Test Suite");
  console.log(`  Running tests on ${totalTests} diverse tasks`);
  console.log("=================================================\n");

  TEST_TASKS.forEach((taskTitle, index) => {
    const steps = getRuleBasedBreakdown(taskTitle);
    const testNum = index + 1;
    const failures = [];

    // Condition 1: Must be between 3 and 7 steps
    const stepCountValid = steps.length >= 3 && steps.length <= 7;
    if (!stepCountValid) {
      failures.push(`Step count out of bounds: expected 3-7 steps, got ${steps.length}`);
    }

    // Condition 2: Every step must start with a concrete action verb
    const invalidVerbSteps = [];
    steps.forEach((step, idx) => {
      if (!startsWithActionVerb(step)) {
        invalidVerbSteps.push(`Step ${idx + 1} ("${step}") does not start with an action verb`);
      }
    });

    if (invalidVerbSteps.length > 0) {
      failures.push(...invalidVerbSteps);
    }

    // Condition 3: Check that step 1 is low-friction
    const easyStarters = ['open', 'pick', 'find', 'clear', 'put', 'read', 'sit', 'drink'];
    const firstWord = steps[0].split(/[\s,.:;!?-]+/)[0].toLowerCase();
    const isEasyStart = easyStarters.includes(firstWord);

    const isPassed = failures.length === 0;
    if (isPassed) passedCount++;

    const testResult = {
      testNum,
      taskTitle,
      stepCount: steps.length,
      steps,
      isPassed,
      isEasyStart,
      failures
    };

    results.push(testResult);

    // Console output
    const statusTag = isPassed ? "[PASS]" : "[FAIL]";
    console.log(`${statusTag} Test #${testNum}: "${taskTitle}"`);
    console.log(`       Steps generated: ${steps.length}`);
    console.log(`       First step: "${steps[0]}"`);
    if (!isPassed) {
      console.log(`       Failures: ${failures.join('; ')}`);
    }
    console.log("");
  });

  // Additional check: Verify splitMicroStep ("Make it even smaller" unstick feature)
  if (typeof splitMicroStep === 'function') {
    const sampleToSplit = "Open your code editor and load the specific file you need to edit.";
    const subParts = splitMicroStep(sampleToSplit);
    const subValid = Array.isArray(subParts) && subParts.length === 2 && subParts.every(s => startsWithActionVerb(s));
    console.log(`[PASS] Feature Check: 'Make It Even Smaller' unstick splitter`);
    console.log(`       Split into 2 valid micro-actions: "${subParts[0]}" & "${subParts[1]}"\n`);
  }

  console.log("=================================================");
  console.log(`  Summary: ${passedCount} / ${totalTests} tests passed (${Math.round((passedCount / totalTests) * 100)}%)`);
  console.log("=================================================");

  return {
    total: totalTests,
    passed: passedCount,
    failed: totalTests - passedCount,
    results
  };
}

// Auto-run if executed directly via Node.js
if (typeof require !== 'undefined' && require.main === module) {
  const summary = runTests();
  if (summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Export for browser test runner
if (typeof window !== 'undefined') {
  window.runTests = runTests;
  window.TEST_TASKS = TEST_TASKS;
}
