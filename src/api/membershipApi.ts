import client from './client';

export interface MembershipPlanDto {
  code: string;
  name: string;
  tier: 'basic' | 'standard' | 'premium';
  purchaseMode: 'auto_monthly' | 'auto_yearly' | 'one_time_month' | 'one_time_year';
  priceCents: number;
  priceYuan: number;
  currency: string;
  monthlyCredits: number;
  discountZhe: number;
  unitPriceYuanPer100: number;
  baseUnitPriceYuanPer100: number;
  billingIntervalMonths: number;
  isActive: boolean;
  wechatPapayPlanId?: string;
  firstMonthPriceCents?: number | null;
  features: IMembershipPlanFeature[];
}

export interface IMembershipPlanFeature {
  key: string;
  i18nKey: string;
  i18nParams?: Record<string, any>;
  label?: string;
  description?: string;
  value: number | string | boolean;
  unit?: string;
  icon?: string;
  group?: string;
  highlight?: boolean;
  order?: number;
}

export interface CreateMembershipPaymentOrderParams {
  planCode: string;
  totalAmount: number;
  workspaceId: string;
}

export interface SigningSessionStatus {
  status: 'signing' | 'signed' | 'active' | 'failed' | 'expired';
  contractId: string | null;
  subscriptionId: number | null;
  latestOrderNo: string | null;
  latestOrderStatus: 'created' | 'processing' | 'success' | 'failed' | null;
  failCode: string | null;
  failMessage: string | null;
}

export interface PureSigningSessionResponse {
  signingSessionId: string;
  entrustwebUrl: string;
  createdAt: string;
  expiresAt: string;
}

export type SubscriptionStatus =
  | 'draft'
  | 'signing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export interface SubscriptionDetails {
  subscriptionId: number;
  planCode: string;
  tier: 'basic' | 'standard' | 'premium';
  purchaseMode: 'one_time_month' | 'auto_monthly' | 'auto_yearly' | 'one_time_year';
  status: SubscriptionStatus;
  autoRenew: boolean;
  termStartAt: string | null;
  termEndAt: string | null;
  currentPeriodStartAt: string | null;
  currentPeriodEndAt: string | null;
  monthlyQuota: number;
  remainingInCurrentPeriod: number;
  nextBillingAt: string | null;
}

export async function getMembershipPlans(workspaceId: string) {
  const response = await client.get<MembershipPlanDto[]>('/subscriptions/membership-plans', {
    workspaceId
  });
  return response.data;
}

export async function purchaseOneTimeSubscription(params: {
  planCode: string;
  totalAmount: number;
  workspaceId: string;
}) {
  const response = await client.post<
    { planCode: string; totalAmount: number; workspaceId: string },
    { codeUrl: string; outTradeNo: string; subscriptionId: number; expiresAt: string }
  >('/subscriptions/purchase', params);
  return response.data;
}

export async function closeOneTimeOrder(outTradeNo: string, workspaceId: string) {
  await client.post('/subscriptions/close-order', { outTradeNo, workspaceId });
}

export async function createSigningSession(params: {
  workspaceId: string;
  planCode: string;
  displayAccountName?: string;
}) {
  const response = await client.post<
    { workspaceId: string; planCode: string; displayAccountName?: string },
    PureSigningSessionResponse
  >('/subscriptions/signing-sessions-pure', params);
  return response.data;
}

export async function getSigningSessionStatus(sessionId: string, workspaceId: string) {
  const response = await client.get<SigningSessionStatus>(
    `/subscriptions/signing-sessions-pure/${sessionId}`,
    { workspaceId },
  );
  return response.data;
}

export async function getCurrentSubscription(workspaceId: string) {
  const response = await client.get<SubscriptionDetails>('/subscriptions/me',
    { workspaceId },
  );
  return response.data;
}

export async function closeSigningSession(signingSessionId: string, workspaceId: string) {
  await client.post('/subscriptions/close-signing-session', { signingSessionId, workspaceId });
}
