import { useState, useEffect } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { contractService } from '../../services/contracts';

interface SkillTest {
  id: number;
  title: string;
  description: string;
  fee: string;
  isActive: boolean;
  submissionCount: number;
}

export function SkillsPage() {
  const { isConnected, provider, signer } = useWalletStore();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [submissionCode, setSubmissionCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isConnected && provider && signer) {
      contractService.setProvider(provider, signer);
      loadTests();
    }
  }, [isConnected, provider, signer]);

  const loadTests = async () => {
    setLoading(true);
    try {
      // Mock data for demo
      setTests([
        {
          id: 0,
          title: 'Junior Solidity Developer',
          description: 'Basic syntax, security patterns, and ERC standards.',
          fee: '10',
          isActive: true,
          submissionCount: 15,
        },
        {
          id: 1,
          title: 'Smart Contract Security Auditor',
          description: 'Reentrancy, overflow, and gas optimization.',
          fee: '25',
          isActive: true,
          submissionCount: 8,
        },
        {
          id: 2,
          title: 'DeFi Protocol Architect',
          description: 'AMM logic, lending pools, and flash loans.',
          fee: '50',
          isActive: true,
          submissionCount: 3,
        },
      ]);
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTest || !submissionCode) return;

    setSubmitting(true);
    try {
      // First approve USDC
      await contractService.approveUSDC(
        import.meta.env.VITE_SKILL_TRIAL_ADDRESS,
        selectedTest.fee
      );

      // Submit trial
      const receipt = await contractService.submitSkillTrial(
        selectedTest.id,
        submissionCode // In production, this would be an IPFS hash
      );

      alert(`Submission successful! TX: ${receipt.hash}`);
      setSelectedTest(null);
      setSubmissionCode('');
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Skill Tests</h1>
        <p className="text-gray-600 mb-8">Connect your wallet to view and take skill tests.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Skill Tests</h1>
        <p className="text-gray-600">
          Pass AI-graded skill tests to earn on-chain verification badges.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tests...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map(test => (
            <div key={test.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <span className="badge badge-success">Active</span>
                <span className="text-sm text-gray-500">
                  {test.submissionCount} attempts
                </span>
              </div>
              
              <h3 className="text-xl font-semibold mb-2">{test.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{test.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary-600">
                  {test.fee} USDC
                </span>
                <button
                  onClick={() => setSelectedTest(test)}
                  className="btn btn-primary text-sm"
                >
                  Take Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedTest.title}</h2>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-600 mb-4">{selectedTest.description}</p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Fee:</strong> {selectedTest.fee} USDC will be deducted upon submission.
                Passing score (80+) earns you an NFT badge!
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Your Solution (Code/IPFS Hash)
              </label>
              <textarea
                value={submissionCode}
                onChange={(e) => setSubmissionCode(e.target.value)}
                className="input h-48 font-mono text-sm"
                placeholder="Paste your code or IPFS hash here..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTest(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !submissionCode}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting...' : 'Submit for Grading'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillsPage;
