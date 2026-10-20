import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { SchemaPipe } from '../http/schema.pipe.js';
import { z } from 'zod';
import {
  assignMemberSchema,
  createBusinessSchema,
  createLocationSchema,
  editBusinessSchema,
  editLocationSchema,
  editMemberSchema,
  locationKindSchema,
} from '@inventory/contracts';
import type {
  AssignMember,
  CreateLocation,
  EditBusiness,
  EditLocation,
  EditMember,
  LocationKind,
} from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { BusinessService } from './business.service.js';
import { LocationService } from './location.service.js';
import { MembershipService } from './membership.service.js';
function actor(request: AuthRequest) {
  return {
    accountId: request.identity.account_id,
    requestId: String(request.res?.getHeader('x-request-id')),
  };
}
@Controller('businesses')
export class OrganizationController {
  constructor(
    @Inject(BusinessService) private readonly businesses: BusinessService,
    @Inject(LocationService) private readonly locations: LocationService,
    @Inject(MembershipService) private readonly memberships: MembershipService,
  ) {}
  @Get()
  list(@Req() request: AuthRequest) {
    return this.businesses.list(actor(request));
  }
  @Post()
  create(
    @Req() request: AuthRequest,
    @Body(new SchemaPipe(createBusinessSchema)) input: { name: string; timeZone: string },
  ) {
    return this.businesses.create(actor(request), input.name, input.timeZone);
  }
  @Get(':businessId')
  workspace(@Req() request: AuthRequest, @Param('businessId', new ParseUUIDPipe()) id: string) {
    return this.businesses.workspace(actor(request), id);
  }
  @Patch(':businessId')
  edit(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(editBusinessSchema)) input: EditBusiness,
  ) {
    return this.businesses.edit(actor(request), id, input);
  }
  @Post(':businessId/locations')
  createLocation(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(createLocationSchema)) input: CreateLocation,
  ) {
    return this.locations.create(actor(request), id, input);
  }
  @Patch(':businessId/locations/:kind/:id')
  editLocation(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @Param('kind', new SchemaPipe(locationKindSchema)) kind: LocationKind,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(editLocationSchema)) input: EditLocation,
  ) {
    return this.locations.edit(actor(request), businessId, kind, id, input);
  }
  @Post(':businessId/members')
  assign(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(assignMemberSchema)) input: AssignMember,
  ) {
    return this.memberships.assign(actor(request), id, input);
  }
  @Patch(':businessId/members/:accountId')
  editMember(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Param('accountId', new ParseUUIDPipe()) accountId: string,
    @Body(new SchemaPipe(editMemberSchema)) input: EditMember,
  ) {
    return this.memberships.edit(actor(request), id, accountId, input);
  }
  @Get(':businessId/audit')
  audit(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) id: string,
    @Query(
      'cursor',
      new SchemaPipe(
        z
          .string()
          .regex(/^[1-9][0-9]{0,17}$/)
          .optional(),
      ),
    )
    cursor?: string,
  ) {
    return this.businesses.events(actor(request), id, cursor);
  }
}
