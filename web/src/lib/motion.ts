// One motion language, from Telogify: springs for movement, an expo-out curve for reveals.
export const spring = { type: 'spring', stiffness: 120, damping: 20 } as const;
export const springFirm = { type: 'spring', stiffness: 380, damping: 32 } as const;
export const ease = [0.16, 1, 0.3, 1] as const;
export const blurFade = { initial: { opacity: 0, filter: 'blur(10px)', y: 10 }, animate: { opacity: 1, filter: 'blur(0px)', y: 0 } };
