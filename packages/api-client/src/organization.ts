import type { CancellationSignal } from './cancellation.js';
import {
  auditListSchema,
  businessListSchema,
  businessSchema,
  locationSchema,
  memberSchema,
  workspaceSchema,
} from '@inventory/contracts';
import type {
  AssignMember,
  CreateLocation,
  EditBusiness,
  EditLocation,
  EditMember,
  LocationKind,
} from '@inventory/contracts';
export type OrganizationTransport = (
  path: string,
  method?: string,
  body?: unknown,
  signal?: CancellationSignal,
) => Promise<unknown>;
export function createOrganizationClient(request: OrganizationTransport) {
  const segment = (id: string) => encodeURIComponent(id);
  return {
    list: async () => businessListSchema.parse(await request('')).businesses,
    create: async (name: string) => businessSchema.parse(await request('', 'POST', { name })),
    workspace: async (id: string) => workspaceSchema.parse(await request(`/${segment(id)}`)),
    editBusiness: async (id: string, input: EditBusiness) =>
      businessSchema.parse(await request(`/${segment(id)}`, 'PATCH', input)),
    createLocation: async (id: string, input: CreateLocation) =>
      locationSchema.parse(await request(`/${segment(id)}/locations`, 'POST', input)),
    editLocation: async (businessId: string, kind: LocationKind, id: string, input: EditLocation) =>
      locationSchema.parse(
        await request(`/${segment(businessId)}/locations/${kind}/${segment(id)}`, 'PATCH', input),
      ),
    assign: async (id: string, input: AssignMember) =>
      memberSchema.parse(await request(`/${segment(id)}/members`, 'POST', input)),
    editMember: async (id: string, accountId: string, input: EditMember) => {
      await request(`/${segment(id)}/members/${segment(accountId)}`, 'PATCH', input);
    },
    audit: async (id: string, cursor?: string) =>
      auditListSchema.parse(
        await request(
          `/${segment(id)}/audit${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        ),
      ),
  };
}
