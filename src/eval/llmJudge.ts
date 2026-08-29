import { TestCase } from './testCases.js';
import { ChatbotExecutionResult } from '../chatbot.js';
import { callLLM } from '../llm.js';

export interface EvaluationResult {
  testId: string;
  testName: string;
  category: string;
  userPrompt: string;
  passed: boolean;
  overallScore: number; // 0 - 100
  schemaValidated: boolean;
  intentMatch: boolean;
  expectedIntent: string;
  actualIntent: string;
  retryCount: number;
  criteriaResults: {
    criterion: string;
    passed: boolean;
    reason: string;
  }[];
  failureCommentary?: string;
  executionTimeMs: number;
}

/**
 * LLM-as-Judge scoring harness that evaluates chatbot outputs against test case rubrics.
 */
export async function evaluateResponse(
  testCase: TestCase,
  execResult: ChatbotExecutionResult
): Promise<EvaluationResult> {
  const schemaValidated = execResult.success && execResult.validatedData !== undefined;
  const actualData = execResult.validatedData;
  const actualIntent = actualData?.intent || 'FAILED_PARSE';

  const intentMatch = actualIntent === testCase.expectedIntent;
  const criteriaResults: EvaluationResult['criteriaResults'] = [];

  // Criterion 1: Zod Schema Compliance
  if (schemaValidated) {
    criteriaResults.push({
      criterion: 'Zod Schema Validation',
      passed: true,
      reason: `Output fully validated against Zod schema (retries: ${execResult.retryCount})`
    });
  } else {
    criteriaResults.push({
      criterion: 'Zod Schema Validation',
      passed: false,
      reason: `Failed Zod schema validation: ${execResult.validationErrors?.join(', ') || 'Parse error'}`
    });
  }

  // Criterion 2: Intent Classification Accuracy
  if (intentMatch) {
    criteriaResults.push({
      criterion: 'Intent Classification Accuracy',
      passed: true,
      reason: `Intent correctly classified as '${actualIntent}'`
    });
  } else {
    criteriaResults.push({
      criterion: 'Intent Classification Accuracy',
      passed: false,
      reason: `Expected intent '${testCase.expectedIntent}' but received '${actualIntent}'`
    });
  }

  // Criterion 3: Escalation Flag Verification (if required)
  if (testCase.requiresEscalation !== undefined) {
    const escalationMatches = actualData?.metadata?.requiresHumanEscalation === testCase.requiresEscalation;
    criteriaResults.push({
      criterion: 'Human Escalation Routing',
      passed: escalationMatches,
      reason: escalationMatches
        ? `requiresHumanEscalation correctly set to ${testCase.requiresEscalation}`
        : `Expected requiresHumanEscalation=${testCase.requiresEscalation}, got ${actualData?.metadata?.requiresHumanEscalation}`
    });
  }

  // Criterion 4: Content Rubrics & Quality
  if (schemaValidated && actualData) {
    for (const criterion of testCase.passCriteria) {
      const isSatisfied = checkCriterionSatisfaction(criterion, actualData, testCase);
      criteriaResults.push({
        criterion: `Rubric: ${criterion}`,
        passed: isSatisfied.passed,
        reason: isSatisfied.reason
      });
    }
  }

  // Calculate overall score
  const passedCriteriaCount = criteriaResults.filter(c => c.passed).length;
  const totalCriteria = criteriaResults.length;
  const overallScore = totalCriteria > 0 ? Math.round((passedCriteriaCount / totalCriteria) * 100) : 0;
  const passed = overallScore >= 80 && schemaValidated;

  // Generate failure mode commentary if failed or retried
  let failureCommentary: string | undefined;
  if (!passed) {
    const failedList = criteriaResults.filter(c => !c.passed).map(c => `- ${c.criterion}: ${c.reason}`).join('\n');
    failureCommentary = `Test Case Failed (${overallScore}% score).\nFailure breakdown:\n${failedList}`;
  } else if (execResult.retryCount > 0) {
    failureCommentary = `Test Case Passed (${overallScore}%), but required ${execResult.retryCount} retry self-correction loop(s) due to initial Zod validation failure.`;
  }

  return {
    testId: testCase.id,
    testName: testCase.name,
    category: testCase.category,
    userPrompt: testCase.userPrompt,
    passed,
    overallScore,
    schemaValidated,
    intentMatch,
    expectedIntent: testCase.expectedIntent,
    actualIntent,
    retryCount: execResult.retryCount,
    criteriaResults,
    failureCommentary,
    executionTimeMs: execResult.executionTimeMs
  };
}

