import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle2,
  Upload,
  User,
  ArrowRight,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

type VerifyStep = 'overview' | 'basic' | 'kyc' | 'complete';

const levelLabels: Record<number, string> = {
  0: 'Unregistered',
  1: 'Basic Verified',
  2: 'Human Verified',
};

const levelColors: Record<number, string> = {
  0: 'text-error-500',
  1: 'text-warning-500',
  2: 'text-success-500',
};

interface BasicFormData {
  email: string;
  fullName: string;
  country: string;
  phone: string;
}

interface KYCFormData {
  documentType: 'passport' | 'national_id' | 'drivers_license';
  documentNumber: string;
}

export function VerificationPage() {
  const navigate = useNavigate();
  const { user, address, isAuthenticated } = useAuthStore();

  const [step, setStep] = useState<VerifyStep>('overview');
  const [showDocNumber, setShowDocNumber] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [basicForm, setBasicForm] = useState<BasicFormData>({ email: '', fullName: '', country: '', phone: '' });
  const [kycForm, setKYCForm] = useState<KYCFormData>({ documentType: 'passport', documentNumber: '' });
  const [docFile, setDocFile] = useState<File | null>(null);

  if (!isAuthenticated || !address) {
    navigate('/');
    return null;
  }

  const currentLevel = user?.level ?? 0;

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicForm.email || !basicForm.fullName || !basicForm.country) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      // Call blockchain to registerBasic
      // For now, record in backend and mark as basic
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.success('Basic verification submitted! Your wallet is now Level 1.');
      setStep('complete');
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKYCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.documentNumber || !docFile) {
      toast.error('Please provide your document number and upload a document image.');
      return;
    }
    setIsSubmitting(true);
    try {
      // In production: upload document to secure storage (not IPFS), hash doc number, generate ZK proof
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('KYC documents submitted for verification. This takes up to 24 hours.');
      setStep('complete');
    } catch {
      toast.error('KYC submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Overview */}
        {step === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-primary-600" />
              </div>
              <h1 className="text-2xl font-display font-bold text-surface-900">Identity Verification</h1>
              <p className="text-surface-600 mt-2">
                Verified users unlock higher trust scores, larger projects, and better client opportunities.
              </p>
            </div>

            {/* Current Status */}
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-surface-500">Current Status</p>
                  <p className={cn('text-lg font-semibold mt-1', levelColors[currentLevel])}>
                    {levelLabels[currentLevel]}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-surface-500">Wallet</p>
                  <p className="font-mono text-sm text-surface-700">
                    {address?.slice(0, 8)}...{address?.slice(-6)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Verification Tiers */}
            <div className="space-y-4 mb-8">
              {/* Tier 1 */}
              <Card className={cn('p-5 border-2', currentLevel >= 1 ? 'border-success-200 bg-success-50' : 'border-surface-200')}>
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', currentLevel >= 1 ? 'bg-success-500' : 'bg-surface-200')}>
                    {currentLevel >= 1 ? <CheckCircle2 className="w-5 h-5 text-white" /> : <span className="text-sm font-bold text-surface-600">1</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-surface-900">Basic Verification</h3>
                      {currentLevel >= 1 ? <Badge variant="success">Completed</Badge> : <Badge>Required</Badge>}
                    </div>
                    <p className="text-sm text-surface-600 mt-1">Confirm your email, name, and country. No document needed.</p>
                    <ul className="text-xs text-surface-500 mt-2 space-y-1">
                      <li>✓ Access to all job listings</li>
                      <li>✓ Apply to projects up to $5,000</li>
                      <li>✓ Basic trust badge on profile</li>
                    </ul>
                  </div>
                </div>
                {currentLevel < 1 && (
                  <Button className="mt-4 w-full" onClick={() => setStep('basic')}>
                    Get Basic Verified <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </Card>

              {/* Tier 2 */}
              <Card className={cn('p-5 border-2', currentLevel >= 2 ? 'border-success-200 bg-success-50' : 'border-surface-200')}>
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', currentLevel >= 2 ? 'bg-success-500' : 'bg-primary-100')}>
                    {currentLevel >= 2 ? <CheckCircle2 className="w-5 h-5 text-white" /> : <span className="text-sm font-bold text-primary-600">2</span>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-surface-900">Human Verified (KYC)</h3>
                      {currentLevel >= 2 ? <Badge variant="success">Completed</Badge> : <Badge variant="primary">Recommended</Badge>}
                    </div>
                    <p className="text-sm text-surface-600 mt-1">
                      Submit a government ID. We use zero-knowledge proofs to verify your identity without storing personal data on-chain.
                    </p>
                    <ul className="text-xs text-surface-500 mt-2 space-y-1">
                      <li>✓ Unlocks projects up to $50,000+</li>
                      <li>✓ Eligible to serve as dispute juror</li>
                      <li>✓ "Verified Human" badge on profile</li>
                      <li>✓ Priority placement in search</li>
                    </ul>
                    <div className="flex items-center gap-2 mt-3 bg-primary-50 rounded-lg p-2">
                      <Lock className="w-4 h-4 text-primary-500" />
                      <p className="text-xs text-primary-600">Your identity is verified with ZK proofs – personal data never stored on-chain.</p>
                    </div>
                  </div>
                </div>
                {currentLevel < 2 && (
                  <Button
                    className="mt-4 w-full"
                    disabled={currentLevel < 1}
                    variant={currentLevel >= 1 ? 'primary' : 'secondary'}
                    onClick={() => setStep('kyc')}
                  >
                    {currentLevel < 1 ? 'Complete Basic First' : 'Start KYC Verification'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </Card>
            </div>

            <p className="text-center text-sm text-surface-500">
              Questions? <a href="mailto:support@humanwork.io" className="text-primary-500 hover:underline">Contact support</a>
            </p>
          </motion.div>
        )}

        {/* Basic Verification Form */}
        {step === 'basic' && (
          <motion.div key="basic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setStep('overview')} className="text-sm text-primary-500 hover:underline flex items-center gap-1 mb-6">
              ← Back
            </button>
            <Card className="p-8">
              <div className="text-center mb-6">
                <User className="w-12 h-12 text-primary-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-surface-900">Basic Verification</h2>
                <p className="text-surface-600 text-sm mt-1">Complete your profile to get verified.</p>
              </div>

              <form onSubmit={handleBasicSubmit} className="space-y-4">
                <Input
                  label="Full Name *"
                  placeholder="As it appears on your ID"
                  value={basicForm.fullName}
                  onChange={(e) => setBasicForm({ ...basicForm, fullName: e.target.value })}
                />
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="your@email.com"
                  value={basicForm.email}
                  onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Country *</label>
                  <select
                    value={basicForm.country}
                    onChange={(e) => setBasicForm({ ...basicForm, country: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select your country</option>
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">UAE</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <Input
                  label="Phone Number (optional)"
                  placeholder="+1 234 567 8900"
                  value={basicForm.phone}
                  onChange={(e) => setBasicForm({ ...basicForm, phone: e.target.value })}
                />

                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-xs text-surface-500">Connected Wallet: <span className="font-mono">{address}</span></p>
                </div>

                <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
                  Submit Verification
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* KYC Form */}
        {step === 'kyc' && (
          <motion.div key="kyc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setStep('overview')} className="text-sm text-primary-500 hover:underline flex items-center gap-1 mb-6">
              ← Back
            </button>
            <Card className="p-8">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-primary-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-surface-900">KYC Verification</h2>
                <p className="text-surface-600 text-sm mt-1">Your data is processed securely and never stored on-chain.</p>
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6 flex gap-2">
                <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-warning-700">
                  Document images are processed by our secure KYC provider and immediately deleted after verification. A ZK proof hash is written on-chain.
                </p>
              </div>

              <form onSubmit={handleKYCSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Document Type *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['passport', 'national_id', 'drivers_license'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setKYCForm({ ...kycForm, documentType: type })}
                        className={cn(
                          'p-3 rounded-xl border-2 text-sm font-medium transition-colors text-center',
                          kycForm.documentType === type ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-surface-200 text-surface-600 hover:border-surface-300'
                        )}
                      >
                        {type === 'passport' ? 'Passport' : type === 'national_id' ? 'National ID' : 'Driver\'s License'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Input
                    label="Document Number *"
                    placeholder="Enter document number"
                    type={showDocNumber ? 'text' : 'password'}
                    value={kycForm.documentNumber}
                    onChange={(e) => setKYCForm({ ...kycForm, documentNumber: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDocNumber(!showDocNumber)}
                    className="absolute right-3 top-9 text-surface-400 hover:text-surface-600"
                  >
                    {showDocNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Upload Document Image *</label>
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                      docFile ? 'border-success-300 bg-success-50' : 'border-surface-300 hover:border-primary-300'
                    )}
                    onClick={() => document.getElementById('doc-upload')?.click()}
                  >
                    {docFile ? (
                      <div className="flex items-center justify-center gap-2 text-success-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">{docFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                        <p className="text-sm text-surface-600">Click to upload or drag & drop</p>
                        <p className="text-xs text-surface-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                      </>
                    )}
                    <input
                      id="doc-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && setDocFile(e.target.files[0])}
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
                  Submit for Verification
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Complete */}
        {step === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
            <Card className="p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-success-500" />
              </motion.div>

              <h2 className="text-2xl font-bold text-surface-900 mb-2">Verification Submitted!</h2>
              <p className="text-surface-600 mb-6">
                Your verification request has been received. KYC review takes up to 24 hours. You'll see your updated trust level on your profile once approved.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="secondary" onClick={() => setStep('overview')}>
                  Check Status
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VerificationPage;
