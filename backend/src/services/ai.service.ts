import { HfInference } from '@huggingface/inference';
import { config } from '../config'; // ✅ Fixed Import
import { logger } from '../utils/logger';

// ============ Interfaces ============

// The shape of data coming from the worker for grading
export interface SkillSubmission {
  question: string;
  answer: string;
  expectedCriteria?: string;
}

// The shape of the grading output
export interface GradingResult {
  score: number;
  report: string;
  passed: boolean;
}

// The shape of data for dispute resolution
export interface DisputeEvidence {
  projectTitle: string;
  milestoneDescription: string;
  disputeReason: string;
  clientEvidence: string;
  freelancerEvidence: string;
}

// The shape of the dispute verdict
export interface DisputeResult {
  report: string;
  recommendedSplit: {
    freelancer: number;
    client: number;
  };
}

// ============ Service Class ============

class AIService {
  private hf: HfInference | null = null;
  private model: string;

  constructor() {
    if (config.huggingface.apiKey) {
      this.hf = new HfInference(config.huggingface.apiKey);
      // Use a model capable of instruction following
      this.model = 'meta-llama/Meta-Llama-3-70B-Instruct'; 
    } else {
      logger.warn('⚠️ Hugging Face API key missing. AI features will use mocks.');
      this.model = 'mock-model';
    }
  }

  /**
   * Grade a skill test submission using AI
   */
  async gradeSubmission(submission: SkillSubmission): Promise<GradingResult> {
    // If AI is not configured, return a mock passing grade
    if (!this.hf) return this.mockGrade();

    try {
      const prompt = `
      You are an expert technical interviewer.
      
      **QUESTION:** ${submission.question}
      **CRITERIA:** ${submission.expectedCriteria || "Standard best practices"}
      **CANDIDATE ANSWER:** ${submission.answer}

      Grade this answer (0-100) and provide feedback.
      Respond ONLY with this JSON structure (no other text):
      {
        "score": number,
        "report": "short feedback string",
        "passed": boolean
      }
      `;

      const response = await this.hf.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: { 
          max_new_tokens: 500, 
          temperature: 0.1, // Low temp for consistency
          return_full_text: false 
        }
      });

      return this.parseJSON(response.generated_text);

    } catch (error) {
      logger.error('AI Grading failed:', error);
      return this.mockGrade();
    }
  }

  /**
   * Analyze a dispute between Client and Freelancer
   */
  async analyzeDispute(evidence: DisputeEvidence): Promise<DisputeResult> {
    if (!this.hf) {
      return { report: "AI Unavailable (Mock).", recommendedSplit: { freelancer: 50, client: 50 } };
    }

    try {
      const prompt = `
      You are an impartial arbitration AI. Analyze this dispute.
      
      **PROJECT:** ${evidence.projectTitle}
      **MILESTONE:** ${evidence.milestoneDescription}
      **DISPUTE REASON:** ${evidence.disputeReason}
      
      **CLIENT CLAIM:** ${evidence.clientEvidence}
      **FREELANCER CLAIM:** ${evidence.freelancerEvidence}

      Determine a fair payout split (0-100).
      Respond ONLY with this JSON structure (no other text):
      {
        "report": "reasoning for the verdict",
        "recommendedSplit": { "freelancer": number, "client": number }
      }
      `;

      const response = await this.hf.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: { 
          max_new_tokens: 600, 
          temperature: 0.1,
          return_full_text: false
        }
      });

      return this.parseJSON(response.generated_text);

    } catch (error) {
      logger.error('AI Dispute Analysis failed:', error);
      return { report: "Analysis Error.", recommendedSplit: { freelancer: 50, client: 50 } };
    }
  }

  /**
   * Helper to safely extract JSON from AI responses
   * (Handles cases where AI adds "Here is the JSON:" text)
   */
  private parseJSON(text: string): any {
    try {
      // 1. Remove markdown code blocks
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      // 2. Find the JSON object bounds
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(cleanText);
    } catch (e) {
      logger.warn(`Failed to parse AI JSON response: ${text.substring(0, 50)}...`);
      // Return a safe failure object so the worker doesn't crash
      return { 
        score: 0, 
        report: "AI Output Parsing Failed", 
        passed: false,
        recommendedSplit: { freelancer: 50, client: 50 }
      };
    }
  }

  private mockGrade(): GradingResult {
    return {
      score: 85,
      report: "Mock Grading: AI not configured. Passing by default.",
      passed: true
    };
  }
}

export const aiService = new AIService();