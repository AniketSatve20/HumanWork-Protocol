import { Link } from 'react-router-dom';
import { useWalletStore } from '../../stores/walletStore';

export function HomePage() {
  const { isConnected, connect } = useWalletStore();

  const features = [
    {
      title: 'AI-Powered Skill Verification',
      description: 'Get your skills verified by AI and earn on-chain badges that prove your expertise.',
      icon: '🎓',
    },
    {
      title: 'Secure Escrow Payments',
      description: 'Milestone-based payments held in smart contracts until work is approved.',
      icon: '🔒',
    },
    {
      title: 'Decentralized Dispute Resolution',
      description: 'Fair jury system with AI-assisted verdicts for conflict resolution.',
      icon: '⚖️',
    },
    {
      title: 'Enterprise B2B Features',
      description: 'Agency registration, team management, and GST verification for businesses.',
      icon: '🏢',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Future of<br />
              <span className="text-primary-200">Decentralized Work</span>
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              AI-verified skills, secure escrow, and fair dispute resolution.
              Built on Hedera for the modern freelance economy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isConnected ? (
                <>
                  <Link to="/skills" className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg">
                    Take a Skill Test
                  </Link>
                  <Link to="/projects" className="btn border-2 border-white text-white hover:bg-white/10 px-8 py-3 text-lg">
                    Find Projects
                  </Link>
                </>
              ) : (
                <button
                  onClick={connect}
                  className="btn bg-white text-primary-700 hover:bg-primary-50 px-8 py-3 text-lg"
                >
                  Connect Wallet to Start
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why HumanWork Protocol?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600">$0</div>
              <div className="text-gray-600">Platform Fees</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">100%</div>
              <div className="text-gray-600">On-Chain</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">AI</div>
              <div className="text-gray-600">Skill Verification</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600">Hedera</div>
              <div className="text-gray-600">Powered</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-200 mb-8">
            Join the decentralized workforce revolution. Connect your wallet and start today.
          </p>
          {!isConnected && (
            <button onClick={connect} className="btn bg-white text-primary-900 hover:bg-primary-50 px-8 py-3 text-lg">
              Connect Wallet
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
