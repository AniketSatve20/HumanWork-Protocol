import { useState } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { contractService } from '../../services/contracts';

export function ProjectsPage() {
  const { isConnected, provider, signer } = useWalletStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [milestones, setMilestones] = useState([{ description: '', amount: '' }]);

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: 'description' | 'amount', value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const handleCreate = async () => {
    if (!freelancerAddress || milestones.some(m => !m.description || !m.amount)) {
      alert('Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      if (provider && signer) {
        contractService.setProvider(provider, signer);
      }

      const totalAmount = milestones.reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
      // Approve USDC first
      await contractService.approveUSDC(
        import.meta.env.VITE_PROJECT_ESCROW_ADDRESS,
        totalAmount.toString()
      );

      // Create project
      const receipt = await contractService.createProject(
        freelancerAddress,
        milestones.map(m => m.amount),
        milestones.map(m => m.description)
      );

      alert(`Project created! TX: ${receipt.hash}`);
      setShowCreateModal(false);
      setFreelancerAddress('');
      setMilestones([{ description: '', amount: '' }]);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Projects</h1>
        <p className="text-gray-600">Connect your wallet to manage projects.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-gray-600">
            Create and manage milestone-based projects with secure escrow.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + New Project
        </button>
      </div>

      {/* Empty State */}
      <div className="card text-center py-16">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
        <p className="text-gray-600 mb-4">
          Create your first project to get started with secure escrow payments.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          Create Project
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Freelancer Wallet Address
                </label>
                <input
                  type="text"
                  value={freelancerAddress}
                  onChange={(e) => setFreelancerAddress(e.target.value)}
                  className="input"
                  placeholder="0x..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Milestones</label>
                  <button
                    onClick={addMilestone}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add Milestone
                  </button>
                </div>

                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={milestone.description}
                          onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                          className="input text-sm"
                          placeholder="Milestone description"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={milestone.amount}
                          onChange={(e) => updateMilestone(index, 'amount', e.target.value)}
                          className="input text-sm"
                          placeholder="USDC"
                        />
                      </div>
                      {milestones.length > 1 && (
                        <button
                          onClick={() => removeMilestone(index)}
                          className="text-red-500 hover:text-red-700 p-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold">
                    {milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)} USDC
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
