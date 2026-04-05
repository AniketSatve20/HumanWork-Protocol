import { DELOS_THEME } from '@/theme';

interface NarrativeHUDUser {
  displayName?: string;
  walletAddress?: string;
  cornerstone?: string | number | Date;
}

interface NarrativeHUDProject {
  title?: string;
  briefDescription?: string;
  transactionHash?: string;
}

interface NarrativeHUDProps {
  user?: NarrativeHUDUser | null;
  activeProject?: NarrativeHUDProject | null;
}

export default function NarrativeHUD({ user, activeProject }: NarrativeHUDProps) {
  return (
    <div className="fixed top-0 left-0 w-full z-50 pointer-events-none select-none">
      {/* CRT Scanline Overlay */}
      <div
        className="absolute inset-0 z-50 pointer-events-none"
        style={{
          opacity: 0.05,
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent, transparent 2px, #000 3px, transparent 4px)',
        }}
      />
      {/* HUD Panel */}
      <div className="relative flex flex-col items-start m-8 gap-4">
        <div
          className="backdrop-blur-md border rounded-lg px-8 py-5 shadow-xl"
          style={{
            border: `0.5px solid ${DELOS_THEME.bone}`,
            background: `${DELOS_THEME.obsidian}CC`, // 80% opacity
          }}
        >
          <h1
            className="font-serif text-3xl tracking-wide mb-2"
            style={{ color: DELOS_THEME.bone, fontFamily: 'Bodoni Moda, serif' }}
          >
            Narrative Identity
          </h1>
          <div
            className="text-lg font-light mb-1"
            style={{ color: DELOS_THEME.bone }}
          >
            {user?.displayName || user?.walletAddress}
          </div>
          <div
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: DELOS_THEME.hostSaffron }}
          >
            Cornerstone: {user?.cornerstone && new Date(user.cornerstone).toLocaleString()}
          </div>
        </div>
        {activeProject && (
          <div
            className="backdrop-blur-md border rounded-lg px-8 py-4 shadow-lg"
            style={{
              border: `0.5px solid ${DELOS_THEME.bone}`,
              background: `${DELOS_THEME.obsidian}CC`,
            }}
          >
            <div
              className="font-serif text-xl mb-1"
              style={{ color: DELOS_THEME.hostSaffron, fontFamily: 'Bodoni Moda, serif' }}
            >
              {activeProject.title}
            </div>
            <div
              className="font-light mb-2"
              style={{ color: DELOS_THEME.bone }}
            >
              {activeProject.briefDescription}
            </div>
            <div
              className="text-xs font-mono"
              style={{ color: DELOS_THEME.bone }}
            >
              Tx: <span className="tracking-tight">{activeProject.transactionHash}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
