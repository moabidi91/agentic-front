/**
 * The six brand icons offered on WelcomeScreen, ported verbatim (same paths
 * and viewBox) from the approved Welcome.dc.html mockup so the real app
 * matches the reviewed design exactly.
 */
import type { JSX, SVGProps } from 'react';

export type IconId = 'pulse' | 'hex' | 'orbit' | 'monogram' | 'honeycomb' | 'facet';

export const ICON_IDS: IconId[] = ['pulse', 'hex', 'orbit', 'monogram', 'honeycomb', 'facet'];

export const ICON_LABELS: Record<IconId, string> = {
  pulse: 'Pulse',
  hex: 'Concentric',
  orbit: 'Orbit',
  monogram: 'Monogram',
  honeycomb: 'Honeycomb',
  facet: 'Facet',
};

interface IconProps extends SVGProps<SVGSVGElement> {
  /** Primary stroke/fill color (mockup token: navy). */
  primary: string;
  /** Accent stroke/fill color (mockup token: blue). */
  accent: string;
  size?: number;
}

export function PulseIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth={1.6} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M7 14l2.3-5.5 2 7.5 2-5 1.7 3h2" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HexIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      <polygon points="12,3 19.79,7.5 19.79,16.5 12,21 4.21,16.5 4.21,7.5" fill="none" stroke={primary} strokeWidth={1.4} />
      <polygon points="12,7.5 15.9,9.75 15.9,14.25 12,16.5 8.1,14.25 8.1,9.75" fill="none" stroke={accent} strokeWidth={1.4} />
      <circle cx="12" cy="12" r="1.4" fill={primary} />
    </svg>
  );
}

export function OrbitIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      <line x1="12" y1="12" x2="12" y2="5" stroke={primary} strokeWidth={1.3} />
      <line x1="12" y1="12" x2="5.94" y2="15.5" stroke={primary} strokeWidth={1.3} />
      <line x1="12" y1="12" x2="18.06" y2="15.5" stroke={primary} strokeWidth={1.3} />
      <circle cx="12" cy="12" r="2.6" fill={primary} />
      <circle cx="12" cy="5" r="1.8" fill={primary} />
      <circle cx="5.94" cy="15.5" r="1.8" fill={accent} />
      <circle cx="18.06" cy="15.5" r="1.8" fill={accent} />
    </svg>
  );
}

export function MonogramIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      <polygon points="12,2.5 20.73,7.25 20.73,16.75 12,21.5 3.27,16.75 3.27,7.25" fill="none" stroke={primary} strokeWidth={1.4} />
      <rect x="8.2" y="7.3" width="1.9" height="9.4" rx="0.9" fill={primary} />
      <rect x="13.9" y="7.3" width="1.9" height="9.4" rx="0.9" fill={primary} />
      <rect x="8.2" y="11.05" width="7.6" height="1.9" rx="0.9" fill={accent} />
    </svg>
  );
}

export function HoneycombIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...rest}>
      <polygon points="6.63,8.9 3.945,10.45 3.945,13.55 6.63,15.1 9.315,13.55 9.315,10.45" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="17.37,8.9 14.685,10.45 14.685,13.55 17.37,15.1 20.055,13.55 20.055,10.45" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="9.315,4.25 6.63,5.8 6.63,8.9 9.315,10.45 12,8.9 12,5.8" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="14.685,4.25 12,5.8 12,8.9 14.685,10.45 17.37,8.9 17.37,5.8" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="9.315,13.55 6.63,15.1 6.63,18.2 9.315,19.75 12,18.2 12,15.1" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="14.685,13.55 12,15.1 12,18.2 14.685,19.75 17.37,18.2 17.37,15.1" fill="none" stroke={primary} strokeWidth={1} />
      <polygon points="12,8.9 9.315,10.45 9.315,13.55 12,15.1 14.685,13.55 14.685,10.45" fill={accent} />
    </svg>
  );
}

export function FacetIcon({ primary, accent, size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth={1.3} {...rest}>
      <polygon points="12,2 22,12 12,22 2,12" />
      <line x1="12" y1="2" x2="12" y2="22" stroke={primary} strokeOpacity={0.5} strokeWidth={1} />
      <line x1="2" y1="12" x2="22" y2="12" stroke={accent} strokeWidth={1.4} />
    </svg>
  );
}

export const ICON_COMPONENTS: Record<IconId, (props: IconProps) => JSX.Element> = {
  pulse: PulseIcon,
  hex: HexIcon,
  orbit: OrbitIcon,
  monogram: MonogramIcon,
  honeycomb: HoneycombIcon,
  facet: FacetIcon,
};

export function BrandIcon({ id, ...rest }: { id: IconId } & IconProps) {
  const Component = ICON_COMPONENTS[id];
  return <Component {...rest} />;
}
