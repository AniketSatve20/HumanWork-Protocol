// HostIntegrityReport type for frontend
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
