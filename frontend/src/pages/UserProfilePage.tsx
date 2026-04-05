import { useState, useEffect } from 'react';
import { HostIntegrityRadar } from '@/components/HostIntegrityRadar';
import { fetchHostIntegrity } from '@/services/hostIntegrity.service';
import type { HostIntegrityReport } from '@/types/hostIntegrity';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Award,
  Briefcase,
  Star,
  ExternalLink,
  Github,
  Globe,
  Loader2,
  ArrowLeft,
  BadgeCheck,
  Building2,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/common';
import { apiService } from '@/services/api.service';
import { formatAddress, generateAvatar } from '@/utils/helpers';
import { SKILL_CATEGORIES, SKILL_DIFFICULTY_CONFIG } from '@/types';
import type { SkillCategory, SkillDifficulty } from '@/types';

interface UserProfile {
  address: string;
  displayName?: string;
  bio?: string;
  role?: 'freelancer' | 'recruiter';
  skills: string[];
  hourlyRate?: number;
  portfolio: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  level: number;
  isVerifiedHuman: boolean;
  totalProjects: number;
  completedProjects: number;
  totalEarned: string;
  averageRating?: number;
  verifiedSkillBadges?: number;
  isVerifiedCompany?: boolean;
  companyDetails?: {
    companyName: string;
    industry: string;
    verificationStatus: 'none' | 'pending' | 'verified' | 'rejected';
  };
  attestations: Array<{
    attestationType: number;
    referenceId: number;
    isPositive: boolean;
    issuer: string;
  }>;
}

/* ── helpers for badge enrichment ── */
function inferCategory(title: string): SkillCategory {
  const t = title.toLowerCase();
  if (t.includes('solidity') || t.includes('smart contract') || t.includes('blockchain')) return 'smart-contracts';
  if (t.includes('react') || t.includes('frontend') || t.includes('css') || t.includes('ui')) return 'frontend';
  if (t.includes('node') || t.includes('backend') || t.includes('api') || t.includes('express')) return 'backend';
  if (t.includes('design') || t.includes('figma') || t.includes('ux')) return 'design';
  if (t.includes('devops') || t.includes('docker') || t.includes('ci/cd') || t.includes('aws')) return 'devops';
  if (t.includes('data') || t.includes('ml') || t.includes('ai') || t.includes('python')) return 'data-science';
  if (t.includes('mobile') || t.includes('flutter') || t.includes('swift') || t.includes('android')) return 'mobile';
  if (t.includes('security') || t.includes('audit') || t.includes('pen')) return 'security';
  return 'backend';
}

function inferDifficulty(title: string): SkillDifficulty {
  const t = title.toLowerCase();
  if (t.includes('expert') || t.includes('advanced')) return 'expert';
  if (t.includes('senior') || t.includes('complex')) return 'advanced';
  if (t.includes('intermediate') || t.includes('mid')) return 'intermediate';
  return 'beginner';
}

