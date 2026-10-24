import { z } from 'zod';
import {
  tradingPageSchema,
  tradingRelationshipSchema,
  tradingOrderSchema,
  accountingPageSchema,
  journalSchema,
  integrationStatusSchema,
  assistantInputSchema,
  assistantOutputSchema,
  tradingInviteSchema,
  tradingConsentSchema,
  tradingOrderInput,
  tradingTransitionSchema,
  periodDraftSchema,
  journalDraftSchema,
  sourcePostSchema,
  accountingActionSchema,
  reversalSchema,
} from '@inventory/contracts';
import type {
  TradingInvite,
  TradingConsent,
  TradingOrderInput,
  TradingTransition,
  PeriodInput,
  JournalInput,
  SourcePost,
  AccountingAction,
  Reversal,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
const idResult = z.object({ id: z.uuid() });
export const tradingHistorySchema = z.object({
  events: z
    .array(
      z.object({
        id: z.string(),
        businessId: z.uuid(),
        state: z.string(),
        note: z.string(),
        createdAt: z.string(),
      }),
    )
    .max(50),
  hasMore: z.boolean(),
});
export function createTradingClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const base = `/${encodeURIComponent(businessId)}/trading`,
    commands = new RetryableCommands(request, newKey);
  return {
    load: async (offset = 0) => tradingPageSchema.parse(await request(`${base}?offset=${offset}`)),
    invite: (input: Omit<TradingInvite, 'idempotencyKey'>) =>
      commands.run(
        `${base}/relationships`,
        tradingInviteSchema.omit({ idempotencyKey: true }).parse(input),
        tradingRelationshipSchema.parse,
      ),
    consent: (id: string, input: Omit<TradingConsent, 'idempotencyKey'>) =>
      commands.run(
        `${base}/relationships/${encodeURIComponent(id)}`,
        tradingConsentSchema.omit({ idempotencyKey: true }).parse(input),
        tradingRelationshipSchema.parse,
      ),
    create: (input: Omit<TradingOrderInput, 'idempotencyKey'>) =>
      commands.run(
        `${base}/orders`,
        tradingOrderInput.omit({ idempotencyKey: true }).parse(input),
        tradingOrderSchema.parse,
      ),
    transition: (id: string, input: Omit<TradingTransition, 'idempotencyKey'>) =>
      commands.run(
        `${base}/orders/${encodeURIComponent(id)}`,
        tradingTransitionSchema.omit({ idempotencyKey: true }).parse(input),
        tradingOrderSchema.parse,
      ),
    history: async (id: string, offset = 0) =>
      tradingHistorySchema.parse(
        await request(`${base}/orders/${encodeURIComponent(id)}/history?offset=${offset}`),
      ),
  };
}
export function createAccountingClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const base = `/${encodeURIComponent(businessId)}/accounting`,
    commands = new RetryableCommands(request, newKey);
  return {
    load: async (offset = 0) =>
      accountingPageSchema.parse(await request(`${base}?offset=${offset}`)),
    period: (input: Omit<PeriodInput, 'idempotencyKey'>) =>
      commands.run(`${base}/periods`, periodDraftSchema.parse(input), idResult.parse),
    manual: (input: Omit<JournalInput, 'idempotencyKey'>) =>
      commands.run(`${base}/journals`, journalDraftSchema.parse(input), journalSchema.parse),
    source: (input: Omit<SourcePost, 'idempotencyKey'>) =>
      commands.run(
        `${base}/sources`,
        sourcePostSchema.omit({ idempotencyKey: true }).parse(input),
        journalSchema.parse,
      ),
    close: (id: string, input: Omit<AccountingAction, 'idempotencyKey'>) =>
      commands.run(
        `${base}/periods/${encodeURIComponent(id)}/close`,
        accountingActionSchema.omit({ idempotencyKey: true }).parse(input),
        idResult.parse,
      ),
    reverse: (id: string, input: Omit<Reversal, 'idempotencyKey'>) =>
      commands.run(
        `${base}/journals/${encodeURIComponent(id)}/reverse`,
        reversalSchema.omit({ idempotencyKey: true }).parse(input),
        journalSchema.parse,
      ),
  };
}
export function createIntegrationsClient(request: OrganizationTransport, businessId: string) {
  const base = `/${encodeURIComponent(businessId)}/integrations`;
  return {
    load: async () => integrationStatusSchema.parse(await request(base)),
    help: async (question: string) =>
      assistantOutputSchema.parse(
        await request(`${base}/assistant`, 'POST', assistantInputSchema.parse({ question })),
      ),
  };
}
