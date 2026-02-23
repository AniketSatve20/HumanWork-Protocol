import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  Send,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Button, Card, Badge, Skeleton, Progress } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { apiService } from '@/services/api.service';
import { web3Service } from '@/services/web3.service';
import { formatUSDC, cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface SkillTest {
  id: number;
  title: string;
  description: string;
  ipfsHash: string;
  fee: string;
  isActive: boolean;
  submissionCount: number;
}

type TestStep = 'list' | 'preview' | 'taking' | 'submitted';

const SAMPLE_QUESTIONS: Record<string, { question: string; hint: string }[]> = {
  default: [
    { question: 'Describe your approach to solving a complex problem in your area of expertise.', hint: 'Focus on methodology and communication' },
    { question: 'What best practices do you follow to ensure code quality / work quality?', hint: 'Mention testing, reviews, documentation' },
    { question: 'Share a challenging project you worked on and how you overcame obstacles.', hint: 'Structure: situation → action → result' },
  ],
};

export function SkillTestPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [tests, setTests] = useState<SkillTest[]>([]);
  const [isLoadingTests, setIsLoadingTests] = useState(true);
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [step, setStep] = useState<TestStep>('list');
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionCid, setSubmissionCid] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    if (user?.role !== 'freelancer') {
      navigate('/dashboard');
      return;
    }
    loadTests();
  }, [isAuthenticated, user, navigate]);

  const loadTests = async () => {
    setIsLoadingTests(true);
    try {
      const resp = await apiService.getSkillTests();
      // Backend returns { success: true, tests: [...] } format
      const raw = resp as unknown as { success: boolean; tests?: SkillTest[] };
      setTests(raw.tests || []);
    } catch {
      // No tests from blockchain yet - use demo data
      setTests([
        { id: 0, title: 'Full-Stack Development', description: 'Assess your skills in React, Node.js, and database design.', ipfsHash: '', fee: '0', isActive: true, submissionCount: 142 },
        { id: 1, title: 'Smart Contract Development', description: 'Prove your expertise in Solidity, EVM, and DeFi patterns.', ipfsHash: '', fee: '5000000', isActive: true, submissionCount: 67 },
        { id: 2, title: 'UI/UX Design', description: 'Demonstrate your design thinking, prototyping, and user research skills.', ipfsHash: '', fee: '0', isActive: true, submissionCount: 98 },
        { id: 3, title: 'Data Science & ML', description: 'Show your abilities in data analysis, machine learning, and visualisation.', ipfsHash: '', fee: '0', isActive: true, submissionCount: 55 },
        { id: 4, title: 'DevOps & Cloud Infrastructure', description: 'Validate expertise in CI/CD, containers, and cloud platforms.', ipfsHash: '', fee: '0', isActive: true, submissionCount: 31 },
      ]);
    } finally {
      setIsLoadingTests(false);
    }
  };

  const questions = SAMPLE_QUESTIONS.default;
  const progress = ((currentQuestion + (answers[currentQuestion] ? 1 : 0)) / questions.length) * 100;

  const handleStartTest = (test: SkillTest) => {
    setSelectedTest(test);
    setAnswers(['', '', '']);
    setCurrentQuestion(0);
    setStep('preview');
  };

  const handleSubmitTest = async () => {
    if (!selectedTest) return;
    const unanswered = answers.filter(a => !a.trim()).length;
    if (unanswered > 0) {
      toast.error(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const content = questions.map((q, i) => `Q${i + 1}: ${q.question}\nA: ${answers[i]}`).join('\n\n');
      const result = await apiService.submitSkillTest(selectedTest.id, content, {
        testTitle: selectedTest.title,
        submittedAt: new Date().toISOString(),
      });

      if (result.success && result.data?.cid) {
        // If test has an on-chain fee, call the smart contract
        if (parseInt(selectedTest.fee) > 0) {
          try {
            toast.loading('Submitting on-chain (please sign the transaction)...', { id: 'tx' });
            const tx = await web3Service.submitSkillTrial(selectedTest.id, result.data.cid);
            await (tx as { wait: () => Promise<unknown> }).wait();
            toast.success('Skill trial submitted on-chain!', { id: 'tx' });
          } catch {
            toast.error('On-chain submission failed. Off-chain record saved.', { id: 'tx' });
          }
        }

        setSubmissionCid(result.data.cid);
        setStep('submitted');
        toast.success('Test submitted! You\'ll receive your badge after AI grading.');
      } else {
        throw new Error('Upload failed');
      }
    } catch {
      toast.error('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Test List */}
        {step === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-8">
              <h1 className="text-2xl font-display font-bold text-surface-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary-500" />
                Skill Assessments
              </h1>
              <p className="text-surface-600 mt-1">
                Take assessments to earn on-chain skill badges and get discovered by top clients.
              </p>
            </div>

            {/* Info Banner */}
            <Card className="p-4 bg-primary-50 border-primary-200 mb-6 flex gap-3">
              <Zap className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-primary-700">
                <strong>AI-Graded Tests:</strong> Your answers are evaluated by our AI system. Score ≥ 80 earns you an NFT badge stored on-chain, boosting your profile visibility to clients.
              </div>
            </Card>

            {isLoadingTests ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((test, i) => (
                  <motion.div key={test.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="p-5 card-hover cursor-pointer" onClick={() => handleStartTest(test)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <Award className="w-6 h-6 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-surface-900">{test.title}</h3>
                            <p className="text-sm text-surface-600 mt-1 line-clamp-2">{test.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
                                {test.submissionCount} completed
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                ~15 min
                              </span>
                              {parseInt(test.fee) > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Fee: {formatUSDC(test.fee)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Badge variant="success">NFT Badge</Badge>
                          <ChevronRight className="w-5 h-5 text-surface-400" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Preview / Instructions */}
        {step === 'preview' && selectedTest && (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => setStep('list')} className="flex items-center gap-1 text-sm text-primary-500 hover:underline mb-6">
              <ArrowLeft className="w-4 h-4" /> Back to tests
            </button>

            <Card className="p-8 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-10 h-10 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-surface-900">{selectedTest.title}</h2>
                <p className="text-surface-600 mt-2">{selectedTest.description}</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Questions', value: String(questions.length), icon: BookOpen },
                  { label: 'Time', value: '~15 min', icon: Clock },
                  { label: 'Pass Score', value: '80%', icon: CheckCircle2 },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-50 rounded-xl p-4">
                    <item.icon className="w-5 h-5 text-primary-500 mx-auto mb-2" />
                    <p className="font-semibold text-surface-900">{item.value}</p>
                    <p className="text-sm text-surface-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-sm text-warning-700">
                <strong>Tips for success:</strong> Provide detailed, thoughtful answers. The AI evaluates depth of knowledge, best practices, and communication clarity.
              </div>

              {parseInt(selectedTest.fee) > 0 && (
                <div className="bg-surface-50 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                  <p className="text-sm text-surface-700">
                    This test requires a fee of <strong>{formatUSDC(selectedTest.fee)}</strong> payable on-chain when you submit.
                  </p>
                </div>
              )}

              <Button size="lg" className="w-full" onClick={() => setStep('taking')}>
                Start Assessment
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Card>
          </motion.div>
        )}

        {/* Taking Test */}
        {step === 'taking' && selectedTest && (
          <motion.div key="taking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-surface-600">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium text-primary-600">{selectedTest.title}</span>
              </div>
              <Progress value={progress} />
            </div>

            <Card className="p-8">
              <h2 className="text-xl font-semibold text-surface-900 mb-2">
                {questions[currentQuestion].question}
              </h2>
              <p className="text-sm text-surface-500 mb-6">
                Hint: {questions[currentQuestion].hint}
              </p>

              <textarea
                value={answers[currentQuestion]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[currentQuestion] = e.target.value;
                  setAnswers(newAnswers);
                }}
                placeholder="Write your detailed answer here..."
                rows={8}
                className="input w-full resize-none mb-6"
              />

              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </Button>

                {currentQuestion < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                    disabled={!answers[currentQuestion].trim()}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitTest}
                    isLoading={isSubmitting}
                    disabled={answers.some(a => !a.trim())}
                  >
                    <Send className="w-4 h-4" />
                    Submit Assessment
                  </Button>
                )}
              </div>

              {/* Question Navigator */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-surface-100">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestion(i)}
                    className={cn(
                      'w-8 h-8 rounded-full text-sm font-medium transition-colors',
                      i === currentQuestion ? 'bg-primary-500 text-white' :
                      answers[i].trim() ? 'bg-success-100 text-success-700' :
                      'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Submitted */}
        {step === 'submitted' && selectedTest && (
          <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
            <Card className="p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-24 h-24 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-success-500" />
              </motion.div>

              <h2 className="text-2xl font-bold text-surface-900 mb-2">Assessment Submitted!</h2>
              <p className="text-surface-600 mb-6">
                Your <strong>{selectedTest.title}</strong> assessment is being evaluated by our AI. If you score 80% or above, you'll automatically receive an NFT badge.
              </p>

              {submissionCid && (
                <div className="bg-surface-50 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs text-surface-500 mb-1">IPFS Proof of Submission</p>
                  <p className="font-mono text-xs text-surface-700 break-all">{submissionCid}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="secondary" onClick={() => { setStep('list'); setSelectedTest(null); }}>
                  Take Another Test
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

export default SkillTestPage;
