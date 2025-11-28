import { Variants } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1] as const;

export const spring = {
  type: 'spring',
  stiffness: 120,
  damping: 18,
  mass: 0.8,
};

export const section: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...spring, staggerChildren: 0.06, when: 'beforeChildren' },
  },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

export const hoverCard: Variants = {
  rest: { scale: 1, rotateX: 0, rotateY: 0, boxShadow: '0 4px 14px rgba(0,0,0,.06)' },
  hover: { scale: 1.02, rotateX: 2, rotateY: -2, boxShadow: '0 12px 28px rgba(0,0,0,.15)', transition: { duration: 0.28, ease } },
};

export const buttonNudge: Variants = {
  rest: { y: 0 },
  hover: { y: -1, transition: { duration: 0.18, ease } },
};

export const progressVariants = {
  initial: { width: '0%' },
  animate: (pct: number) => ({ width: `${pct}%`, transition: { duration: 0.4, ease } }),
};

export const shimmerGradient = {
  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.0), rgba(255,255,255,.6), rgba(255,255,255,.0))',
  backgroundSize: '200% 100%',
};