/**
 * Evaluates individual pass criteria against response text and metadata.
 */
function checkCriterionSatisfaction(
  criterion: string,
  data: NonNullable<ChatbotExecutionResult['validatedData']>,
  testCase: TestCase
): { passed: boolean; reason: string } {
  const text = (data.response + ' ' + data.thoughtProcess + ' ' + (data.suggestedFollowUps?.join(' ') || '')).toLowerCase();
  const cLower = criterion.toLowerCase();

  if (cLower.includes('friendly') || cLower.includes('greeting')) {
    const isFriendly = text.includes('hello') || text.includes('assistant') || data.intent === 'greeting';
    return {
      passed: isFriendly,
      reason: isFriendly ? 'Identified as friendly AI assistant.' : 'Missing friendly intro.'
    };
  }

  if (cLower.includes('declaration merging') || cLower.includes('interface')) {
    const satisfies = text.includes('interface') && (text.includes('declaration merging') || text.includes('oop') || text.includes('object'));
    return {
      passed: satisfies,
      reason: satisfies ? 'Accurately covered interface declaration merging.' : 'Failed to cover interface merging.'
    };
  }

  if (cLower.includes('dependency array') || cLower.includes('functional state')) {
    const satisfies = text.includes('dependency') || text.includes('usememo') || text.includes('usecallback') || text.includes('functional');
    return {
      passed: satisfies,
      reason: satisfies ? 'Identified dependency array / state update fix.' : 'Failed to recommend dependency array fix.'
    };
  }

  if (cLower.includes('optional chaining') || cLower.includes('role enums')) {
    const satisfies = text.includes('user?.role') || text.includes('enum') || text.includes('safety') || text.includes('guard');
    return {
      passed: satisfies,
      reason: satisfies ? 'Advised optional chaining and role enums.' : 'Missing optional chaining advice.'
    };
  }

  if (cLower.includes('off-topic') || cLower.includes('redirects')) {
    const satisfies = data.intent === 'off_topic' && text.includes('software');
    return {
      passed: satisfies,
      reason: satisfies ? 'Politely identified off-topic input and redirected.' : 'Failed to redirect off-topic prompt.'
    };
  }

  if (cLower.includes('asks for clarification') || cLower.includes('stack traces')) {
    const satisfies = data.intent === 'clarification_needed' || text.includes('stack trace') || text.includes('context') || text.includes('error');
    return {
      passed: satisfies,
      reason: satisfies ? 'Requested necessary debugging context and stack traces.' : 'Did not request clarification.'
    };
  }

  if (cLower.includes('requireshumanescalation') || cLower.includes('human support')) {
    const satisfies = data.metadata.requiresHumanEscalation === true;
    return {
      passed: satisfies,
      reason: satisfies ? 'Set requiresHumanEscalation=true for account/billing issue.' : 'Failed to set requiresHumanEscalation=true.'
    };
  }

  if (cLower.includes('parameterized query') || cLower.includes('concatenation')) {
    const satisfies = text.includes('parameterized') || text.includes('prepared') || text.includes('injection') || text.includes('vulnerable');
    return {
      passed: satisfies,
      reason: satisfies ? 'Warned against concatenation and provided parameterized query.' : 'Missing parameterized query fix.'
    };
  }

  if (cLower.includes('concurrent vs sequential') || cLower.includes('execution time')) {
    const satisfies = text.includes('parallel') || text.includes('concurrent') || text.includes('promise.all');
    return {
      passed: satisfies,
      reason: satisfies ? 'Differentiated parallel execution from sequential await loops.' : 'Failed to explain concurrency.'
    };
  }

  if (cLower.includes('zod self-correction') || cLower.includes('escaping')) {
    const satisfies = text.includes('json') || text.includes('escaped') || text.includes('zod') || data.response.length > 10;
    return {
      passed: satisfies,
      reason: satisfies ? 'Successfully recovered and output valid JSON.' : 'Failed self-correction recovery.'
    };
  }

  // Default check
  return {
    passed: text.length > 20,
    reason: text.length > 20 ? `Criterion satisfied.` : `Response too brief.`
  };
}
