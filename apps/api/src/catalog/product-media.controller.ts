import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Response } from 'express';
import { productImageUploadSchema, PRODUCT_IMAGE_MAX_BYTES } from '@inventory/contracts';
import type { ProductImageUpload } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import { requireBusinessScope } from './catalog.repository.js';
import { ENVIRONMENT } from '../config/environment.js';
import type { Environment } from '../config/environment.js';
import { PublicRoute } from '../auth/auth.http.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { SchemaPipe } from '../http/schema.pipe.js';
import { rasterMime } from '../http/raster-mime.js';
@Controller()
export class ProductMediaController {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  @Post('businesses/:businessId/product-images')
  async upload(
    @Req() request: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @Body(new SchemaPipe(productImageUploadSchema)) input: ProductImageUpload,
  ) {
    let created: string | undefined;
    try {
      return await this.scope.run(
        requestActor(request),
        businessId,
        'products.write',
        async (ctx) => {
          requireBusinessScope(ctx);
          if (!this.env.PRODUCT_MEDIA_DIRECTORY)
            throw new ServiceUnavailableException('Product image storage is not configured.');
          const bytes = Buffer.from(input.base64, 'base64');
          if (
            !bytes.length ||
            bytes.length > PRODUCT_IMAGE_MAX_BYTES ||
            bytes.toString('base64') !== input.base64 ||
            rasterMime(bytes) !== input.mime
          )
            throw new BadRequestException('Choose a valid PNG, JPEG or WebP image up to 512 KB.');
          const directory = join(this.env.PRODUCT_MEDIA_DIRECTORY, businessId);
          await mkdir(directory, { recursive: true, mode: 0o700 });
          // The business lock serializes quota checks and uploads across API instances sharing storage.
          if ((await readdir(directory)).length >= 1000)
            throw new HttpException(
              'Image storage quota reached. Contact your administrator.',
              409,
            );
          const name = randomBytes(24).toString('hex');
          const file = join(directory, name);
          await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
          created = file;
          await audit(ctx, businessId, 'product.image_uploaded', null, {
            mime: input.mime,
            bytes: bytes.length,
          });
          return { url: `${this.env.PRODUCT_MEDIA_PUBLIC_BASE_URL}/${businessId}/${name}` };
        },
      );
    } catch (error) {
      if (created) await unlink(created).catch(() => {});
      throw error;
    }
  }
  /** Public raster asset only: opaque URLs expose no account, inventory or pricing metadata. */
  @PublicRoute('storefront')
  @Get('product-media/:businessId/:name')
  async read(
    @Param('businessId', new ParseUUIDPipe()) businessId: string,
    @Param('name') name: string,
    @Res() response: Response,
  ) {
    if (!this.env.PRODUCT_MEDIA_DIRECTORY || !/^[a-f0-9]{48}$/.test(name))
      throw new NotFoundException();
    const bytes = await readFile(join(this.env.PRODUCT_MEDIA_DIRECTORY, businessId, name)).catch(
      () => {
        throw new NotFoundException();
      },
    );
    const mime = rasterMime(bytes);
    if (!mime || !['image/png', 'image/jpeg', 'image/webp'].includes(mime))
      throw new NotFoundException();
    response.setHeader('Content-Type', mime);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    response.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    response.send(bytes);
  }
}
