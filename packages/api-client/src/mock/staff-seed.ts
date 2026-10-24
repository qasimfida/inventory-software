import { costDetailSchema, staffSchema } from '@inventory/contracts';
import { demoDate } from './identity.js';

export function staffSeed(id: (n: number) => string, currency: string) {
  const staff = [...Array.from({ length: 26 }).keys()].map((i) =>
    staffSchema.parse({
      id: id(7000 + i),
      code: `STAFF-${i + 1}`,
      name: `Demo colleague ${i + 1}`,
      title: i % 2 ? 'Sales associate' : 'Stock assistant',
      storeId: id(2),
      salaryMinor: '250000',
      currency,
      state: i === 25 ? 'inactive' : 'active',
      version: 1,
    }),
  );
  const costs = [...Array.from({ length: 26 }).keys()].map((i) =>
    costDetailSchema.parse({
      cost: {
        id: id(7100 + i),
        kind: i % 2 ? 'salary' : 'expense',
        staffId: i % 2 ? staff[i]!.id : null,
        storeId: id(2),
        description: i % 2 ? `Pay period · ${staff[i]!.name}` : `Store supplies ${i + 1}`,
        reference: `DEMO-COST-${i + 1}`,
        periodStart: demoDate(30).slice(0, 10),
        periodEnd: demoDate(1).slice(0, 10),
        amountMinor: '250000',
        currency,
        paidMinor: i % 3 === 0 ? '100000' : '0',
      },
      payments:
        i % 3 === 0
          ? [
              {
                id: id(7200 + i),
                amountMinor: '100000',
                reference: `DEMO-PAY-${i + 1}`,
                paidOn: demoDate(1).slice(0, 10),
              },
            ]
          : [],
      hasMore: false,
    }),
  );
  return { staff, costs };
}
