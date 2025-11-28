"use client";

import { PropsWithChildren, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { section as sectionVariants, item as itemVariants } from '@/lib/motion';

type RevealSectionProps = PropsWithChildren<{
  className?: string;
}>;

export function RevealSection({ className, children }: RevealSectionProps) {
  // Avoid invisible content before hydration; default to visible until mounted.
  const [isReady, setIsReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Set ready after mount to trigger animations
    setIsReady(true);
  }, []);

  // Compute animation props outside of render to avoid setState during render
  const shouldAnimate = !prefersReducedMotion && isReady;
  
  return (
    <motion.section
      className={className}
      variants={sectionVariants}
      initial={shouldAnimate ? 'hidden' : 'show'}
      whileInView={shouldAnimate ? 'show' : undefined}
      viewport={shouldAnimate ? { once: true, margin: '0px 0px -10% 0px' } : undefined}
    >
      {children}
    </motion.section>
  );
}

type RevealItemProps = PropsWithChildren<{
  className?: string;
}>;

export function RevealItem({ className, children }: RevealItemProps) {
  const [isReady, setIsReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Set ready after mount to trigger animations
    setIsReady(true);
  }, []);

  // Compute animation props outside of render to avoid setState during render
  const shouldAnimate = !prefersReducedMotion && isReady;

  return (
    <motion.div
      className={className}
      variants={itemVariants}
      initial={shouldAnimate ? 'hidden' : 'show'}
      whileInView={shouldAnimate ? 'show' : undefined}
      viewport={shouldAnimate ? { once: true, margin: '0px 0px -10% 0px' } : undefined}
    >
      {children}
    </motion.div>
  );
}

export default RevealSection;
