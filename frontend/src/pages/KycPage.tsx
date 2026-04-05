import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CreditCard,
  User,
  Lock,
} from 'lucide-react';
import { Button, Card } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { apiService } from '@/services/api.service';
import { web3Service } from '@/services/web3.service';
import { cn } from '@/utils/helpers';
import { useSoundSystem } from '@/components/ui/SoundSystem';
import toast from 'react-hot-toast';

const ShieldOrb = lazy(() => import('@/components/three/ShieldOrb'));

type KycStatus = 'not_started' | 'pending_review' | 'approved_pending_onchain' | 'verified' | 'rejected';

interface KycState {
  status: KycStatus;
  isVerifiedOnChain: boolean;
  isAdminApproved: boolean;
  documents: { type: string; status: string; verifiedAt?: string }[];
}

const DOC_TYPES = [
  { value: 'passport', label: 'Passport', icon: FileText },
  { value: 'national_id', label: 'National ID Card', icon: CreditCard },
  { value: 'drivers_license', label: "Driver's License", icon: CreditCard },
];

const STEPS = [
  { label: 'Submit Documents', description: 'Upload your identity document' },
  { label: 'Admin Review', description: 'Verification within 24-48 hours' },
  { label: 'On-Chain Verification', description: 'Confirm on Hedera blockchain' },
  { label: 'Verified Human', description: 'Full platform access unlocked' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-10">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center text-center flex-1">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300',
                i < currentStep
                  ? 'bg-success-500 border-success-500 text-white'
                  : i === currentStep
                    ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-surface-100 border-surface-300 text-surface-400'
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                i + 1
              )}
            </div>
            <p className={cn(
              'text-xs mt-2 font-medium',
              i <= currentStep ? 'text-surface-900' : 'text-surface-400'
            )}>
              {step.label}
            </p>
            <p className="text-[10px] text-surface-400 mt-0.5 hidden sm:block">
              {step.description}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn(
              'h-0.5 flex-1 mx-2 mt-[-1.5rem] transition-colors duration-300',
              i < currentStep ? 'bg-success-500' : 'bg-surface-200'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

export function KycPage() {
  useAuthStore(); // Ensure user is authenticated
  const { playContractSign } = useSoundSystem();
  const [kycState, setKycState] = useState<KycState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form state
  const [legalName, setLegalName] = useState('');
  const [documentType, setDocumentType] = useState('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiService.getKycStatus();
      if (response.success && response.data) {
        setKycState(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const currentStep = !kycState ? 0
    : kycState.status === 'not_started' ? 0
    : kycState.status === 'pending_review' ? 1
    : kycState.status === 'rejected' ? 0
    : kycState.status === 'approved_pending_onchain' ? 2
    : kycState.status === 'verified' ? 4
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim() || !documentNumber.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.submitKyc({
        legalName: legalName.trim(),
        documentType,
        documentNumber: documentNumber.trim(),
        document: documentFile || undefined,
      });

      if (response.success) {
        toast.success('Documents submitted successfully!');
        await fetchStatus();
      } else {
        toast.error('Submission failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnChainVerify = async () => {
    setIsVerifying(true);
    try {
      toast.loading('Sending verification transaction...', { id: 'kyc-verify' });
      const tx = await web3Service.verifyHuman();
      toast.loading('Waiting for confirmation...', { id: 'kyc-verify' });
      await tx.wait();
      toast.success('You are now a Verified Human!', { id: 'kyc-verify' });

      // Haunting piano note — contract signed
      playContractSign();

      await fetchStatus();
    } catch (error: any) {
      console.error('On-chain verification failed:', error);
      toast.error(
        error.reason || error.message || 'Verification transaction failed',
        { id: 'kyc-verify' }
      );
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 rounded w-1/3" />
          <div className="h-4 bg-surface-200 rounded w-2/3" />
          <div className="h-64 bg-surface-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary-500/10">
                <Shield className="w-6 h-6 text-primary-500" />
              </div>
              <h1 className="text-2xl font-bold text-surface-900">Human Verification (KYC)</h1>
            </div>
            <p className="text-surface-500">
              Verify your identity to unlock full platform access, higher trust scores, and premium features.
            </p>
          </div>
          {/* 3D Shield visualization */}
          <div className="hidden md:block w-32 h-32 flex-shrink-0">
            <Suspense fallback={null}>
              <ShieldOrb verified={kycState?.status === 'verified'} />
            </Suspense>
          </div>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      <AnimatePresence mode="wait">
        {/* ── VERIFIED ──────────────────────────────────────────────── */}
        {kycState?.status === 'verified' && (
          <motion.div
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="text-center py-12 overflow-hidden relative">
              {/* 3D Shield background */}
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <Suspense fallback={null}>
                  <ShieldOrb verified />
                </Suspense>
              </div>
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-success-500" />
                </div>
                <h2 className="text-2xl font-bold text-surface-900 mb-2">
                  Verified Human
                </h2>
                <p className="text-surface-500 mb-6 max-w-md mx-auto">
                  Your identity has been verified on the Hedera blockchain. You have full access to all platform features.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success-50 text-success-700 text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Level 2 — VerifiedHuman
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── APPROVED → NEEDS ON-CHAIN TX ──────────────────────────── */}
        {kycState?.status === 'approved_pending_onchain' && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-surface-900 mb-2">
                  Admin Approved — Finalize On-Chain
                </h2>
                <p className="text-surface-500 max-w-md mx-auto">
                  Your documents have been reviewed and approved. Complete the final step by signing an on-chain transaction to become a Verified Human.
                </p>
              </div>

              <div className="bg-surface-50 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-primary-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-surface-900">What happens next?</p>
                    <ul className="text-sm text-surface-600 mt-2 space-y-1">
                      <li>• A transaction will be sent to the UserRegistry contract</li>
                      <li>• Your wallet will ask you to confirm the transaction</li>
                      <li>• Your Legitimacy Level upgrades from Basic → VerifiedHuman</li>
                      <li>• This is recorded permanently on Hedera</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleOnChainVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {isVerifying ? 'Verifying...' : 'Verify On-Chain'}
              </Button>
            </Card>
          </motion.div>
        )}

        {/* ── PENDING REVIEW ────────────────────────────────────────── */}
        {kycState?.status === 'pending_review' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-warning-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900 mb-2">
                Under Review
              </h2>
              <p className="text-surface-500 mb-4 max-w-md mx-auto">
                Your documents have been submitted and are being reviewed. This typically takes 24-48 hours.
              </p>

              {kycState.documents.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-50 text-sm">
                  <FileText className="w-4 h-4 text-surface-400" />
                  <span className="text-surface-600">
                    {kycState.documents[0].type.replace('_', ' ')} — pending verification
                  </span>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ── NOT STARTED or REJECTED → Show Form ──────────────────── */}
        {(kycState?.status === 'not_started' || kycState?.status === 'rejected') && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {kycState.status === 'rejected' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Verification Rejected</p>
                  <p className="text-sm text-red-600 mt-1">
                    Your previous submission was not approved. Please re-submit with clearer documents.
                  </p>
                </div>
              </div>
            )}

            <Card className="p-8">
              <h2 className="text-xl font-bold text-surface-900 mb-1">Identity Verification</h2>
              <p className="text-surface-500 text-sm mb-6">
                Provide your legal name and a government-issued ID to get verified.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Legal Name */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Legal Full Name *
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="As shown on your ID document"
                    className="input w-full"
                    required
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Document Type *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {DOC_TYPES.map((dt) => (
                      <button
                        key={dt.value}
                        type="button"
                        onClick={() => setDocumentType(dt.value)}
                        className={cn(
                          'p-3 rounded-xl border-2 text-center transition-all',
                          documentType === dt.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-surface-200 hover:border-surface-300 text-surface-600'
                        )}
                      >
                        <dt.icon className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-xs font-medium">{dt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Number */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Document Number *
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="e.g. AB1234567"
                    className="input w-full"
                    required
                  />
                </div>

                {/* Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Upload Document Photo (optional)
                  </label>
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                      documentFile
                        ? 'border-success-300 bg-success-50'
                        : 'border-surface-300 hover:border-primary-400 hover:bg-primary-50/30'
                    )}
                    onClick={() => document.getElementById('kyc-file-input')?.click()}
                  >
                    <input
                      id="kyc-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    />
                    {documentFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success-500" />
                        <span className="text-success-700 font-medium">{documentFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                        <p className="text-sm text-surface-500">
                          Click to upload JPEG, PNG, or PDF (max 5MB)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="bg-surface-50 rounded-xl p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-surface-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-surface-700">Privacy & Security</p>
                    <p className="text-xs text-surface-500 mt-1">
                      Your personal data is AES-256 encrypted at rest. Document details are never exposed publicly.
                      Only a hashed proof is stored on-chain. You can request full data deletion at any time (GDPR compliant).
                    </p>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !legalName.trim() || !documentNumber.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-primary-500" />
            <h3 className="font-medium text-surface-900">Trust Score</h3>
          </div>
          <p className="text-sm text-surface-500">
            Verified users get a higher trust score and are prioritized in job matching.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-primary-500" />
            <h3 className="font-medium text-surface-900">Privacy First</h3>
          </div>
          <p className="text-sm text-surface-500">
            Only a ZK proof hash goes on-chain. Your real identity stays encrypted in our secure vault.
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            <h3 className="font-medium text-surface-900">Required For</h3>
          </div>
          <p className="text-sm text-surface-500">
            Creating escrow projects over $1,000 and participating in dispute jury selection.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default KycPage;
