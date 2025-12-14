import { HfInference } from '@huggingface/inference';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ============ Interfaces ============

export interface SkillSubmission {
  question: string;
  answer: string;
  expectedCriteria?: string;
}

export interface GradingResult {
  score: number;
  report: string;
  passed: boolean;
}

export interface DisputeEvidence {
  projectTitle: string;
  milestoneDescription: string;
  disputeReason: string;
  clientEvidence: string;
  freelancerEvidence: string;
}

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
      this.model = config.huggingface.model;
      logger.info('✅ Hugging Face AI initialized');
    } else {
      logger.warn('⚠️ Hugging Face API key missing. AI features will use mocks.');
      this.model = 'mock-model';
    }
  }

  async gradeSubmission(submission: SkillSubmission): Promise<GradingResult> {
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
          temperature: 0.1,
          return_full_text: false 
        }
      });

      return this.parseJSON(response.generated_text);

    } catch (error) {
      logger.error('AI Grading failed:', error);
      return this.mockGrade();
    }
  }

  async analyzeDispute(evidence: DisputeEvidence): Promise<DisputeResult> {
    if (!this.hf) {
      return { 
        report: "AI Unavailable (Mock).", 
        recommendedSplit: { freelancer: 50, client: 50 } 
      };
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
      return { 
        report: "Analysis Error.", 
        recommendedSplit: { freelancer: 50, client: 50 } 
      };
    }
  }

  private parseJSON(text: string): any {
    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = cleanText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }
      
      return JSON.parse(cleanText);
    } catch {
      logger.warn(`Failed to parse AI JSON response: ${text.substring(0, 50)}...`);
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
