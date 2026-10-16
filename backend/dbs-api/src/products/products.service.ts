import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import {
  describeFieldChange,
  describeParamChanges,
} from '../common/history-details.util';
import { PG_POOL } from '../database/database.module';
import { HistoryService } from '../history/history.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductParam } from './product.interface';

type ProductRow = {
  id: number;
  name: string | null;
  description: string | null;
  createdAt: string | null;
  createdBy: string | null;
  params: ProductParam[] | null;
  preuutStepIds: number[] | null;
  sequenceIds: number[] | null;
  postuutStepIds: number[] | null;
};

type ProductIdentityRow = {
  id: number;
  name: string | null;
  description: string | null;
};

type ProductSchemaMetadata = {
  productParamUserColumn: 'created_by' | 'user_id';
  productParamUserDataType: string;
};

@Injectable()
export class ProductsService {
  private productSchemaMetadataPromise?: Promise<ProductSchemaMetadata>;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly historyService: HistoryService,
  ) {}

  private async getProductSchemaMetadata(): Promise<ProductSchemaMetadata> {
    if (!this.productSchemaMetadataPromise) {
      this.productSchemaMetadataPromise = this.loadProductSchemaMetadata();
    }

    return this.productSchemaMetadataPromise;
  }

  private async loadProductSchemaMetadata(): Promise<ProductSchemaMetadata> {
    const result = await this.pool.query<{
      column_name: string;
      data_type: string;
    }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'product_parameters'
         AND column_name = ANY($1::text[])`,
      [['created_by', 'user_id']],
    );

    const productParameterColumns = new Map(
      result.rows.map((row) => [row.column_name, row.data_type]),
    );

    return {
      productParamUserColumn: productParameterColumns.has('created_by')
        ? 'created_by'
        : 'user_id',
      productParamUserDataType:
        productParameterColumns.get('created_by') ||
        productParameterColumns.get('user_id') ||
        'integer',
    };
  }

  private buildBaseDetailsQuery(): string {
    return `
    SELECT
      p.product_id as id,
      COALESCE(NULLIF(p.name, ''), CONCAT('Produit ', p.product_id::text)) as name,
      COALESCE(p.description, '') as description,
      COALESCE(TO_CHAR(p.created_at, 'YYYY-MM-DD'), '') as "createdAt",
      COALESCE(NULLIF(p.created_by, ''), 'System') as "createdBy",
      COALESCE(product_params.params, '[]'::json) as params,
      COALESCE(preuut_steps.step_ids, ARRAY[]::integer[]) as "preuutStepIds",
      COALESCE(sequence_refs.sequence_ids, ARRAY[]::integer[]) as "sequenceIds",
      COALESCE(postuut_steps.step_ids, ARRAY[]::integer[]) as "postuutStepIds"
    FROM product p
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object(
                 'id', pp.parameter_id,
                 'name', pp.name,
                 'type', CASE pp.vtype
                   WHEN 1 THEN 'String'
                   WHEN 2 THEN 'Integer'
                   WHEN 3 THEN 'Float'
                   WHEN 4 THEN 'Boolean'
                   ELSE 'String'
                 END,
                 'value', COALESCE(pp.value, '')
               )
               ORDER BY pp.parameter_id
             ) as params
      FROM product_parameters pp
      WHERE pp.product_id = p.product_id
    ) product_params ON TRUE
    LEFT JOIN LATERAL (
      SELECT array_agg(pipeline.step_id ORDER BY pipeline.position) as step_ids
      FROM product_pipeline pipeline
      WHERE pipeline.product_id = p.product_id
        AND pipeline.zone = 'PREUUT'
    ) preuut_steps ON TRUE
    LEFT JOIN LATERAL (
      SELECT array_agg(pipeline.sequence_id ORDER BY pipeline.position) as sequence_ids
      FROM product_pipeline pipeline
      WHERE pipeline.product_id = p.product_id
        AND pipeline.zone = 'SEQUENCE'
    ) sequence_refs ON TRUE
    LEFT JOIN LATERAL (
      SELECT array_agg(pipeline.step_id ORDER BY pipeline.position) as step_ids
      FROM product_pipeline pipeline
      WHERE pipeline.product_id = p.product_id
        AND pipeline.zone = 'POSTUUT'
    ) postuut_steps ON TRUE
  `;
  }

  private async resolveActorReference(
    client: PoolClient,
    actorUsername: string | undefined,
    dataType: string,
  ): Promise<string | number | null> {
    if (!actorUsername) {
      return null;
    }

    if (
      dataType !== 'integer' &&
      dataType !== 'bigint' &&
      dataType !== 'smallint'
    ) {
      return actorUsername;
    }

    const result = await client.query<{ user_id: number }>(
      `SELECT user_id
       FROM "user"
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [actorUsername],
    );

    return result.rows[0]?.user_id ?? null;
  }

  private resolveProductActor(
    actorUsername?: string,
    actorName?: string,
  ): string {
    return actorUsername || actorName || 'System';
  }

  private mapProduct(row: ProductRow): Product {
    return {
      id: row.id,
      name: row.name || `Produit ${row.id}`,
      description: row.description || '',
      params: (row.params || []).map((param) => ({
        id: Number(param.id),
        name: param.name,
        type: param.type,
        value: param.value,
      })),
      preuutStepIds: (row.preuutStepIds || []).map(String),
      sequenceIds: (row.sequenceIds || []).map(String),
      postuutStepIds: (row.postuutStepIds || []).map(String),
      createdAt: row.createdAt || '',
      createdBy: row.createdBy || 'System',
    };
  }

  private convertToNumber(id: string | number): number {
    if (typeof id === 'number') {
      return id;
    }

    const match = String(id).match(/\d+/);
    return match ? Number.parseInt(match[0], 10) : Number.NaN;
  }

  private parseIds(
    ids: Array<string | number> | undefined,
    fieldName: string,
  ): number[] {
    if (!ids || ids.length === 0) {
      return [];
    }

    return ids.map((rawId, index) => {
      const numericId = this.convertToNumber(rawId);

      if (Number.isNaN(numericId)) {
        throw new BadRequestException(
          `${fieldName}[${index}] doit contenir un identifiant numerique valide`,
        );
      }

      return numericId;
    });
  }

  private validateParamType(type: string | undefined, value: string): boolean {
    if (!type || type === '') {
      return true;
    }

    switch (type.toLowerCase()) {
      case 'string':
      case 'array':
        return true;
      case 'integer':
        return /^-?\d+$/.test(value);
      case 'float':
        return /^-?\d+(\.\d+)?$/.test(value);
      case 'boolean':
        return ['true', 'false', '0', '1'].includes(value.toLowerCase());
      default:
        return true;
    }
  }

  private getVtype(type?: string): number {
    switch (type?.toLowerCase()) {
      case 'integer':
        return 2;
      case 'float':
        return 3;
      case 'boolean':
        return 4;
      default:
        return 1;
    }
  }

  private async validateReferenceIds(
    client: PoolClient,
    tableName: 'step' | 'sequence',
    ids: number[],
    label: string,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const uniqueIds = [...new Set(ids)];
    const qualifiedTableName =
      tableName === 'sequence' ? 'public."sequence"' : 'public.step';
    const result = await client.query<{ id: number }>(
      `SELECT id
       FROM ${qualifiedTableName}
       WHERE id = ANY($1::int[])`,
      [uniqueIds],
    );

    const existingIds = new Set(result.rows.map((row) => row.id));
    const missingIds = uniqueIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new BadRequestException(
        `${label} inexistants: ${missingIds.join(', ')}`,
      );
    }
  }

  private async upsertParams(
    client: PoolClient,
    productId: number,
    params: CreateProductDto['params'] | undefined,
    userColumn: 'created_by' | 'user_id',
    actorReference: string | number | null,
  ): Promise<void> {
    await client.query(`DELETE FROM product_parameters WHERE product_id = $1`, [
      productId,
    ]);

    for (const param of params || []) {
      const normalizedValue = param.value || '';

      if (!this.validateParamType(param.type, normalizedValue)) {
        throw new BadRequestException(
          `Le parametre "${param.name}" ne correspond pas au type "${param.type}"`,
        );
      }

      await client.query(
        `INSERT INTO product_parameters (product_id, name, value, vtype, ${userColumn})
         VALUES ($1, $2, $3, $4, $5)`,
        [
          productId,
          param.name,
          normalizedValue,
          this.getVtype(param.type),
          actorReference,
        ],
      );
    }
  }

  private async replacePipeline(
    client: PoolClient,
    productId: number,
    preuutStepIds: number[],
    sequenceIds: number[],
    postuutStepIds: number[],
  ): Promise<void> {
    await client.query(`DELETE FROM product_pipeline WHERE product_id = $1`, [
      productId,
    ]);

    let position = 1;

    for (const stepId of preuutStepIds) {
      await client.query(
        `INSERT INTO product_pipeline (product_id, zone, step_id, position)
         VALUES ($1, 'PREUUT', $2, $3)`,
        [productId, stepId, position++],
      );
    }

    for (const sequenceId of sequenceIds) {
      await client.query(
        `INSERT INTO product_pipeline (product_id, zone, sequence_id, position)
         VALUES ($1, 'SEQUENCE', $2, $3)`,
        [productId, sequenceId, position++],
      );
    }

    for (const stepId of postuutStepIds) {
      await client.query(
        `INSERT INTO product_pipeline (product_id, zone, step_id, position)
         VALUES ($1, 'POSTUUT', $2, $3)`,
        [productId, stepId, position++],
      );
    }
  }

  private async ensureNormalizedSteps(
    client: PoolClient,
    stepIds: number[],
  ): Promise<void> {
    const uniqueStepIds = [...new Set(stepIds)].filter(Number.isFinite);

    if (uniqueStepIds.length === 0) {
      return;
    }

    await this.validateReferenceIds(client, 'step', uniqueStepIds, 'Steps');
  }

  private async ensureNormalizedSequences(
    client: PoolClient,
    sequenceIds: number[],
  ): Promise<void> {
    const uniqueSequenceIds = [...new Set(sequenceIds)].filter(Number.isFinite);

    if (uniqueSequenceIds.length === 0) {
      return;
    }

    await this.validateReferenceIds(
      client,
      'sequence',
      uniqueSequenceIds,
      'Sequences',
    );
  }

  private async syncExecutionConfigsForProduct(
    client: PoolClient,
    productId: number,
    preuutStepIds: number[],
    sequenceIds: number[],
    postuutStepIds: number[],
  ): Promise<void> {
    const sequenceStepResult = await client.query<{ step_id: number }>(
      `SELECT DISTINCT step_id
       FROM public.sequence_step
       WHERE sequence_id = ANY($1::int[])`,
      [sequenceIds],
    );

    const stepIds = [
      ...preuutStepIds,
      ...postuutStepIds,
      ...sequenceStepResult.rows.map((row) => row.step_id),
    ];
    const uniqueStepIds = [...new Set(stepIds)].filter(Number.isFinite);
    const uniqueSequenceIds = [...new Set(sequenceIds)].filter(Number.isFinite);

    await this.ensureNormalizedSequences(client, uniqueSequenceIds);
    await this.ensureNormalizedSteps(client, uniqueStepIds);

    await client.query(
      `DELETE FROM public.product_execution_config
       WHERE product_id = $1
         AND (
           (sequence_id IS NOT NULL AND NOT (sequence_id = ANY($2::int[])))
           OR
           (step_id IS NOT NULL AND NOT (step_id = ANY($3::int[])))
         )`,
      [productId, uniqueSequenceIds, uniqueStepIds],
    );

    if (uniqueSequenceIds.length > 0) {
      await client.query(
        `INSERT INTO public.product_execution_config (
           product_id,
           execution_mode_id,
           sequence_id,
           step_id,
           is_active,
           ignore_fail,
           retry_on_fail,
           repeat_count,
           retry_delay_ms,
           created_at
         )
         SELECT
           $1,
           em.id,
           target.sequence_id,
           NULL,
           TRUE,
           FALSE,
           0,
           1,
           0,
           NOW()
         FROM public.execution_mode em
         CROSS JOIN unnest($2::int[]) AS target(sequence_id)
         WHERE EXISTS (
           SELECT 1
           FROM public."sequence" seq
           WHERE seq.id = target.sequence_id
         )
         ON CONFLICT DO NOTHING`,
        [productId, uniqueSequenceIds],
      );
    }

    if (uniqueStepIds.length > 0) {
      await client.query(
        `INSERT INTO public.product_execution_config (
           product_id,
           execution_mode_id,
           sequence_id,
           step_id,
           is_active,
           ignore_fail,
           retry_on_fail,
           repeat_count,
           retry_delay_ms,
           created_at
         )
         SELECT
           $1,
           em.id,
           NULL,
           target.step_id,
           TRUE,
           FALSE,
           0,
           1,
           0,
           NOW()
         FROM public.execution_mode em
         CROSS JOIN unnest($2::int[]) AS target(step_id)
         WHERE EXISTS (
           SELECT 1
           FROM public.step st
           WHERE st.id = target.step_id
         )
         ON CONFLICT DO NOTHING`,
        [productId, uniqueStepIds],
      );
    }
  }

  private async getProductIdentity(
    client: PoolClient,
    productId: number,
  ): Promise<ProductIdentityRow> {
    const result = await client.query<ProductIdentityRow>(
      `SELECT
         product_id as id,
         name,
         description
       FROM product
       WHERE product_id = $1
       FOR UPDATE`,
      [productId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Produit ${productId} non trouve`);
    }

    return result.rows[0];
  }

  private async getProductSnapshot(
    client: PoolClient,
    productId: number,
  ): Promise<Product> {
    const result = await client.query<ProductRow>(
      `
        ${this.buildBaseDetailsQuery()}
        WHERE p.product_id = $1
      `,
      [productId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Produit ${productId} non trouve`);
    }

    return this.mapProduct(result.rows[0]);
  }

  private buildUpdateHistoryDetails(
    previousProduct: Product,
    dto: UpdateProductDto,
  ): string {
    const productName = previousProduct.name || `Produit ${previousProduct.id}`;
    const changes: string[] = [];

    if (dto.name !== undefined) {
      const change = describeFieldChange('nom', previousProduct.name, dto.name);
      if (change) changes.push(change);
    }

    if (dto.description !== undefined) {
      const change = describeFieldChange(
        'description',
        previousProduct.description,
        dto.description ?? '',
      );
      if (change) changes.push(change);
    }

    if (dto.params !== undefined) {
      changes.push(...describeParamChanges(previousProduct.params, dto.params));
    }

    if (changes.length === 1 && changes[0].startsWith('parametre ')) {
      return `Modification du ${changes[0]} sur produit ${productName}`;
    }

    return changes.length > 0
      ? `Modification du produit ${productName}: ${changes.join(', ')}`
      : `Modification du produit: ${productName}`;
  }

  private async createHistoryEntry(entry: {
    userName?: string;
    action: string;
    entityId: number;
    details: string;
  }): Promise<void> {
    try {
      await this.historyService.create({
        user_name: entry.userName || 'System',
        action: entry.action,
        entity: 'Produit',
        entity_id: entry.entityId,
        details: entry.details,
      });
    } catch (historyError) {
      console.error('Error logging product history:', historyError);
    }
  }

  async findAll(): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(`
      ${this.buildBaseDetailsQuery()}
      ORDER BY p.product_id
    `);

    return result.rows.map((row) => this.mapProduct(row));
  }

  async findOne(id: number): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `
        ${this.buildBaseDetailsQuery()}
        WHERE p.product_id = $1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Produit ${id} non trouve`);
    }

    return this.mapProduct(result.rows[0]);
  }

  async create(
    dto: CreateProductDto,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Product> {
    const client = await this.pool.connect();
    const schemaMetadata = await this.getProductSchemaMetadata();

    try {
      await client.query('BEGIN');

      const preuutStepIds = this.parseIds(dto.preuutStepIds, 'preuutStepIds');
      const sequenceIds = this.parseIds(dto.sequenceIds, 'sequenceIds');
      const postuutStepIds = this.parseIds(
        dto.postuutStepIds,
        'postuutStepIds',
      );

      await this.validateReferenceIds(
        client,
        'step',
        [...preuutStepIds, ...postuutStepIds],
        'Steps',
      );
      await this.validateReferenceIds(
        client,
        'sequence',
        sequenceIds,
        'Sequences',
      );

      const productResult = await client.query<{ id: number }>(
        `INSERT INTO product (name, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING product_id as id`,
        [
          dto.name,
          dto.description || '',
          this.resolveProductActor(actorUsername, actorName),
        ],
      );
      const productId = productResult.rows[0].id;
      const productParamActorReference = await this.resolveActorReference(
        client,
        actorUsername,
        schemaMetadata.productParamUserDataType,
      );

      await this.upsertParams(
        client,
        productId,
        dto.params,
        schemaMetadata.productParamUserColumn,
        productParamActorReference,
      );
      await this.replacePipeline(
        client,
        productId,
        preuutStepIds,
        sequenceIds,
        postuutStepIds,
      );
      await this.syncExecutionConfigsForProduct(
        client,
        productId,
        preuutStepIds,
        sequenceIds,
        postuutStepIds,
      );

      await client.query('COMMIT');

      const createdProduct = await this.findOne(productId);
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Creation',
        entityId: productId,
        details: `Creation du produit: ${createdProduct.name}`,
      });

      return createdProduct;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Product> {
    const client = await this.pool.connect();
    const schemaMetadata = await this.getProductSchemaMetadata();

    try {
      await client.query('BEGIN');

      const existingProduct = await this.getProductIdentity(client, id);
      const previousProduct = await this.getProductSnapshot(client, id);
      const currentProductName = previousProduct.name || `Produit ${id}`;
      const currentProductDescription = existingProduct.description || '';

      if (dto.name !== undefined || dto.description !== undefined) {
        const nextName = dto.name ?? currentProductName;
        const nextDescription = dto.description ?? currentProductDescription;

        await client.query(
          `UPDATE product
           SET name = $1,
               description = $2,
               updated_at = NOW()
           WHERE product_id = $3`,
          [nextName, nextDescription, id],
        );
      }

      if (dto.params !== undefined) {
        const productParamActorReference = await this.resolveActorReference(
          client,
          actorUsername,
          schemaMetadata.productParamUserDataType,
        );
        await this.upsertParams(
          client,
          id,
          dto.params,
          schemaMetadata.productParamUserColumn,
          productParamActorReference,
        );
      }

      if (
        dto.preuutStepIds !== undefined ||
        dto.sequenceIds !== undefined ||
        dto.postuutStepIds !== undefined
      ) {
        const preuutStepIds = this.parseIds(
          dto.preuutStepIds || [],
          'preuutStepIds',
        );
        const sequenceIds = this.parseIds(dto.sequenceIds || [], 'sequenceIds');
        const postuutStepIds = this.parseIds(
          dto.postuutStepIds || [],
          'postuutStepIds',
        );

        await this.validateReferenceIds(
          client,
          'step',
          [...preuutStepIds, ...postuutStepIds],
          'Steps',
        );
        await this.validateReferenceIds(
          client,
          'sequence',
          sequenceIds,
          'Sequences',
        );

        await this.replacePipeline(
          client,
          id,
          preuutStepIds,
          sequenceIds,
          postuutStepIds,
        );
        await this.syncExecutionConfigsForProduct(
          client,
          id,
          preuutStepIds,
          sequenceIds,
          postuutStepIds,
        );
      }

      await client.query('COMMIT');

      const updatedProduct = await this.findOne(id);
      const historyDetails = this.buildUpdateHistoryDetails(
        previousProduct,
        dto,
      );
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Modification',
        entityId: id,
        details: historyDetails,
      });

      return updatedProduct;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(
    id: number,
    actorUsername?: string,
    actorName?: string,
  ): Promise<{ message: string }> {
    const client = await this.pool.connect();
    void actorUsername;

    try {
      await client.query('BEGIN');

      const existingProduct = await this.getProductIdentity(client, id);
      const productName = existingProduct.name || `Produit ${id}`;

      await client.query(`DELETE FROM product_pipeline WHERE product_id = $1`, [
        id,
      ]);
      await client.query(
        `DELETE FROM product_parameters WHERE product_id = $1`,
        [id],
      );

      const deleteResult = await client.query(
        `DELETE FROM product WHERE product_id = $1 RETURNING product_id`,
        [id],
      );

      if (deleteResult.rowCount === 0) {
        throw new NotFoundException(`Produit ${id} non trouve`);
      }

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorName,
        action: 'Suppression',
        entityId: id,
        details: `Suppression du produit: ${productName}`,
      });

      return { message: 'Produit supprime' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
