import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   Compass Cursor — Westworld Delos aesthetic.
   Default: minimalist white dot (5px)
   Hover: compass rose expands with cardinal ticks + Delos Gold north
   Click: contracts with subtle pulse
   Rotation follows horizontal mouse velocity
   ═══════════════════════════════════════════════════════════════════════════ */

export function NeonCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 220, damping: 25, mass: 0.3 });
  const springY = useSpring(cursorY, { stiffness: 220, damping: 25, mass: 0.3 });

  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);
  const prevXRef = useRef(0);
  const compassRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const checkTouch = () => {
      setIsMobile(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch, { passive: true });

    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Compass rotation from horizontal velocity
      const deltaX = e.clientX - prevXRef.current;
      rotationRef.current += deltaX * 0.15;
      prevXRef.current = e.clientX;
    };

    const handleDown = () => setIsClicking(true);
    const handleUp = () => setIsClicking(false);

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[data-cursor-hover]') ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A'
      ) {
        setIsHovering(true);
      }
    };

    const handleOut = () => setIsHovering(false);
    const handleLeave = () => setIsVisible(false);
    const handleEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    document.addEventListener('mouseover', handleOver);
    document.addEventListener('mouseout', handleOut);
    document.addEventListener('mouseleave', handleLeave);
    document.addEventListener('mouseenter', handleEnter);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseout', handleOut);
      document.removeEventListener('mouseleave', handleLeave);
      document.removeEventListener('mouseenter', handleEnter);
      window.removeEventListener('resize', checkTouch);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cursorX, cursorY, isVisible]);

  // Animate compass rotation smoothly
  useEffect(() => {
    let currentRotation = 0;
    const animate = () => {
      currentRotation += (rotationRef.current - currentRotation) * 0.08;
      if (compassRef.current) {
        compassRef.current.style.transform = `rotate(${currentRotation}deg)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (isMobile) return null;

  /* Compass geometry helpers */
  const cx = 22, cy = 22;
  const hov = isHovering;
  const outerR = hov ? 18 : 10;
  const cardInner = hov ? 14 : 7;
  const interInner = hov ? 15.5 : 8;
  const crossLen = hov ? 5 : 3;

  const tick = (angle: number, inner: number, outer: number, stroke: string, width: string, opacity: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return (
      <line
        key={angle}
        x1={cx + Math.cos(rad) * inner}
        y1={cy + Math.sin(rad) * inner}
        x2={cx + Math.cos(rad) * outer}
        y2={cy + Math.sin(rad) * outer}
        stroke={stroke}
        strokeWidth={width}
        style={{ opacity, transition: 'all 0.3s ease' }}
      />
    );
  };

  return (
    <>
      {/* Compass rose — expands on hover */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99998]"
        style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: hov ? 44 : isClicking ? 16 : 28,
          height: hov ? 44 : isClicking ? 16 : 28,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          width: { type: 'spring', stiffness: 350, damping: 28 },
          height: { type: 'spring', stiffness: 350, damping: 28 },
          opacity: { duration: 0.15 },
        }}
      >
        <svg
          ref={compassRef}
          viewBox="0 0 44 44"
          fill="none"
          className="w-full h-full"
          style={{ willChange: 'transform' }}
        >
          {/* Outer ring */}
          <circle
            cx={cx} cy={cy} r={outerR}
            stroke="rgba(209,209,209,0.35)"
            strokeWidth="0.5"
            fill="none"
            style={{ opacity: hov ? 1 : 0.4, transition: 'all 0.3s ease' }}
          />

          {/* Cardinal ticks — N (Delos Gold), E, S, W */}
          {[0, 90, 180, 270].map((a) =>
            tick(a, cardInner, outerR, a === 0 ? '#C9A96E' : 'rgba(209,209,209,0.5)', a === 0 ? '1' : '0.5', hov ? 1 : 0.5)
          )}

          {/* Intercardinal ticks — appear on hover */}
          {[45, 135, 225, 315].map((a) =>
            tick(a, interInner, outerR, 'rgba(209,209,209,0.25)', '0.3', hov ? 1 : 0)
          )}

          {/* Inner crosshairs */}
          <line x1={cx} y1={cy - crossLen} x2={cx} y2={cy + crossLen}
            stroke="rgba(209,209,209,0.3)" strokeWidth="0.3" />
          <line x1={cx - crossLen} y1={cy} x2={cx + crossLen} y2={cy}
            stroke="rgba(209,209,209,0.3)" strokeWidth="0.3" />
        </svg>
      </motion.div>

      {/* Center dot — pure white, Delos Gold on hover */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99999]"
        style={{ x: cursorX, y: cursorY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: isClicking ? 3 : 5,
          height: isClicking ? 3 : 5,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.1 }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            backgroundColor: hov ? '#C9A96E' : '#F5F5F5',
            boxShadow: `0 0 ${hov ? 8 : 4}px ${hov ? 'rgba(201,169,110,0.4)' : 'rgba(245,245,245,0.3)'}`,
            transition: 'background-color 0.2s, box-shadow 0.2s',
          }}
        />
      </motion.div>

      {/* Global CSS to hide default cursor */}
      <style>{`
        *, *::before, *::after { cursor: none !important; }
        @media (max-width: 768px), (pointer: coarse) {
          *, *::before, *::after { cursor: auto !important; }
        }
      `}</style>
    </>
  );
}

export default NeonCursor;
