const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const BagIcon = () => (
  <svg {...base} aria-hidden><path d="M6 7h12l1 13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 7Z" /><path d="M9 7V6a3 3 0 0 1 6 0v1" /></svg>
);
export const MenuIcon = () => (
  <svg {...base} aria-hidden><path d="M4 8h16M4 16h10" /></svg>
);
export const CloseIcon = () => (
  <svg {...base} aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ChevronLeft = () => (
  <svg {...base} aria-hidden><path d="m15 5-7 7 7 7" /></svg>
);
export const ChevronRight = () => (
  <svg {...base} aria-hidden><path d="m9 5 7 7-7 7" /></svg>
);
export const InstagramIcon = () => (
  <svg {...base} aria-hidden><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></svg>
);
export const FacebookIcon = () => (
  <svg {...base} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M13 21v-8h2.5l.5-3h-3V8.5c0-.9.4-1.5 1.6-1.5H16V4.5c-.4-.1-1.2-.2-2.1-.2-2.2 0-3.6 1.300-3.600 3.700V10H8v3h2.300v8" /></svg>
);
export const TikTokIcon = () => (
  <svg {...base} aria-hidden><path d="M14 4v10.500a3.500 3.500 0 1 1-3.500-3.500" /><path d="M14 4c.3 2.400 1.900 4 4.500 4.300" /></svg>
);
export const TruckIcon = () => (
  <svg {...base} aria-hidden><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.500" r="1.800" /><circle cx="17" cy="17.500" r="1.800" /></svg>
);
export const ReturnIcon = () => (
  <svg {...base} aria-hidden><path d="M4 9h11a5 5 0 0 1 0 10H8" /><path d="m8 5-4 4 4 4" /></svg>
);
export const LockIcon = () => (
  <svg {...base} aria-hidden><rect x="5" y="10.500" width="14" height="10" rx="2" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" /></svg>
);
export const PinIcon = () => (
  <svg {...base} aria-hidden><path d="M12 21s7-6.200 7-11.500a7 7 0 0 0-14 0C5 14.800 12 21 12 21Z" /><circle cx="12" cy="9.500" r="2.500" /></svg>
);

export const SOCIALS = [
  { name: 'Instagram', href: 'https://www.instagram.com/lets_wrassle/', Icon: InstagramIcon },
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61577946713103', Icon: FacebookIcon },
  { name: 'TikTok', href: 'https://www.tiktok.com/@lets.wrassle', Icon: TikTokIcon },
];
