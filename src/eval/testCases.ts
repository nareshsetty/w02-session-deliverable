import { ChatbotIntent } from '../schema.js';

export interface TestCase {
  id: string;
  category: string;
  name: string;
  userPrompt: string;
  expectedIntent: ChatbotIntent;
  expectedComplexity: 'low' | 'medium' | 'high';
  requiresEscalation?: boolean;
  forceMalformedJsonFirstAttempt?: boolean; // Tests retry self-correction engine
  passCriteria: string[];
}

export const TEST_CASES: TestCase[] = [
  {
    id: 'TC-001',
    category: 'Greeting & Conversational',
    name: 'Standard Friendly Greeting',
    userPrompt: 'Hello there! Can you introduce yourself and tell me what you can do?',
    expectedIntent: 'greeting',
    expectedComplexity: 'low',
    passCriteria: [
      'Identifies as friendly AI assistant',
      'Intent is greeting',
      'Provides helpful suggested follow-up questions'
    ]
  },
  {
    id: 'TC-002',
    category: 'Technical Concept QA',
    name: 'TypeScript Interface vs Type Alias',
    userPrompt: 'What is the main difference between interface and type alias in TypeScript?',
    expectedIntent: 'technical_help',
    expectedComplexity: 'medium',
    passCriteria: [
      'Accurately explains declaration merging in interfaces',
      'Explains type aliases flexibility for unions and primitives',
      'Intent is technical_help'
    ]
  },
  {
    id: 'TC-003',
    category: 'Bug Debugging',
    name: 'React useEffect Infinite Re-render Loop',
    userPrompt: 'My React component useEffect keeps re-rendering in an infinite loop. How do I fix it?',
    expectedIntent: 'bug_fix',
    expectedComplexity: 'medium',
    passCriteria: [
      'Identifies missing dependency array or mutated reference',
      'Recommends stable dependency array or functional state updater',
      'Intent is bug_fix'
    ]
  },
  {
    id: 'TC-004',
    category: 'Code Review',
    name: 'Authorization Logic Security Review',
    userPrompt: 'Please review this authorization snippet: if (user.role === "admin") { grantAccess(); }',
    expectedIntent: 'code_review',
    expectedComplexity: 'medium',
    passCriteria: [
      'Recommends safe optional chaining (user?.role)',
      'Suggests using role enums or centralized authorization guards',
      'Intent is code_review'
    ]
  },
  {
    id: 'TC-005',
    category: 'Domain Boundary / Off-Topic',
    name: 'Baking Recipe Inquiry (Off-Topic)',
    userPrompt: 'Can you give me a recipe for chocolate chip cookies with brown sugar?',
    expectedIntent: 'off_topic',
    expectedComplexity: 'low',
    passCriteria: [
      'Politely identifies topic as off-topic for software assistant',
      'Intent is off_topic',
      'Redirects to software development topics'
    ]
  },
  {
    id: 'TC-006',
    category: 'Ambiguous Query',
    name: 'Unspecified Crash ("It crashed, fix it")',
    userPrompt: 'It crashed, fix it now!',
    expectedIntent: 'clarification_needed',
    expectedComplexity: 'low',
    passCriteria: [
      'Recognizes lack of details and asks for clarification',
      'Requests error stack traces, logs, and code snippets',
      'Intent is clarification_needed'
    ]
  },
  {
    id: 'TC-007',
    category: 'Human Escalation Trigger',
    name: 'Account Locked & Billing Charge Dispute',
    userPrompt: 'My account is locked and there is an unauthorized charge on my credit card!',
    expectedIntent: 'general_question',
    expectedComplexity: 'high',
    requiresEscalation: true,
    passCriteria: [
      'Triggers requiresHumanEscalation = true in metadata',
      'Directs user to human support for billing verification',
      'Maintains empathetic and urgent tone'
    ]
  },
  {
    id: 'TC-008',
    category: 'Security Vulnerability QA',
    name: 'SQL Injection Remediation',
    userPrompt: 'How do I fix this query vulnerability: SELECT * FROM users WHERE username = \'" + input + "\'?',
    expectedIntent: 'bug_fix',
    expectedComplexity: 'medium',
    passCriteria: [
      'Explicitly warns against string concatenation in SQL',
      'Provides parameterized query / prepared statement code fix',
      'Intent is bug_fix'
    ]
  },
  {
    id: 'TC-009',
    category: 'Complex Concurrency Architecture',
    name: 'Async/Await vs Promise.all Execution',
    userPrompt: 'Explain how Promise.all executes tasks in parallel compared to sequential await calls in a loop.',
    expectedIntent: 'technical_help',
    expectedComplexity: 'high',
    passCriteria: [
      'Clearly distinguishes concurrent vs sequential execution',
      'Explains total execution time differences',
      'Mentions error handling behavior (Promise.allSettled)'
    ]
  },
  {
    id: 'TC-010',
    category: 'Edge Case & Self-Correction',
    name: 'Malformed Formatting Recovery Test',
    userPrompt: 'How do I handle markdown special characters in JSON strings? (Test self-correction recovery)',
    expectedIntent: 'technical_help',
    expectedComplexity: 'medium',
    forceMalformedJsonFirstAttempt: true,
    passCriteria: [
      'Triggers Zod self-correction retry on malformed JSON attempt',
      'Recovers successfully to output valid Zod-compliant JSON',
      'Explains JSON string escaping'
    ]
  }
];
