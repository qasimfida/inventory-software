import { Injectable } from '@nestjs/common';
import type { OrganizationContext } from './organization.scope.js';
import { getLocation } from './location.repository.js';
@Injectable()
export class LocationAccess {
  store(context: OrganizationContext, id: string) {
    return getLocation(context, 'stores', id);
  }
  warehouse(context: OrganizationContext, id: string) {
    return getLocation(context, 'warehouses', id);
  }
}
