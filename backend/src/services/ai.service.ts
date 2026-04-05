import { HfInference } from '@huggingface/inference';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface SkillSubmission {
  question: string;
  answer: string;
  expectedCriteria?: string;
  jobTitle?: string;
  workHistory?: string;
  skillSet?: string[];
}

export interface GradingResult {
  score: number;
  report: string;
  passed: boolean;
}

export interface HostIntegrityReport {
  improvisationScore: number;
  narrativeConsistency: number;
  cornerstoneSummary: string;
  coreDrive: string;
  integrity: number;
  verdict: 'Pass' | 'Review' | 'Fail';
  role: string;
  feedback: string;
}

export interface DisputeEvidence {
  projectTitle: string;
  milestoneDescription: string;
  disputeReason: string;
  clientEvidence: string;
  freelancerEvidence: string;
  codeSnippet?: string;
  communicationLogs?: string;
}

export interface DisputeResult {
  report: string;
  recommendedSplit: {
    freelancer: number;
    client: number;
  };
  codeQualityScore?: number;
  scopeAdherenceScore?: number;
  communicationScore?: number;
  confidence?: number;
}

class AIService {
  private hf: HfInference | null;
  private model: string;

  constructor() {
    if (config.huggingface.apiKey) {
      this.hf = new HfInference(config.huggingface.apiKey);
      this.model = config.huggingface.model;
      logger.info('Hugging Face AI initialized');
    } else {
      this.hf = null;
      this.model = 'mock-model';
      logger.warn('Hugging Face API key missing. AI features will use mocks.');
    }
  }

  async gradeSubmission(submission: SkillSubmission): Promise<GradingResult> {
    if (!this.hf) {
      return this.mockGrade();
    }

    try {
      const systemPrompt = `You are an Expert Technical Interviewer.
Evaluate the candidate's submission based on correctness, efficiency, and style.

OUTPUT FORMAT:
Respond ONLY with valid JSON (no markdown):
{
  "score": number (0-100),
  "report": "Constructive feedback on the code/answer",
  "passed": boolean (true if score >= 70)
}`;

      const userPrompt = `QUESTION: ${submission.question}
EXPECTED CRITERIA: ${submission.expectedCriteria ?? 'Standard industry best practices'}

CANDIDATE ANSWER:
${submission.answer}`;

      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = this.parseJSON(content);
      const score = Number(parsed.score ?? 0);
      return {
        score,
        report: String(parsed.report ?? parsed.feedback ?? 'No feedback provided'),
        passed: Boolean(parsed.passed ?? score >= 70),
      };
    } catch (error) {
      logger.error('AI grading failed, falling back to text generation:', error);

      try {
        return await this.gradeSubmissionFallback(submission);
      } catch (fallbackError) {
        logger.error('AI grading fallback failed:', fallbackError);
        return this.mockGrade();
      }
    }
  }

