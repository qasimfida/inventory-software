import { timeZoneSchema } from './conventions.js';
import { z } from 'zod';
import {
  accessFields,
  accessRoleSchema,
  assignableRoleSchema,
  validAssignment,
} from './permissions.js';
export const organizationStateSchema = z.enum(['active', 'suspended', 'archived']);
export const memberRoleSchema = assignableRoleSchema;
export const locationKindSchema = z.enum(['stores', 'warehouses', 'terminals']);
const name = z.string().trim().min(1).max(120);
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{1,32}$/);
const version = z.number().int().positive();
export const createBusinessSchema = z
  .object({ name, timeZone: timeZoneSchema.default('UTC') })
  .strict();
export const editBusinessSchema = z
  .object({
    name,
    state: organizationStateSchema,
    version,
    timeZone: timeZoneSchema.default('UTC'),
  })
  .strict();
export const createLocationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stores'), name, code, type: z.enum(['store', 'branch']) }).strict(),
  z.object({ kind: z.literal('warehouses'), name, code, storeId: z.uuid() }).strict(),
  z
    .object({
      kind: z.literal('terminals'),
      name,
      code,
      storeId: z.uuid(),
      warehouseId: z.uuid().nullable(),
      type: z.enum(['pos', 'desktop', 'mobile']),
    })
    .strict(),
]);
export const editLocationSchema = z
  .object({ name, code, state: organizationStateSchema, version })
  .strict();
export const assignMemberSchema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: memberRoleSchema,
    ...accessFields,
  })
  .strict()
  .refine(validAssignment, 'Invalid role permissions or scope');
export const editMemberSchema = z
  .object({ role: memberRoleSchema, state: organizationStateSchema, version, ...accessFields })
  .strict()
  .refine(validAssignment, 'Invalid role permissions or scope');
export const businessSchema = z
  .object({
    id: z.uuid(),
    name,
    state: organizationStateSchema,
    version,
    timeZone: timeZoneSchema.default('UTC'),
    role: accessRoleSchema,
    ...accessFields,
  })
  .strict();
export const locationSchema = z
  .object({
    id: z.uuid(),
    name,
    code,
    state: organizationStateSchema,
    version,
    kind: locationKindSchema,
    type: z.string(),
    storeId: z.uuid().nullable(),
    warehouseId: z.uuid().nullable(),
  })
  .strict();
export const memberSchema = z
  .object({
    accountId: z.uuid(),
    ...accessFields,
    email: z.email(),
    role: memberRoleSchema,
    state: organizationStateSchema,
    version,
  })
  .strict();
export const workspaceSchema = z
  .object({
    business: businessSchema,
    locations: z.array(locationSchema),
    members: z.array(memberSchema),
  })
  .strict();
export const businessListSchema = z.object({ businesses: z.array(businessSchema) }).strict();
export const auditListSchema = z
  .object({
    events: z.array(
      z
        .object({
          id: z.string(),
          actorId: z.uuid(),
          resourceId: z.uuid(),
          action: z.string(),
          storeId: z.uuid().nullable().default(null),
          warehouseId: z.uuid().nullable().default(null),
          requestId: z.uuid(),
          occurredAt: z.iso.datetime(),
          before: z.unknown(),
          after: z.unknown(),
        })
        .strict(),
    ),
    nextCursor: z.string().nullable(),
  })
  .strict();
export type Business = Omit<z.infer<typeof businessSchema>, 'scope' | 'permissions' | 'timeZone'> &
  Partial<Pick<z.infer<typeof businessSchema>, 'scope' | 'permissions' | 'timeZone'>>;
export type Location = z.infer<typeof locationSchema>;
export type Membership = Omit<z.infer<typeof memberSchema>, 'scope' | 'permissions'> &
  Partial<Pick<z.infer<typeof memberSchema>, 'scope' | 'permissions'>>;
export type Workspace = Omit<z.infer<typeof workspaceSchema>, 'business' | 'members'> & {
  business: Business;
  members: Membership[];
};
export type CreateLocation = z.infer<typeof createLocationSchema>;
export type EditLocation = z.infer<typeof editLocationSchema>;
export type EditBusiness = z.infer<typeof editBusinessSchema>;
export type EditMember = z.infer<typeof editMemberSchema>;
export type AssignMember = z.infer<typeof assignMemberSchema>;
export type LocationKind = z.infer<typeof locationKindSchema>;
