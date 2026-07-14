// Minimal hand-drawn icon set — no icon library dependency. Each is a plain
// 20x20 stroke SVG using currentColor so it inherits text color/hover states.
type IconName =
  | 'template'
  | 'schedule'
  | 'sparkles'
  | 'settings'
  | 'inbox'
  | 'calendar'
  | 'plug';

const PATHS: Record<IconName, string> = {
  template: 'M4 4h12v3H4V4zm0 5h12v7H4V9zm2 2v3h3v-3H6z',
  schedule: 'M10 3a7 7 0 100 14 7 7 0 000-14zm.5 3v4.2l3 1.8-.8 1.3-3.7-2.3V6h1.5z',
  sparkles: 'M6 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zm8 6l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
  settings:
    'M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm7 3.5l1.6-1.2-1-1.7-1.9.6a5.5 5.5 0 00-1.2-.7L14 4.7h-2l-.5 1.9c-.44.16-.85.4-1.2.68l-1.9-.6-1 1.7L9 10l-1.6 1.2 1 1.7 1.9-.6c.35.28.76.52 1.2.68L12 15.3h2l.5-1.9c.44-.16.85-.4 1.2-.68l1.9.6 1-1.7L17 10z',
  inbox: 'M4 4h12l2 6v6H2v-6l2-6zm0 6h3l1 2h4l1-2h3',
  calendar: 'M5 3v2M15 3v2M3 7h14M4 5h12a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
  plug: 'M8 3v4M12 3v4M6 7h8v3a4 4 0 01-4 4 4 4 0 01-4-4V7zM10 14v3',
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
