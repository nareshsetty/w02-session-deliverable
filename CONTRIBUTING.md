# Contributing Guidelines

Thank you for your interest in contributing to the **Structured LLM Chatbot & LLM-as-Judge Evaluation Harness** repository!

This project serves as **Digital Evidence of Learning** demonstrating structured LLM outputs via Zod schema enforcement and automated evaluation harnesses.

## How to Contribute

1. **Fork the Repository**: Create your feature branch (`git checkout -b feature/new-eval-case`).
2. **Add Evaluation Test Cases**: You can add new test cases in `src/eval/testCases.ts`.
3. **Refine Zod Schema**: Update `src/schema.ts` to extend chatbot response metadata or fields.
4. **Run Evaluation Suite**: Ensure all 10 test cases pass cleanly:
   ```bash
   npm test
   ```
5. **Submit a Pull Request**: Provide a clear summary of your changes and evaluation score impact.

## Code Style & Principles
- **Type Safety**: Strictly adhere to TypeScript and Zod schema typing.
- **Deterministic Evaluation**: Ensure LLM-as-judge rubrics remain clear and measurable.
