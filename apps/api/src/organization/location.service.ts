import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { requireLocation } from './access.js';
import { randomUUID } from 'node:crypto';
import type { CreateLocation, EditLocation, LocationKind } from '@inventory/contracts';
import { OrganizationScope, audit, checkVersionAndState } from './organization.scope.js';
import type { Actor } from './organization.scope.js';
import { checkChildren, getLocation, requireActiveParents } from './location.repository.js';
@Injectable()
export class LocationService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  create(actor: Actor, businessId: string, input: CreateLocation) {
    return this.scope.run(actor, businessId, 'locations.write', async (context) => {
      const scope = context.business.scope;
      if (
        scope?.storeId &&
        (input.kind === 'stores' ||
          input.storeId !== scope.storeId ||
          (scope.warehouseId &&
            (input.kind === 'warehouses' || input.warehouseId !== scope.warehouseId)))
      )
        throw new ForbiddenException();
      const id = randomUUID();
      if (input.kind !== 'stores')
        await requireActiveParents(
          context,
          input.storeId,
          input.kind === 'terminals' ? input.warehouseId : null,
        );
      if (input.kind === 'stores')
        await context.tx.query(
          'INSERT INTO stores(id,business_id,name,code,type) VALUES($1,$2,$3,$4,$5)',
          [id, businessId, input.name, input.code, input.type],
        );
      if (input.kind === 'warehouses')
        await context.tx.query(
          'INSERT INTO warehouses(id,business_id,name,code,store_id) VALUES($1,$2,$3,$4,$5)',
          [id, businessId, input.name, input.code, input.storeId],
        );
      if (input.kind === 'terminals')
        await context.tx.query(
          'INSERT INTO terminals(id,business_id,name,code,store_id,warehouse_id,type) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [id, businessId, input.name, input.code, input.storeId, input.warehouseId, input.type],
        );
      const created = await getLocation(context, input.kind, id);
      await audit(context, id, `${input.kind}.created`, null, created);
      return created;
    });
  }
  edit(actor: Actor, businessId: string, kind: LocationKind, id: string, input: EditLocation) {
    return this.scope.run(actor, businessId, 'locations.write', async (context) => {
      const current = await getLocation(context, kind, id);
      requireLocation(context.business, current, true);
      checkVersionAndState(current, input.version);
      if (input.state === 'active' && current.storeId)
        await requireActiveParents(context, current.storeId, current.warehouseId);
      await checkChildren(context, kind, id, input.state);
      // kind is a validated enum, never an arbitrary SQL identifier.
      await context.tx.query(
        `UPDATE ${kind} SET name=$1,code=$2,state=$3,version=version+1 WHERE business_id=$4 AND id=$5`,
        [input.name, input.code, input.state, businessId, id],
      );
      const updated = await getLocation(context, kind, id);
      await audit(context, id, `${kind}.updated`, current, updated);
      return updated;
    });
  }
}
