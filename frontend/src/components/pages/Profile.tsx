import { useState } from 'react';
import { useWalletStore } from '../../stores/wallet.store';
import { ContractService } from '../../services/contract.service';
import toast from 'react-hot-toast';

export function Profile() {
  const { address, provider, signer, user, setUser } = useWalletStore();
  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleRegister = async () => {
    if (!provider || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    setRegistering(true);
    try {
      const contracts = new ContractService(provider, signer);
      await contracts.registerBasic();
      
      // Refresh user data
      const profile = await contracts.getUserProfile(address!);
      setUser({
        address: address!,
        level: profile.level,
        ensName: profile.ensName,
        isVerifiedHuman: profile.isVerifiedHuman,
        attestations: profile.attestations,
      });

      toast.success('Successfully registered!');
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.reason || error.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleVerify = async () => {
    if (!provider || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    setVerifying(true);
    try {
      const contracts = new ContractService(provider, signer);
      // Using mock proof for demo (in production, this would be a real ZK proof)
      await contracts.verifyHuman('mock-zk-proof', [1]);
      
      // Refresh user data
      const profile = await contracts.getUserProfile(address!);
      setUser({
        address: address!,
        level: profile.level,
        ensName: profile.ensName,
        isVerifiedHuman: profile.isVerifiedHuman,
        attestations: profile.attestations,
      });

      toast.success('Human verification complete!');
    } catch (error: any) {
      console.error('Verification failed:', error);
      toast.error(error.reason || error.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Connect your wallet to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your identity and verification</p>
      </div>

      {/* Wallet Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Wallet</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Address</span>
            <span className="font-mono text-sm">{address}</span>
          </div>
          {user?.ensName && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ENS Name</span>
              <span className="font-medium">{user.ensName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Verification Steps */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Verification Status</h2>
        <div className="space-y-4">
          {/* Step 1: Basic Registration */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  (user?.level || 0) >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                {(user?.level || 0) >= 1 ? '✓' : '1'}
              </div>
              <div>
                <div className="font-medium">Basic Registration</div>
                <div className="text-sm text-gray-600">Register your wallet on-chain</div>
              </div>
            </div>
            {(user?.level || 0) >= 1 ? (
              <span className="badge badge-success">Complete</span>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="btn-primary text-sm"
              >
                {registering ? 'Registering...' : 'Register'}
              </button>
            )}
          </div>

          {/* Step 2: Human Verification */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  user?.isVerifiedHuman ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}
              >
                {user?.isVerifiedHuman ? '✓' : '2'}
              </div>
              <div>
                <div className="font-medium">Human Verification</div>
                <div className="text-sm text-gray-600">Prove you're human with ZK-KYC</div>
              </div>
            </div>
            {user?.isVerifiedHuman ? (
              <span className="badge badge-success">Verified</span>
            ) : (
              <button
                onClick={handleVerify}
                disabled={verifying || (user?.level || 0) < 1}
                className="btn-primary text-sm"
              >
                {verifying ? 'Verifying...' : 'Verify'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attestations */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Attestations</h2>
        {user?.attestations && user.attestations.length > 0 ? (
          <div className="space-y-2">
            {user.attestations.map((att: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {att.type === 0 ? '🎓' : att.type === 1 ? '✅' : '⚠️'}
                  </span>
                  <div>
                    <div className="font-medium">
                      {att.type === 0 ? 'Skill Badge' : att.type === 1 ? 'Project Complete' : 'Warning'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Reference #{att.referenceId}
                    </div>
                  </div>
                </div>
                <span className={`badge ${att.isPositive ? 'badge-success' : 'badge-error'}`}>
                  {att.isPositive ? 'Positive' : 'Negative'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No attestations yet. Complete projects and skill tests to earn attestations.
          </p>
        )}
      </div>
    </div>
  );
}

export default Profile;