export function UserProfilePage() {
  const { address } = useParams<{ address: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reputation, setReputation] = useState<{
    score: number;
    positiveAttestations: number;
    negativeAttestations: number;
  } | null>(null);
  const [skillBadges, setSkillBadges] = useState<unknown[]>([]);
  const [hostIntegrity, setHostIntegrity] = useState<HostIntegrityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch user profile
        const userRes = await apiService.getUser(address);
        if (userRes.success) {
          setProfile(userRes.data as unknown as UserProfile);
        } else {
          setError('User not found');
        }

        // Fetch reputation
        apiService.getUserReputation(address).then((res) => {
          if (res.success && res.data) {
            setReputation(res.data as any);
          }
        }).catch(() => {});

        // Fetch skill badges
        apiService.getUserBadges(address).then((res) => {
          if (res.success && (res.data as any)?.badges) {
            setSkillBadges((res.data as any).badges);
          }
        }).catch(() => {});

        // Fetch Host Integrity Report
        fetchHostIntegrity(address).then(setHostIntegrity).catch(() => {});
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <User className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
          {error || 'User Not Found'}
        </h2>
        <p className="text-surface-500 mb-4">This user profile could not be loaded.</p>
        <Link to="/jobs">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  const levelLabels: Record<number, string> = {
    0: 'Unregistered',
    1: 'Basic',
    2: 'Verified Human',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={generateAvatar(profile.address)}
              alt="Avatar"
              className="w-24 h-24 rounded-2xl ring-4 ring-surface-100"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold text-surface-900">
                  {profile.displayName || formatAddress(profile.address)}
                </h1>
                {profile.isVerifiedHuman && (
                  <Badge variant="success" className="gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Verified Human
                  </Badge>
                )}
                {/* Verified Freelancer — has on-chain skill badges */}
                {profile.role !== 'recruiter' && skillBadges.length > 0 && (
                  <Badge variant="primary" className="gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-600">
                    <Trophy className="w-3.5 h-3.5" />
                    Verified Freelancer
                  </Badge>
                )}
                {/* Verified Company — recruiter with approved company */}
                {profile.role === 'recruiter' && profile.isVerifiedCompany && (
                  <Badge variant="primary" className="gap-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-600">
                    <Building2 className="w-3.5 h-3.5" />
                    Verified Company
                  </Badge>
                )}
              </div>

              <p className="text-sm font-mono text-surface-400 mb-3">{profile.address}</p>

              {profile.bio && (
                <p className="text-surface-600 mb-4">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  Level: {levelLabels[profile.level] || `Level ${profile.level}`}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {profile.completedProjects} projects completed
                </span>
                {reputation && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Reputation: {reputation.score}/100
                  </span>
                )}
                {profile.hourlyRate && (
                  <span>${profile.hourlyRate}/hr</span>
                )}
              </div>

              {/* Social Links */}
              {profile.socialLinks && (
                <div className="flex items-center gap-3 mt-4">
                  {profile.socialLinks.github && (
                    <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer"
                       className="text-surface-400 hover:text-surface-600 transition-colors">
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                  {profile.socialLinks.website && (
                    <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer"
                       className="text-surface-400 hover:text-surface-600 transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  <a href={`https://hashscan.io/testnet/account/${profile.address}`}
                     target="_blank" rel="noopener noreferrer"
                     className="text-surface-400 hover:text-surface-600 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Host Integrity Report — Delos Diagnostics */}
        {hostIntegrity && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="md:col-span-2"
          >
            <Card className="p-8 flex flex-col md:flex-row items-center gap-8 bg-[#1A1A1B] border-[#83858D] border-[0.5px] shadow-lg">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-serif mb-2 tracking-wide" style={{ color: '#F5F5F5', fontFamily: 'Bodoni Moda, serif' }}>
                  Host Analysis
                </h2>
                <HostIntegrityRadar report={hostIntegrity} />
                <div className="flex gap-6 mt-4">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[#83858D] text-xs">Improvisation</span>
                    <span className="font-mono text-[#FA831B] text-lg">{hostIntegrity.improvisationScore}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[#83858D] text-xs">Consistency</span>
                    <span className="font-mono text-[#FA831B] text-lg">{hostIntegrity.narrativeConsistency}%</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-[#83858D] text-xs">Integrity</span>
                    <span className="font-mono text-[#FA831B] text-lg">{hostIntegrity.integrity}%</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-[220px]">
                <div className="font-mono text-[#FA831B] text-xs uppercase tracking-widest mb-1">{hostIntegrity.role}</div>
                <div className="text-[#F5F5F5] font-serif text-lg mb-2" style={{ fontFamily: 'Bodoni Moda, serif' }}>{hostIntegrity.cornerstoneSummary}</div>
                <div className="text-[#83858D] text-sm font-mono mb-2">Core Drive: {hostIntegrity.coreDrive}</div>
                <div className="text-[#F5F5F5] text-sm font-mono mb-2">{hostIntegrity.feedback}</div>
                <div className="text-xs font-mono mt-2">
                  <span className={`px-2 py-1 rounded ${hostIntegrity.verdict === 'Pass' ? 'bg-[#FA831B]/20 text-[#FA831B]' : hostIntegrity.verdict === 'Review' ? 'bg-[#83858D]/20 text-[#83858D]' : 'bg-[#8B0000]/20 text-[#8B0000]'}`}>{hostIntegrity.verdict}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        {/* Skills — with verified distinction */}
        {profile.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => {
                  // Check if this skill has a matching on-chain badge
                  const hasVerifiedBadge = skillBadges.some((b: any) => {
                    const badgeTitle = (b.testTitle || b.title || '').toLowerCase();
                    return badgeTitle.includes(skill.toLowerCase());
                  });
                  return (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        hasVerifiedBadge
                          ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 border border-amber-500/20'
                          : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      {hasVerifiedBadge && <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />}
                      {skill}
                    </span>
                  );
                })}
              </div>
              {skillBadges.length > 0 && (
                <p className="text-xs text-surface-400 mt-3 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-amber-500" />
                  Skills with badges are verified on-chain
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Reputation */}
        {reputation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Reputation</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500">Score</span>
                  <span className="font-bold text-2xl text-surface-900">{reputation.score}</span>
                </div>
                <div className="h-3 rounded-full bg-surface-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                    style={{ width: `${reputation.score}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-surface-400">
                  <span>{reputation.positiveAttestations} positive</span>
                  <span>{reputation.negativeAttestations} negative</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Skill Badges — enhanced */}
        {skillBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-surface-900">Verified Skill Badges</h2>
                  <Badge variant="primary" className="text-xs">{skillBadges.length}</Badge>
                </div>
                {profile.role !== 'recruiter' && (
                  <Badge variant="success" className="gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    On-chain verified
                  </Badge>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillBadges.map((badge: any, index: number) => {
                  const title = badge.testTitle || badge.title || `Skill Test #${badge.referenceId ?? index}`;
                  const category = inferCategory(title);
                  const difficulty = inferDifficulty(title);
                  const catMeta = SKILL_CATEGORIES.find(c => c.id === category);
                  const diffMeta = SKILL_DIFFICULTY_CONFIG[difficulty];
                  const score = badge.score ?? badge.finalScore;

                  return (
                    <div
                      key={index}
                      className="relative overflow-hidden rounded-xl border border-surface-200 bg-gradient-to-br from-surface-50 to-white p-4 hover:shadow-lg transition-all group"
                    >
                      {/* Category colour strip */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${catMeta?.color.replace('text-', 'bg-') || 'bg-primary-500'}`} />

                      <div className="flex items-start gap-3 mt-1">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg shrink-0">
                          {catMeta?.icon || '🏆'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-900 truncate">{title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-surface-500">{catMeta?.label || 'General'}</span>
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${diffMeta?.bgColor || 'bg-surface-100'} ${diffMeta?.color || 'text-surface-600'}`}>
                              {diffMeta?.label || difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100">
                        {score !== undefined && score !== null ? (
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                              {score}/100
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-primary-500" />
                            <span className="text-xs text-surface-500">Certified</span>
                          </div>
                        )}
                        <span className="text-xs text-surface-400">
                          {badge.timestamp ? new Date(badge.timestamp).toLocaleDateString() : 'Earned'}
                        </span>
                      </div>

                      {badge.badgeTokenId && (
                        <a
                          href={`https://hashscan.io/testnet/token/0xE2f95F621Cb4b03BDC26cB14ADBd234Aa694068B/${badge.badgeTokenId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 p-1 text-surface-400 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View NFT on chain"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default UserProfilePage;
