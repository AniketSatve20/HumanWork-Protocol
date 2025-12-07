import { useState, useEffect } from 'react';
import { useWalletStore } from '../../stores/walletStore';
import { contractService } from '../../services/contracts';

export function DashboardPage() {
  const { isConnected, address, provider, signer } = useWalletStore();
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (isConnected && provider && signer && address) {
      contractService.setProvider(provider, signer);
      loadProfile();
    }
  }, [isConnected, provider, signer, address]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const bal = await contractService.getUSDCBalance(address!);
      setBalance(bal);
      
      // Try to get profile
      try {
        const prof = await contractService.getUserProfile(address!);
        setProfile(prof);
      } catch {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await contractService.registerBasic();
      await loadProfile();
      alert('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleVerify = async () => {
    setRegistering(true);
    try {
      await contractService.verifyHuman();
      await loadProfile();
      alert('Verification successful! You are now a Verified Human.');
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Connect your wallet to view your dashboard.</p>
      </div>
    );
  }

  const levelLabels = ['Not Registered', 'Basic', 'Verified Human'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="card md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Wallet Address</span>
                <p className="font-mono text-sm">{address}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">USDC Balance</span>
                <p className="text-2xl font-bold text-primary-600">{balance} USDC</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Legitimacy Level</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`badge ${
                    !profile ? 'badge-error' :
                    profile.level === 2 ? 'badge-success' : 'badge-warning'
                  }`}>
                    {profile ? levelLabels[Number(profile.level)] : 'Not Registered'}
                  </span>
                </div>
              </div>

              {!profile && (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="btn btn-primary w-full mt-4"
                >
                  {registering ? 'Registering...' : 'Register as Basic User'}
                </button>
              )}

              {profile && Number(profile.level) === 1 && (
                <button
                  onClick={handleVerify}
                  disabled={registering}
                  className="btn btn-primary w-full mt-4"
                >
                  {registering ? 'Verifying...' : 'Upgrade to Verified Human'}
                </button>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Skill Badges</span>
                <span className="text-xl font-bold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Projects</span>
                <span className="text-xl font-bold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reputation</span>
                <span className="text-xl font-bold text-green-600">N/A</span>
              </div>
            </div>
          </div>

          {/* Attestations */}
          <div className="card md:col-span-3">
            <h2 className="text-xl font-semibold mb-4">Attestations</h2>
            {profile?.attestations?.length > 0 ? (
              <div className="space-y-3">
                {profile.attestations.map((att: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${att.isPositive ? 'badge-success' : 'badge-error'}`}>
                        {['SKILL', 'PROJECT', 'NEGATIVE'][att.attestationType]}
                      </span>
                      <span className="text-sm">Reference #{String(att.referenceId)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(Number(att.timestamp) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No attestations yet. Complete skill tests and projects to build your reputation!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
