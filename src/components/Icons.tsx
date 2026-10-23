import type { ReactNode, SVGProps } from "react";
import type { Category } from "@/lib/types";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v6c0 5 3.2 7.8 7 9 3.8-1.2 7-4 7-9V6z" />
    </Svg>
  );
}

export function IconShieldCar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v6c0 5 3.2 7.8 7 9 3.8-1.2 7-4 7-9V6z" />
      <path d="M8.5 14.2h7l.8-2.4H7.7z" />
      <circle cx="9.3" cy="14.2" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="14.2" r="0.7" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3M3 12l3 3" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5 9.5 17 19 7.5" />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2.2 2.2M14.8 14.8 17 17M17 7l-2.2 2.2M9.2 14.8 7 17" />
    </Svg>
  );
}

export function IconAlarm(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v3.5l2 1.5M6 5l-2 2M18 5l2 2" />
    </Svg>
  );
}

export function IconDots(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 13.5 12.5 21a2 2 0 0 1-2.8 0L4 15.3V8h7.3z" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 21V5h10v16M15 10h4v11M8 8h4M8 12h4M8 16h4" />
    </Svg>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </Svg>
  );
}

export function IconId(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M14 11h4M14 15h3" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.8 2.5 13.2 0 16M12 4c-2.5 2.8-2.5 13.2 0 16" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.6-3 2.7-5 6-5s5.4 2 6 5M17 11a2.5 2.5 0 1 0 0-5" />
      <path d="M21 19c-.4-2.2-1.8-4-4-4.6" />
    </Svg>
  );
}

const CATEGORY_ICONS: Record<Category, (props: IconProps) => ReactNode> = {
  insurance: IconShieldCar,
  license: IconId,
  subscription: IconCard,
  warranty: IconShield,
  membership: IconUsers,
  domain: IconGlobe,
  other: IconTag,
};

export function CategoryGlyph({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICONS[category] ?? IconTag;
  return <Icon className={className} />;
}
