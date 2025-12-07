import { useEffect, useState } from 'react';
import { useWalletStore } from '../../stores/wallet.store';
import { getSkillTests, uploadSubmission } from '../../services/api.service';
import { ContractService } from '../../services/contract.service';
import toast from 'react-hot-toast';

interface SkillTest {
  id: number;
  title: string;
  description: string;
  fee: string;
  isActive: boolean;
  submissionCount: number;
}

export function Skills() {
  const { address, provider, signer } = useWalletStore();
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [submission, setSubmission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await getSkillTests();
      setTests(data.tests || []);
    } catch (error) {
      console.error('Failed to load tests:', error);
      // Mock data for demo
      setTests([
        {
          id: 0,
          title: 'Junior Solidity Developer',
          description: 'Basic syntax, security patterns, and ERC standards.',
          fee: '10',
          isActive: true,
          submissionCount: 45,
        },
        {
          id: 1,
          title: 'Smart Contract Security Auditor',
          description: 'Reentrancy, overflow, and gas optimization.',
          fee: '25',
          isActive: true,
          submissionCount: 23,
        },
        {
          id: 2,
          title: 'DeFi Protocol Architect',
          description: 'AMM logic, lending pools, and flash loans.',
          fee: '50',
          isActive: true,
          submissionCount: 12,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTest || !submission || !provider || !signer) {
      toast.error('Please connect wallet and enter your submission');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload submission to IPFS via backend
      const { cid } = await uploadSubmission(selectedTest.id, submission, {
        testTitle: selectedTest.title,
      });

      toast.success(`Submission uploaded to IPFS: ${cid.slice(0, 10)}...`);

      // 2. Approve USDC if needed
      const contracts = new ContractService(provider, signer);
      const skillTrialAddress = ContractService.getContractAddress('skillTrial');

      if (parseFloat(selectedTest.fee) > 0) {
        await contracts.approveUSDC(skillTrialAddress, selectedTest.fee);
        toast.success('USDC approved');
      }

      // 3. Submit on-chain
      await contracts.submitTrial(selectedTest.id, cid);
      toast.success('Submission sent for AI grading!');

      setSelectedTest(null);
      setSubmission('');
    } catch (error: any) {
      console.error('Submission failed:', error);
      toast.error(error.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Connect your wallet to take skill tests</h2>
        <p className="text-gray-600">Earn badges to showcase your expertise</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skill Tests</h1>
          <p className="text-gray-600">Verify your skills and earn NFT badges</p>
        </div>
      </div>

      {/* Test List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">Loading tests...</div>
        ) : (
          tests.map((test) => (
            <div key={test.id} className="card hover:shadow-md transition">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{test.title}</h3>
                <span className="badge badge-info">${test.fee} USDC</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{test.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {test.submissionCount} submissions
                </span>
                <button
                  onClick={() => setSelectedTest(test)}
                  className="btn-primary text-sm"
                  disabled={!test.isActive}
                >
                  Take Test
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submission Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedTest.title}</h2>
                <p className="text-gray-600">{selectedTest.description}</p>
              </div>
              <button
                onClick={() => setSelectedTest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Fee:</strong> ${selectedTest.fee} USDC will be charged upon submission.
                Your work will be graded by our AI system.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Submission
              </label>
              <textarea
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                placeholder="Paste your code or solution here..."
                className="input h-64 font-mono text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTest(null)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn-primary"
                disabled={submitting || !submission.trim()}
              >
                {submitting ? 'Submitting...' : `Submit (${selectedTest.fee} USDC)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Skills;
