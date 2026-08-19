export type MembershipTier = "COMMON" | "PRO" | "PREMIUM" | "MONARCH";

export type MembershipStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "pending";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface MembershipTierInfo {
  tier: MembershipTier;
  name: string;
  description: string | null;
  is_paid: boolean;
  is_publicly_purchasable: boolean;
  sort_order: number;
}

export interface MembershipBenefit {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface UserMembership {
  id: string;
  user_id: string;
  tier: MembershipTier;
  status: MembershipStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  invitation_id: string | null;
  created_at: string;
  updated_at: string;
}
