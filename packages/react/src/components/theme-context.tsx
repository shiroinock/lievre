// The theme context, apart from system.tsx so parts can narrow it (FamilyScope) without index.ts
// exporting more. Not part of the public API.
import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { WEAR_CONFIG } from '../wear/params.mjs';
import type { Age, Density, Family, Theme, Typography, Wear, WearConfig } from './system';

export const ThemeContext = createContext<{
  theme: Theme;
  density: Density;
  typography: Typography;
  family: Family;
  wear: Wear;
  wearSeed: string;
  wearConfig: WearConfig;
  wearStyle?: CSSProperties;
  age: Age;
}>({
  theme: 'paper',
  density: 'comfortable',
  typography: 'standard',
  family: 'sans',
  wear: 'off',
  wearSeed: WEAR_CONFIG.salt,
  wearConfig: WEAR_CONFIG,
  age: 'none',
});

/**
 * Carries a monospace range (Text and Card's mono) down the context, so portals (PortalSurface)
 * and nested LievreProviders inside it stay monospace too. Always the same element, whether mono
 * or not and whatever the outside is: switching either keeps the tree inside (its state, focus).
 */
export function FamilyScope({ mono, children }: { mono: boolean; children: ReactNode }) {
  const outer = useContext(ThemeContext);
  const family: Family = mono ? 'mono' : outer.family;
  const value = useMemo(() => ({ ...outer, family }), [outer, family]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
