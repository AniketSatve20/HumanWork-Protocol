import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   Sound System — Delos Audio Controller
   YouTube ambient soundtrack + synthesized UI sounds.
   Includes haunting piano note for contract signing moments.
   Mute toggle in bottom-right corner. Sound starts muted (browser policy).
   ═══════════════════════════════════════════════════════════════════════════ */

// YouTube video ID for ambient soundtrack
const YT_VIDEO_ID = 'bhcYDRYNB8c';
const YT_VOLUME = 25; // 0–100, keep low so UI sounds cut through

// Context for global audio state
interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playClick: () => void;
  playHover: () => void;
  playSuccess: () => void;
  playError: () => void;
  playNavigationHum: () => void;
  playContractSign: () => void;
}

const SoundContext = createContext<SoundContextType>({
  isMuted: true,
  toggleMute: () => {},
  playClick: () => {},
  playHover: () => {},
  playSuccess: () => {},
  playError: () => {},
  playNavigationHum: () => {},
  playContractSign: () => {},
});

export function useSoundSystem() {
  return useContext(SoundContext);
}

/* ── YouTube IFrame API loader ────────────────────────────────────────── */
let ytApiReady = false;
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiReady) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    // If the API is already loaded (script tag exists)
    if ((window as any).YT && (window as any).YT.Player) {
      ytApiReady = true;
      resolve();
      return;
    }

    // Callback that the YouTube IFrame API will invoke
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      prev?.();
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });

  return ytApiPromise;
}

/* ── Audio Synthesizer — Web Audio API for UI sounds ──────────────────── */
class AudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _muted = true;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.12;
    this.masterGain.connect(this.ctx.destination);
  }

  get muted() { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(val ? 0 : 0.12, this.ctx!.currentTime, 0.1);
    }
  }

  // Mechanical click — short, sharp
  playClick() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);

    // Noise burst for texture
    const bufferSize = this.ctx.sampleRate * 0.02;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
  }

  // Subtle hover tone
  playHover() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(2800, now + 0.03);
    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Success chime
  playSuccess() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    [880, 1100, 1320].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }

  // Error buzz
  playError() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.setValueAtTime(0.04, now + 0.05);
    gain.gain.setValueAtTime(0, now + 0.06);
    gain.gain.setValueAtTime(0.04, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Low-frequency atmospheric hum — BR2049 city drone.
   * Layered sub-bass oscillator (60 Hz) + filtered noise sweep.
   * Fades in over 0.3 s and decays over 1.6 s.
   */
  playNavigationHum() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Sub-bass fundamental (60 Hz sine)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, now);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.10, now + 0.3);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.8);

    // Second harmonic (120 Hz triangle) for warmth
    const harm = this.ctx.createOscillator();
    const harmGain = this.ctx.createGain();
    harm.type = 'triangle';
    harm.frequency.setValueAtTime(120, now);
    harmGain.gain.setValueAtTime(0, now);
    harmGain.gain.linearRampToValueAtTime(0.04, now + 0.35);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    harm.connect(harmGain);
    harmGain.connect(this.masterGain);
    harm.start(now);
    harm.stop(now + 1.6);

    // Filtered noise sweep — atmospheric texture
    const noiseLen = this.ctx.sampleRate * 1.6;
    const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.015;
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 1.6);
    lp.Q.setValueAtTime(2, now);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    noiseSrc.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start(now);
    noiseSrc.stop(now + 1.6);
  }

  /**
   * Haunting piano note — played when signing smart contracts.
   * Synthesised C3 fundamental (130.81 Hz) + harmonics with slow decay,
   * simulating a dampened grand-piano string in an empty Delos lobby.
   * Duration ~3 s with gentle reverb tail via feedback delay.
   */
  playContractSign() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const fundamental = 130.81; // C3

    // Piano harmonics with decreasing amplitude
    const harmonics = [
      { ratio: 1,   amp: 0.18, decay: 3.0 },  // fundamental
      { ratio: 2,   amp: 0.10, decay: 2.4 },  // octave
      { ratio: 3,   amp: 0.04, decay: 1.8 },  // fifth
      { ratio: 4,   amp: 0.025, decay: 1.4 }, // 2nd octave
      { ratio: 5,   amp: 0.012, decay: 1.0 }, // major 3rd
      { ratio: 6,   amp: 0.008, decay: 0.8 }, // 5th above 2nd oct
      { ratio: 7,   amp: 0.004, decay: 0.6 }, // minor 7th (subtle)
    ];

    // Sum node before reverb
    const dryGain = this.ctx.createGain();
    dryGain.gain.setValueAtTime(1.0, now);
    dryGain.connect(this.masterGain);

    harmonics.forEach(({ ratio, amp, decay }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * ratio, now);
      // Soft attack (8 ms) then exponential decay
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain);
      gain.connect(dryGain);
      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    // Hammer thump — short noise burst for realism
    const thumpLen = this.ctx.sampleRate * 0.012;
    const thumpBuf = this.ctx.createBuffer(1, thumpLen, this.ctx.sampleRate);
    const td = thumpBuf.getChannelData(0);
    for (let i = 0; i < thumpLen; i++) {
      td[i] = (Math.random() * 2 - 1) * 0.15 * (1 - i / thumpLen);
    }
    const thump = this.ctx.createBufferSource();
    thump.buffer = thumpBuf;
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.06, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    thump.connect(thumpGain);
    thumpGain.connect(dryGain);
    thump.start(now);

    // Simple feedback-delay reverb tail (cathedral feel)
    const delayNode = this.ctx.createDelay(0.5);
    delayNode.delayTime.setValueAtTime(0.18, now);
    const fbGain = this.ctx.createGain();
    fbGain.gain.setValueAtTime(0.35, now);
    fbGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    const reverbLP = this.ctx.createBiquadFilter();
    reverbLP.type = 'lowpass';
    reverbLP.frequency.setValueAtTime(800, now);
    const wetGain = this.ctx.createGain();
    wetGain.gain.setValueAtTime(0.25, now);

    // Feedback loop: dry → delay → filter → feedback → delay …
    dryGain.connect(delayNode);
    delayNode.connect(reverbLP);
    reverbLP.connect(fbGain);
    fbGain.connect(delayNode);
    reverbLP.connect(wetGain);
    wetGain.connect(this.masterGain);
  }

  destroy() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

