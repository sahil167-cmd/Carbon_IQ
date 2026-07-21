export type DocumentStatus = "Processed" | "Flagged" | "Manual Review" | "Processing";

export interface Document {
  id: string;
  name: string;
  type: string;
  confidence: number;
  status: DocumentStatus;
  date: string;
  source: string;
  size: string;
  icon?: string;
}

export interface NavItem {
  label: string;
  icon: string;
  href: string;
  active?: boolean;
}

export interface KPIData {
  label: string;
  value: string;
  icon: string;
  badge?: string;
  badgeColor?: "green" | "red" | "default";
}

export interface PricingPlan {
  name: string;
  description: string;
  price: string | number;
  priceMonthly?: number;
  priceAnnual?: number;
  features: string[];
  popular?: boolean;
  cta: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface Supplier {
  initials: string;
  name: string;
  score: number;
  color: "green" | "default" | "error";
}
