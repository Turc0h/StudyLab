import { AnimatePresence, motion } from "motion/react";
import { useLocation, Outlet } from "react-router-dom";
import { EASE_EXPO_OUT, DURATION } from "../../lib/motion-tokens";
import { useThemeStore } from "../../stores/useThemeStore";

export function AnimatedOutlet() {
  const location = useLocation();
  const animationsEnabled = useThemeStore((s) => s.animationsEnabled);
  const reducedMotion = useThemeStore((s) => s.reducedMotion);

  const shouldAnimate = animationsEnabled && !reducedMotion;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : false}
        exit={shouldAnimate ? { opacity: 0, y: -4 } : undefined}
        transition={{
          duration: shouldAnimate ? DURATION.fast : 0.01,
          ease: EASE_EXPO_OUT,
        }}
        className="w-full motion-layer"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
