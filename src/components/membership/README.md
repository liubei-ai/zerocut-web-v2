# Membership Module

This module provides membership plan management functionality for ZeroCut.

## Components

### MembershipModal.vue
Main modal component that displays membership plans and handles user interactions.

**Features:**
- Displays current user membership status and credits balance
- Shows available membership plans (Basic, Standard, Premium)
- Supports multiple billing cycles: monthly, yearly, and subscription
- Integrates with payment and signing modals
- Links to wallet recharge and subscription management

**Props:**
- `open: boolean` - Controls modal visibility

**Events:**
- `update:open` - Emitted when modal should close

### MembershipPaymentModal.vue
Handles one-time payment flow for membership plans.

**Features:**
- Creates payment order via API
- Generates WeChat Pay QR code
- Polls payment status
- Handles payment timeout and errors
- 5-minute countdown timer

**Props:**
- `open: boolean` - Controls modal visibility
- `membershipPlan: MembershipPlanDto | null` - Selected plan
- `title?: string` - Plan display name

**Events:**
- `update:open` - Emitted when modal should close
- `success` - Emitted when payment succeeds
- `cancel` - Emitted when user cancels

### MembershipSigningModal.vue
Handles pure signing + first-deduction flow for auto-renewal subscription plans.

**Features:**
- Creates a pure signing session via API (`/subscriptions/signing-sessions-pure`)
- WeChat in-app: auto redirects to `entrustwebUrl`
- Other environments: renders QR code of `entrustwebUrl`
- Polls signing status until `active` (signed + first deduction succeeded)
- Intermediate `signed` state shows "signed, waiting for first deduction"
- Surfaces `failMessage` on failed first-deduction with retry option
- Countdown dynamically derived from server `expiresAt` (30 minutes)

**Props:**
- `open: boolean` - Controls modal visibility
- `membershipPlan: MembershipPlanDto | null` - Selected plan
- `title?: string` - Plan display name

**Events:**
- `update:open` - Emitted when modal should close
- `success` - Emitted when subscription is fully active
- `cancel` - Emitted when user cancels

## API

### membershipApi.ts
Provides API functions for membership operations.

**Key Functions:**
- `getMembershipPlans()` - Fetch all available plans
- `getCurrentSubscription(workspaceId)` - Get user's current subscription
- `purchaseOneTimeSubscription(params)` - Create one-time payment order
- `createSigningSession(params)` - Create pure signing (sign + first-deduction) session
- `getSigningSessionStatus(sessionId, workspaceId)` - Check pure signing status
- `closeOneTimeOrder(outTradeNo, workspaceId)` - Cancel payment order
- `closeSigningSession(signingSessionId, workspaceId)` - Cancel pure signing session

## Usage

In Header.vue:
```vue
<script setup>
import MembershipModal from '@/components/membership/MembershipModal.vue';

const showMembershipModal = ref(false);
</script>

<template>
  <button @click="showMembershipModal = true">
    Open Membership
  </button>
  
  <MembershipModal v-model:open="showMembershipModal" />
</template>
```

## Plan Tiers

- **Basic**: Entry-level membership with 2000 monthly credits
- **Standard**: Mid-tier membership with 8000 monthly credits
- **Premium**: Top-tier membership with 25000 monthly credits (marked as "most cost-effective")

## Billing Cycles

- **Monthly (one_time_month)**: Single month purchase
- **Yearly (one_time_year)**: Single year purchase
- **Subscription (auto_monthly)**: Auto-renewal monthly subscription

## Dependencies

- `qrcode` - QR code generation
- `lucide-vue-next` - Icon components
- `@/stores/creditsStore` - Credits balance management
- `@/stores/authStore` - User authentication
