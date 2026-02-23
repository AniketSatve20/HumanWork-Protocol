import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Award,
  Briefcase,
  Star,
  ExternalLink,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { Badge, Spinner } from '@/components/common';
import { apiService } from '@/services/api.service';
import { formatAddress } from '@/utils/helpers';

interface UserProfile {
  walletAddress: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  portfolio?: string;
  socialLinks?: Record<string, string>;
  level: number;
  totalProjects: number;
  hourlyRate?: number;
  averageRating: number;
}

interface ReputationData {
  score: number;
  positiveAttestations: number;
  negativeAttestations: number;
  totalAttestations: number;
  level: number;
  isVerifiedHuman: boolean;
}

const levelLabels: Record<number, string> = {
  0: 'Unverified',
  1: 'Basic',
  2: 'Verified Human',
};

const levelColors: Record<number, 'error' | 'warning' | 'success'> = {
  0: 'error',
  1: 'warning',
  2: 'success',
};

export function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [badges, setBadges] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    async function loadProfile() {
      setLoading(true);
      try {
        const [userRes, repRes, badgesRes] = await Promise.all([
          apiService.getUser(address!),
          apiService.getUserReputation(address!),
          apiService.getUserBadges(address!),
        ]);

        if (userRes.success && userRes.data) {
          setProfile(userRes.data as unknown as UserProfile);
        }
        if (repRes.success && repRes.data) {
          setReputation(repRes.data);
        }
        if (badgesRes.success && badgesRes.data) {
          setBadges((badgesRes.data as { badges: unknown[] }).badges || []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [address]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container text-center py-20">
        <User className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-surface-900">Profile Not Found</h2>
        <p className="text-surface-500 mt-2">This user hasn&apos;t registered on the platform yet.</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl text-white font-bold font-display shrink-0">
            {(profile.displayName || 'U')[0].toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold font-display text-surface-900">
                {profile.displayName || formatAddress(profile.walletAddress)}
              </h1>
              <Badge variant={levelColors[profile.level] || 'warning'}>
                {reputation?.isVerifiedHuman && <CheckCircle2 className="w-3 h-3" />}
                {levelLabels[profile.level] || 'Unknown'}
              </Badge>
            </div>

            <p className="text-surface-500 text-sm mt-1 font-mono">
              {formatAddress(profile.walletAddress)}
            </p>

            {profile.bio && (
              <p className="text-surface-600 mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-4 flex-wrap">
              {reputation && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="w-4 h-4 text-warning-500" />
                  <span className="font-semibold text-surface-900">{reputation.score}</span>
                  <span className="text-surface-500">Reputation</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm">
                <Briefcase className="w-4 h-4 text-primary-500" />
                <span className="font-semibold text-surface-900">{profile.totalProjects}</span>
                <span className="text-surface-500">Projects</span>
              </div>
              {profile.hourlyRate !== undefined && profile.hourlyRate > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-surface-900">${profile.hourlyRate}/hr</span>
                </div>
              )}
              {badges.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Award className="w-4 h-4 text-accent-500" />
                  <span className="font-semibold text-surface-900">{badges.length}</span>
                  <span className="text-surface-500">Badges</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-500" />
              Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reputation Details */}
        {reputation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              Reputation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-surface-500">Score</span>
                <span className="font-semibold">{reputation.score}/100</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-primary-500 to-accent-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${reputation.score}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-success-600">+{reputation.positiveAttestations} positive</span>
                <span className="text-error-500">-{reputation.negativeAttestations} negative</span>
              </div>
              <div className="text-sm text-surface-500">
                {reputation.totalAttestations} total attestations
              </div>
            </div>
          </motion.div>
        )}

        {/* Links */}
        {(profile.portfolio || (profile.socialLinks && Object.keys(profile.socialLinks).length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" />
              Links
            </h3>
            <div className="space-y-2">
              {profile.portfolio && (
                <a
                  href={profile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Portfolio
                </a>
              )}
              {profile.socialLinks && Object.entries(profile.socialLinks).map(([key, value]) => (
                value && (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm capitalize"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {key}
                  </a>
                )
              ))}
            </div>
          </motion.div>
        )}

        {/* Skill Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-500" />
              Skill Badges ({badges.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge: any, i: number) => (
                <div key={i} className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                  <p className="font-medium text-sm text-surface-900">{badge.name || `Badge #${i + 1}`}</p>
                  {badge.score && <p className="text-xs text-surface-500 mt-1">Score: {badge.score}</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
