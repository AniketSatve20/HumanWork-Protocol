import { HfInference } from '@huggingface/inference';
import { logger } from '../../utils/logger';

// Initialize HF Client
// Ensure HUGGINGFACE_API_KEY is in your .env
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Use a model with strong reasoning capabilities
const MODEL_ID = 'meta-llama/Meta-Llama-3-70B-Instruct'; 

// --- Interfaces ---

export interface DisputeEvidence {
  projectTitle: string;
  milestoneDescription: string;
  disputeReason: string;
  clientEvidence: string;
  freelancerEvidence: string;
  codeSnippet?: string;
  communicationLogs?: string;
}

export interface AIAnalysisResult {
  summary: string;
  codeQualityScore: number;
  scopeAdherenceScore: number;
  communicationScore: number;
  recommendedSplit: {
    freelancer: number;
    client: number;
  };
  reasoning: string;
  confidence: number;
}

export interface SkillSubmission {
  question: string;
  answer: string; // The user's code or text answer
  expectedCriteria?: string;
}

export interface GradingResult {
  score: number; // 0-100
  feedback: string;
  passed: boolean;
}

// --- Helper: System Prompts ---

function buildDisputeSystemPrompt(): string {
  return `
You are the "AI-PM" (Artificial Intelligence Project Manager) for the HumanWork Protocol.
Your job is to objectively analyze B2B freelancing disputes.

**CRITERIA:**
1. **Code Quality**: Check for bugs, security risks, and best practices.
2. **Scope**: Did the work match the milestone description?
3. **Communication**: Who was more responsive and professional?

**OUTPUT FORMAT:**
Respond ONLY with valid JSON (no markdown):
{
  "summary": "Short verdict summary",
  "codeQualityScore": number (0-100),
  "scopeAdherenceScore": number (0-100),
  "communicationScore": number (0-100),
  "recommendedSplit": { "freelancer": number, "client": number },
  "reasoning": "Explanation of the verdict",
  "confidence": number (0-100)
}
`;
}

function buildGradingSystemPrompt(): string {
  return `
You are an Expert Technical Interviewer. 
Evaluate the candidate's submission based on correctness, efficiency, and style.

**OUTPUT FORMAT:**
Respond ONLY with valid JSON (no markdown):
{
  "score": number (0-100),
  "feedback": "Constructive feedback on the code/answer",
  "passed": boolean (true if score >= 70)
}
`;
}

// --- Main AI Service ---

export const aiService = {
  /**
   * Analyzes a dispute and recommends a payout split.
   */
  analyzeDispute: async (evidence: DisputeEvidence): Promise<AIAnalysisResult> => {
    try {
      const userPrompt = `
      **DISPUTE CONTEXT**
      Project: ${evidence.projectTitle}
      Milestone: ${evidence.milestoneDescription}
      Reason: ${evidence.disputeReason}
      
      **EVIDENCE**
      Client: ${evidence.clientEvidence}
      Freelancer: ${evidence.freelancerEvidence}
      Code Snippet: ${evidence.codeSnippet ? evidence.codeSnippet.substring(0, 1500) : "N/A"}
      Logs: ${evidence.communicationLogs ? evidence.communicationLogs.substring(0, 1500) : "N/A"}
      `;

      logger.info(`AI Processing Dispute for: ${evidence.projectTitle}`);

      const response = await hf.chatCompletion({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: buildDisputeSystemPrompt() },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1, // Low temp for factual consistency
      });

      const content = response.choices[0].message.content || "{}";
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonString);

    } catch (error) {
      logger.error('AI Dispute Analysis Failed:', error);
      throw error;
    }
  },

  /**
   * Grades a skill submission (Code or Theory).
   */
  gradeSubmission: async (submission: SkillSubmission): Promise<GradingResult> => {
    try {
      const userPrompt = `
      **QUESTION:** ${submission.question}
      **EXPECTED CRITERIA:** ${submission.expectedCriteria || "Standard industry best practices"}
      
      **CANDIDATE ANSWER:**
      ${submission.answer}
      `;

      logger.info('AI Grading Submission...');

      const response = await hf.chatCompletion({
        model: MODEL_ID,
        messages: [
          { role: 'system', content: buildGradingSystemPrompt() },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "{}";
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonString);

    } catch (error) {
      logger.error('AI Grading Failed:', error);
      // Fallback for safety
      return { score: 0, feedback: "AI Service Unavailable", passed: false };
    }
  }
};

// Export individual functions for backward compatibility if needed, 
// but referencing aiService.method is preferred.
export const analyzeDispute = aiService.analyzeDispute;
export const gradeSubmission = aiService.gradeSubmission;