/* ── Sound Provider Component ─────────────────────────────────────────── */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const synthRef = useRef<AudioSynth | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const ytReadyRef = useRef(false);

  // Initialize synth engine
  useEffect(() => {
    synthRef.current = new AudioSynth();
    return () => {
      synthRef.current?.destroy();
    };
  }, []);

  // Preload YouTube IFrame API (doesn't play until unmuted)
  useEffect(() => {
    loadYouTubeAPI().then(() => {
      if (!ytContainerRef.current || ytPlayerRef.current) return;

      ytPlayerRef.current = new (window as any).YT.Player(ytContainerRef.current, {
        videoId: YT_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          playlist: YT_VIDEO_ID, // required for loop to work
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            ytReadyRef.current = true;
            ytPlayerRef.current.setVolume(YT_VOLUME);
            // If user already toggled unmute before player was ready
            if (!isMuted) {
              ytPlayerRef.current.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // If video ends, restart (backup for loop)
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              ytPlayerRef.current.seekTo(0);
              ytPlayerRef.current.playVideo();
            }
          },
        },
      });
    });

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.init();

    const newMuted = !isMuted;
    setIsMuted(newMuted);
    synthRef.current.muted = newMuted;

    // Control YouTube player
    if (ytReadyRef.current && ytPlayerRef.current) {
      if (newMuted) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.setVolume(YT_VOLUME);
        ytPlayerRef.current.playVideo();
      }
    }
  }, [isMuted]);

  const playClick = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.playClick();
  }, [isMuted]);

  const playHover = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.playHover();
  }, [isMuted]);

  const playSuccess = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.playSuccess();
  }, [isMuted]);

  const playError = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.playError();
  }, [isMuted]);

  const playNavigationHum = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.init();
    synthRef.current.playNavigationHum();
  }, [isMuted]);

  const playContractSign = useCallback(() => {
    if (!synthRef.current || isMuted) return;
    synthRef.current.init();
    synthRef.current.playContractSign();
  }, [isMuted]);

  // Attach global click listener for button sounds
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        playClick();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [playClick]);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playClick, playHover, playSuccess, playError, playNavigationHum, playContractSign }}>
      {children}
      {/* Hidden YouTube player — off-screen, no pointer events */}
      <div
        ref={ytContainerRef}
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </SoundContext.Provider>
  );
}

/* ── Mute Toggle Button — Delos clinical UI ──────────────────────────── */
export function MuteToggle() {
  const { isMuted, toggleMute } = useSoundSystem();

  return (
    <motion.button
      onClick={toggleMute}
      className="fixed bottom-6 right-6 z-[9999] w-10 h-10 flex items-center justify-center
                 bg-surface-1/80 backdrop-blur-xl border border-aluminum/20
                 hover:border-primary/50 hover:bg-primary/5
                 transition-all duration-300 group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={isMuted ? 'Enable Sound' : 'Mute Sound'}
      data-cursor-hover
    >
      <AnimatePresence mode="wait">
        {isMuted ? (
          <motion.div
            key="muted"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <VolumeX className="w-4 h-4 text-mesa/50 group-hover:text-primary" />
          </motion.div>
        ) : (
          <motion.div
            key="unmuted"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.15 }}
          >
            <Volume2 className="w-4 h-4 text-primary group-hover:text-ivory" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulsing ring when sound is on */}
      {!isMuted && (
        <motion.span
          className="absolute inset-0 border border-primary/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  );
}

export default SoundProvider;
