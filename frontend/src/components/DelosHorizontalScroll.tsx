import React, { useRef } from 'react';

interface DelosHorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * DelosHorizontalScroll
 * Wraps horizontally scrollable content with stately GSAP-powered scrollTo transitions.
 * Usage: <DelosHorizontalScroll><div>...</div></DelosHorizontalScroll>
 */
export default function DelosHorizontalScroll({ children, className = '' }: DelosHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto whitespace-nowrap scrollbar-hide ${className}`}
      style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
    >
      {children}
    </div>
  );
}