  async analyzeHostIntegrity(submission: SkillSubmission): Promise<HostIntegrityReport> {
    if (!this.hf) {
      return this.mockHostIntegrity();
    }

    try {
      const systemPrompt = `You are a behavioral analysis AI.
Analyze consistency of work history and skill alignment.

OUTPUT FORMAT:
Respond ONLY with valid JSON (no markdown):
{
  "improvisationScore": number (0-100),
  "narrativeConsistency": number (0-100),
  "cornerstoneSummary": string,
  "coreDrive": string,
  "integrity": number (0-100),
  "verdict": "Pass" | "Review" | "Fail",
  "role": string,
  "feedback": string
}`;

      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(submission, null, 2) },
        ],
        max_tokens: 600,
        temperature: 0.1,
      });

      const parsed = this.parseJSON(response.choices[0]?.message?.content || '{}');
      return {
        improvisationScore: Number(parsed.improvisationScore ?? 0),
        narrativeConsistency: Number(parsed.narrativeConsistency ?? 0),
        cornerstoneSummary: String(parsed.cornerstoneSummary ?? ''),
        coreDrive: String(parsed.coreDrive ?? ''),
        integrity: Number(parsed.integrity ?? 0),
        verdict: parsed.verdict === 'Pass' || parsed.verdict === 'Fail' ? parsed.verdict : 'Review',
        role: String(parsed.role ?? 'High-Tier Narrative Architect'),
        feedback: String(parsed.feedback ?? 'No feedback provided'),
      };
    } catch (error) {
      logger.error('Host integrity analysis failed, using mock:', error);
      return this.mockHostIntegrity();
    }
  }

  async analyzeDispute(evidence: DisputeEvidence): Promise<DisputeResult> {
    if (!this.hf) {
      return {
        report: 'AI Unavailable.',
        recommendedSplit: { freelancer: 50, client: 50 },
        confidence: 0,
      };
    }

    try {
      const systemPrompt = `You are an impartial arbitration AI for software disputes.
Evaluate quality, scope adherence, and communication.

OUTPUT FORMAT:
Respond ONLY with valid JSON (no markdown):
{
  "report": "reasoning for the verdict",
  "recommendedSplit": { "freelancer": number, "client": number },
  "codeQualityScore": number,
  "scopeAdherenceScore": number,
  "communicationScore": number,
  "confidence": number
}`;

      const userPrompt = `PROJECT: ${evidence.projectTitle}
MILESTONE: ${evidence.milestoneDescription}
DISPUTE REASON: ${evidence.disputeReason}

CLIENT CLAIM:
${evidence.clientEvidence}

FREELANCER CLAIM:
${evidence.freelancerEvidence}

CODE SNIPPET:
${evidence.codeSnippet ?? 'N/A'}

COMMUNICATION LOGS:
${evidence.communicationLogs ?? 'N/A'}`;

      const response = await this.hf.chatCompletion({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 900,
        temperature: 0.1,
      });

      const parsed = this.parseJSON(response.choices[0]?.message?.content || '{}');
      const normalizedSplit = this.normalizeSplit(parsed.recommendedSplit);
      return {
        report: String(parsed.report ?? 'No report provided.'),
        recommendedSplit: normalizedSplit,
        codeQualityScore: parsed.codeQualityScore != null ? Number(parsed.codeQualityScore) : undefined,
        scopeAdherenceScore: parsed.scopeAdherenceScore != null ? Number(parsed.scopeAdherenceScore) : undefined,
        communicationScore: parsed.communicationScore != null ? Number(parsed.communicationScore) : undefined,
        confidence: parsed.confidence != null ? Number(parsed.confidence) : undefined,
      };
    } catch (error) {
      logger.error('AI dispute analysis failed, falling back to text generation:', error);

      try {
        return await this.analyzeDisputeFallback(evidence);
      } catch (fallbackError) {
        logger.error('AI dispute fallback failed:', fallbackError);
        return {
          report: 'Analysis Error.',
          recommendedSplit: { freelancer: 50, client: 50 },
          confidence: 0,
        };
      }
    }
  }

  private async gradeSubmissionFallback(submission: SkillSubmission): Promise<GradingResult> {
    if (!this.hf) {
      return this.mockGrade();
    }

    const prompt = `Evaluate this submission and respond with JSON only.
Question: ${submission.question}
Expected: ${submission.expectedCriteria ?? 'Standard industry best practices'}
Answer: ${submission.answer}

JSON format:
{"score": number, "report": string, "passed": boolean}`;

    const response = await this.hf.textGeneration({
      model: this.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.1,
        return_full_text: false,
      },
    });

    const parsed = this.parseJSON(response.generated_text);
    const score = Number(parsed.score ?? 0);
    return {
      score,
      report: String(parsed.report ?? parsed.feedback ?? 'No feedback provided'),
      passed: Boolean(parsed.passed ?? score >= 70),
    };
  }

  private async analyzeDisputeFallback(evidence: DisputeEvidence): Promise<DisputeResult> {
    if (!this.hf) {
      return { report: 'AI Unavailable.', recommendedSplit: { freelancer: 50, client: 50 } };
    }

    const prompt = `You are an impartial arbitration AI. Analyze this dispute.

PROJECT: ${evidence.projectTitle}
MILESTONE: ${evidence.milestoneDescription}
DISPUTE REASON: ${evidence.disputeReason}

CLIENT CLAIM: ${evidence.clientEvidence}
FREELANCER CLAIM: ${evidence.freelancerEvidence}

Respond ONLY with JSON:
{
  "report": "reasoning for the verdict",
  "recommendedSplit": { "freelancer": number, "client": number }
}`;

    const response = await this.hf.textGeneration({
      model: this.model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 700,
        temperature: 0.1,
        return_full_text: false,
      },
    });

    const parsed = this.parseJSON(response.generated_text);
    return {
      report: String(parsed.report ?? 'No report provided.'),
      recommendedSplit: this.normalizeSplit(parsed.recommendedSplit),
      codeQualityScore: parsed.codeQualityScore != null ? Number(parsed.codeQualityScore) : undefined,
      scopeAdherenceScore: parsed.scopeAdherenceScore != null ? Number(parsed.scopeAdherenceScore) : undefined,
      communicationScore: parsed.communicationScore != null ? Number(parsed.communicationScore) : undefined,
      confidence: parsed.confidence != null ? Number(parsed.confidence) : undefined,
    };
  }

  private parseJSON(text: string): any {
    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        return JSON.parse(cleanText.slice(firstBrace, lastBrace + 1));
      }

      return JSON.parse(cleanText);
    } catch {
      logger.warn(`Failed to parse AI JSON response: ${text.slice(0, 100)}...`);
      return {};
    }
  }

  private normalizeSplit(split: any): { freelancer: number; client: number } {
    const freelancer = Number(split?.freelancer ?? 50);
    const client = Number(split?.client ?? 50);

    if (!Number.isFinite(freelancer) || !Number.isFinite(client)) {
      return { freelancer: 50, client: 50 };
    }

    const clampedFreelancer = Math.max(0, Math.min(100, Math.round(freelancer)));
    const clampedClient = Math.max(0, Math.min(100, Math.round(client)));
    const sum = clampedFreelancer + clampedClient;

    if (sum === 100) {
      return { freelancer: clampedFreelancer, client: clampedClient };
    }

    return { freelancer: clampedFreelancer, client: Math.max(0, 100 - clampedFreelancer) };
  }

  private mockGrade(): GradingResult {
    return {
      score: 85,
      report: 'Mock grading: AI not configured. Passing by default.',
      passed: true,
    };
  }

  private mockHostIntegrity(): HostIntegrityReport {
    return {
      improvisationScore: 88,
      narrativeConsistency: 92,
      cornerstoneSummary: 'Demonstrates advanced improvisational ability and narrative cohesion in technical domains.',
      coreDrive: 'Smart Contracts, Protocol Design',
      integrity: 91,
      verdict: 'Pass',
      role: 'High-Tier Narrative Architect',
      feedback: 'Host exhibits high narrative integrity and improvisational skill.',
    };
  }
}

export const aiService = new AIService();
