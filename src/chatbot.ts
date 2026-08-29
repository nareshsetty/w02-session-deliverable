import { callLLM } from './llm.js';
import { validateChatbotResponse, ChatbotResponse, ValidationResult } from './schema.js';

export interface ChatbotExecutionResult {
  success: boolean;
  validatedData?: ChatbotResponse;
  rawResponse: string;
  retryCount: number;
  validationErrors?: string[];
  executionTimeMs: number;
}

export class StructuredChatbot {
  private systemInstruction: string;
  private maxRetries: number;

  constructor(systemInstruction?: string, maxRetries: number = 2) {
    this.systemInstruction = systemInstruction || `You are an expert software developer and technical assistant.
Respond to the user prompt by outputting ONLY a valid JSON object adhering strictly to the schema:
{
  "thoughtProcess": "string (min 5 chars)",
  "intent": "greeting" | "technical_help" | "code_review" | "bug_fix" | "general_question" | "off_topic" | "clarification_needed",
  "response": "string (min 10 chars)",
  "confidenceScore": number (0.0 to 1.0),
  "category": "string",
  "suggestedFollowUps": ["string"],
  "metadata": {
    "isActionable": boolean,
    "complexity": "low" | "medium" | "high",
    "requiresHumanEscalation": boolean
  }
}`;
    this.maxRetries = maxRetries;
  }

  /**
   * Generates a Zod-validated response for the given user prompt.
   * Includes automated retry & self-correction loop on Zod validation failure.
   */
  async generateResponse(userPrompt: string, forceMalformedJson?: boolean): Promise<ChatbotExecutionResult> {
    const startTime = Date.now();
    let currentPrompt = userPrompt;
    let retries = 0;
    let lastRawResponse = '';
    let lastValidationErrors: string[] = [];

    while (retries <= this.maxRetries) {
      // Force malformed json only on first attempt if flag set for testing retry loop
      const isForce = forceMalformedJson && retries === 0;
      
      lastRawResponse = await callLLM({
        prompt: currentPrompt,
        systemInstruction: this.systemInstruction,
        forceMalformedJson: isForce
      });

      // Strip markdown code fence wrappers if present
      let cleanedJsonStr = lastRawResponse.trim();
      if (cleanedJsonStr.startsWith('```json')) {
        cleanedJsonStr = cleanedJsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJsonStr.startsWith('```')) {
        cleanedJsonStr = cleanedJsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        const parsedObj = JSON.parse(cleanedJsonStr);
        const validation: ValidationResult = validateChatbotResponse(parsedObj);

        if (validation.success && validation.data) {
          return {
            success: true,
            validatedData: validation.data,
            rawResponse: lastRawResponse,
            retryCount: retries,
            executionTimeMs: Date.now() - startTime
          };
        } else {
          lastValidationErrors = validation.errors || ['Schema validation failed'];
        }
      } catch (err: any) {
        lastValidationErrors = [`JSON Syntax Error: ${err.message}`];
      }

      // If validation or JSON parsing failed, construct self-correction prompt for retry
      retries++;
      if (retries <= this.maxRetries) {
        currentPrompt = `${userPrompt}\n\n[SYSTEM ERROR - RETRY ATTEMPT ${retries}]: Your previous response failed JSON schema validation with the following errors:\n${lastValidationErrors.map(e => `- ${e}`).join('\n')}\n\nPlease correct these errors and output valid JSON matching the required schema strictly.`;
      }
    }

    // Return failure result if retries exceeded
    return {
      success: false,
      rawResponse: lastRawResponse,
      retryCount: retries - 1,
      validationErrors: lastValidationErrors,
      executionTimeMs: Date.now() - startTime
    };
  }
}
