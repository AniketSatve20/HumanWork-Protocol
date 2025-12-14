import { HfInference } from '@huggingface/inference';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const hf = config.huggingface.apiKey ? new HfInference(config.huggingface.apiKey) : null;
const MODEL_ID = 'meta-llama/Meta-Llama-3-70B-Instruct'; 

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
  answer: string;
  expectedCriteria?: string;
}

export interface GradingResult {
  score: number;
  feedback: string;
  passed: boolean;
}

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

export const aiModuleService = {
  analyzeDispute: async (evidence: DisputeEvidence): Promise<AIAnalysisResult> => {
    if (!hf) {
      return {
        summary: "AI Unavailable (Mock)",
        codeQualityScore: 75,
        scopeAdherenceScore: 75,
        communicationScore: 75,
        recommendedSplit: { freelancer: 50, client: 50 },
        reasoning: "AI service not configured",
        confidence: 0
      };
    }

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
        temperature: 0.1,
      });

      const content = response.choices[0].message.content || "{}";
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonString);

    } catch (error) {
      logger.error('AI Dispute Analysis Failed:', error);
      throw error;
    }
  },

  gradeSubmission: async (submission: SkillSubmission): Promise<GradingResult> => {
    if (!hf) {
      return { score: 85, feedback: "AI not configured. Mock passing grade.", passed: true };
    }

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
      return { score: 0, feedback: "AI Service Unavailable", passed: false };
    }
  }
};

export const analyzeDispute = aiModuleService.analyzeDispute;
export const gradeSubmission = aiModuleService.gradeSubmission;
