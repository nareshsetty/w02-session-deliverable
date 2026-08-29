import { z } from 'zod';

/**
 * Zod Schema enforcing strict structured output for all LLM Chatbot responses.
 */
export const ChatbotIntentEnum = z.enum([
  'greeting',
  'technical_help',
  'code_review',
  'bug_fix',
  'general_question',
  'off_topic',
  'clarification_needed'
]);

export const TaskComplexityEnum = z.enum(['low', 'medium', 'high']);

export const ResponseMetadataSchema = z.object({
  isActionable: z.boolean({
    required_error: 'isActionable flag is required'
  }),
  complexity: TaskComplexityEnum,
  requiresHumanEscalation: z.boolean({
    required_error: 'requiresHumanEscalation flag is required'
  })
});

export const ChatbotResponseSchema = z.object({
  thoughtProcess: z.string({
    required_error: 'thoughtProcess is required'
  }).min(5, 'thoughtProcess must be at least 5 characters long'),

  intent: ChatbotIntentEnum,

  response: z.string({
    required_error: 'response text is required'
  }).min(10, 'response must be at least 10 characters long'),

  confidenceScore: z.number({
    required_error: 'confidenceScore is required'
  }).min(0.0).max(1.0),

  category: z.string({
    required_error: 'category is required'
  }).min(2, 'category must be specified'),

  suggestedFollowUps: z.array(z.string()).min(1, 'At least 1 follow-up question is required'),

  metadata: ResponseMetadataSchema
});

export type ChatbotResponse = z.infer<typeof ChatbotResponseSchema>;
export type ChatbotIntent = z.infer<typeof ChatbotIntentEnum>;

export interface ValidationResult {
  success: boolean;
  data?: ChatbotResponse;
  errors?: string[];
}

/**
 * Validates arbitrary input or parsed JSON against ChatbotResponseSchema.
 */
export function validateChatbotResponse(input: unknown): ValidationResult {
  const parseResult = ChatbotResponseSchema.safeParse(input);
  if (parseResult.success) {
    return {
      success: true,
      data: parseResult.data
    };
  } else {
    const formattedErrors = parseResult.error.errors.map(
      (err) => `[${err.path.join('.')}]: ${err.message}`
    );
    return {
      success: false,
      errors: formattedErrors
    };
  }
}
