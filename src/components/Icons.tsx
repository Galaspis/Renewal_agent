import type { ReactNode, SVGProps } from "react";
import type { Category, InsuranceType } from "@/lib/types";

// Karbol icon set: the 30 originals from karbol-brand-kit/icons/mono (48-unit grid,
// 2.6 stroke, currentColor). Drawn inline so they colour with the text around them.

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconAdd(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M24 9V39M9 24H39" strokeWidth="3.5" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M22 8Q24 5 26 8L42 36Q43 39 39 39H9Q5 39 7 35Z" />
      <path d="M24 17V27" strokeWidth="3.5" />
      <circle cx="24" cy="33" r="1" fill="currentColor" />
    </Svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8H42V17H6ZM10 17V40H38V17" />
      <path d="M19 25H29" strokeWidth="3.5" />
    </Svg>
  );
}

export function IconAttachment(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 28L29 17C35 11 42 19 36 25L21 40C12 49 0 36 9 27L27 9C38 -2 51 13 42 22" />
      <path d="M15 32L29 18" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 24H39M27 12L39 24L27 36" />
      <path d="M15 19V29" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 30V20C12 5 36 5 36 20V30L40 35H8ZM19 40Q24 45 29 40" />
      <path d="M17 6L15 3M24 4V1M31 6L33 3" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 9H38V39H10ZM10 18H38M17 5V13M31 5V13" />
      <rect x="16" y="24" width="7" height="7" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 23L12 12H35L41 23V36H7ZM7 23H41M11 36V41M37 36V41M12 29H17M31 29H36" />
      <path d="M16 17H31" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 9H28M38 25V40H9V10" />
      <path d="M18 24L25 31L42 11" strokeWidth="3.5" />
    </Svg>
  );
}

/** Just the tick, for buttons and small badges. */
export function IconTick(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 25L20 35L40 12" strokeWidth="3.5" />
    </Svg>
  );
}

export function IconCloud(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 35C1 34 3 18 14 18C18 2 39 8 37 23C49 25 45 36 37 36H13" />
      <path d="M18 28H29" />
    </Svg>
  );
}

export function IconDelete(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 12H40M13 12L16 41H33L36 12M19 12V6H29V12M21 20V33M28 20V33" />
    </Svg>
  );
}

export function IconDigital(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 8H39V30H9ZM24 30V38M16 39H32" />
      <path d="M17 17L13 21L17 25M30 17L34 21L30 25" />
    </Svg>
  );
}

export function IconDocument(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5H29L37 13V43H12ZM29 5V14H37M18 23H31M18 30H31M18 37H26" />
      <path d="M18 16H22" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 30L31 10L39 18L19 38L7 42ZM11 30L19 38M29 12L37 20" />
      <path d="M31 10L35 6L43 14L39 18" />
    </Svg>
  );
}

export function IconEmail(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12H43V37H5ZM5 12L24 27L43 12" />
      <path d="M5 37L16 26M43 37L32 26" />
    </Svg>
  );
}

export function IconExport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 29V41H39V29M24 5V31M15 14L24 5L33 14" />
    </Svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 11H42M12 24H36M18 37H30" />
      <rect x="14" y="7" width="5" height="8" rx="1" fill="currentColor" stroke="none" />
      <rect x="29" y="20" width="5" height="8" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 14H19L23 19H42V39H6ZM6 14V9H20L25 14H38V19" />
      <path d="M15 28H32" />
    </Svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 16A17 17 0 1 1 7 31M5 7V18H16" />
      <path d="M25 13V25L32 29" />
    </Svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 22L24 6L43 22M11 20V41H37V20M21 41V29H29V41" />
      <path d="M18 18H29" />
    </Svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 12H40L44 36H31L27 41H20L16 36H4ZM9 27H17L21 32H27L31 27H39" />
      <path d="M24 7V23M19 18L24 23L29 18" />
    </Svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="24" r="2" fill="currentColor" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
      <circle cx="38" cy="24" r="2" fill="currentColor" />
    </Svg>
  );
}

export function IconNext(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M38 24H9M21 12L9 24L21 36" />
      <path d="M33 19V29" />
    </Svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 10V38M32 10V38" strokeWidth="5" />
      <path d="M21 43H27" />
    </Svg>
  );
}

export function IconRenew(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M37 18A15 15 0 1 0 38 31M37 7V18H26" />
      <path d="M24 15V25L30 29" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="21" cy="21" r="13" />
      <path d="M31 31L42 42" />
      <path d="M15 20Q15 14 21 14" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 12H41M7 24H41M7 36H41" />
      <rect x="14" y="8" width="7" height="8" rx="2" />
      <rect x="29" y="20" width="7" height="8" rx="2" fill="currentColor" stroke="none" />
      <rect x="17" y="32" width="7" height="8" rx="2" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M24 6L39 12V25Q38 36 24 43Q10 36 9 25V12Z" />
      <path d="M17 24L22 29L32 19" />
    </Svg>
  );
}

export function IconSnooze(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 28V20C12 5 33 5 35 18M10 30L7 35H20" />
      <circle cx="32" cy="32" r="10" />
      <path d="M32 26V32L36 34" />
    </Svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 13H39V39H7ZM7 13V8H33V13M39 22H29V32H39" />
      <circle cx="33" cy="27" r="1" fill="currentColor" />
    </Svg>
  );
}

/** Leaving the app: the export arrow turned sideways, in the same stroke. */
export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 9H9V39H20M31 15L40 24L31 33M40 24H17" />
    </Svg>
  );
}

// Old names still used around the app, mapped onto the Karbol drawings.
export const IconPlus = IconAdd;
export const IconAlarm = IconAlert;
export const IconDots = IconMore;
export const IconSparkle = IconRenew;
export const IconTag = IconFolder;
export const IconBuilding = IconHome;
export const IconShieldCar = IconCar;
export const IconCard = IconWallet;
export const IconId = IconDocument;
export const IconGlobe = IconCloud;
export const IconUsers = IconWallet;

const CATEGORY_ICONS: Record<Category, (props: IconProps) => ReactNode> = {
  insurance: IconShield,
  license: IconDocument,
  subscription: IconDigital,
  warranty: IconCheck,
  membership: IconWallet,
  domain: IconCloud,
  other: IconFolder,
};

const INSURANCE_ICONS: Partial<Record<InsuranceType, (props: IconProps) => ReactNode>> = {
  car: IconCar,
  home: IconHome,
};

export function CategoryGlyph({
  category,
  subcategory,
  className,
}: {
  category: Category;
  subcategory?: InsuranceType | null;
  className?: string;
}) {
  const Icon =
    (category === "insurance" && subcategory ? INSURANCE_ICONS[subcategory] : undefined) ??
    CATEGORY_ICONS[category] ??
    IconFolder;
  return <Icon className={className} />;
}
