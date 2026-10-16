import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs';
import { HistoryService } from '../history/history.service';

type AuditedRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: {
    username?: string;
    role?: string;
  };
};

const SKIPPED_PREFIXES = new Set([
  'history',
  'steps',
  'sequences',
  'products',
  'users',
  'roles',
]);

const ENTITY_BY_PREFIX: Record<string, string> = {
  'auth': 'User',
  'execution-mode': 'ModeExecution',
  'step': 'Step',
  'step-param': 'StepParam',
  'step-limit': 'StepLimit',
  'sequence': 'Sequence',
  'sequence-step': 'SequenceStep',
  'product-sequence': 'ProductSequence',
  'product-step-param': 'ProductStepParam',
  'component-instance': 'ComponentInstance',
  'product-step-limit': 'ProductStepLimit',
  'product-execution-config': 'ExecutionConfig',
  'rights': 'Right',
  'uploads': 'Avatar',
  'product-counter': 'ProductCounter',
  'product-status': 'ProductStatus',
  'status': 'Status',
  'step-status': 'StepStatus',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly historyService: HistoryService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const auditEvent = this.buildAuditEvent(request);

    return next.handle().pipe(
      tap(() => {
        if (!auditEvent) {
          return;
        }

        void this.historyService.create(auditEvent).catch((error) => {
          console.error('Error logging audit history:', error);
        });
      }),
    );
  }

  private buildAuditEvent(request: AuditedRequest) {
    const method = (request.method || '').toUpperCase();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return null;
    }

    const url = request.originalUrl || request.url || request.path || '';
    const path = url.replace(/^\/?api\/?/, '').split('?')[0];
    const [prefix, secondSegment] = path.split('/').filter(Boolean);

    if (!prefix || SKIPPED_PREFIXES.has(prefix)) {
      return null;
    }

    if (prefix === 'auth' && secondSegment !== 'login') {
      return null;
    }

    const entity = ENTITY_BY_PREFIX[prefix];

    if (!entity) {
      return null;
    }

    return {
      user_name: this.resolveUserName(request),
      action: this.resolveAction(method, prefix, secondSegment),
      entity,
      entity_id: this.resolveEntityId(request),
      details: this.buildDetails(method, path, request),
    };
  }

  private resolveUserName(request: AuditedRequest): string {
    const username =
      request.user?.username ||
      (typeof request.body?.username === 'string' ? request.body.username : '') ||
      'System';

    return username;
  }

  private resolveAction(method: string, prefix: string, secondSegment?: string) {
    if (prefix === 'auth' && secondSegment === 'login') {
      return 'Connexion';
    }

    switch (method) {
      case 'POST':
        return 'Creation';
      case 'DELETE':
        return 'Suppression';
      default:
        return 'Modification';
    }
  }

  private resolveDetailAction(
    method: string,
    prefix: string,
    secondSegment?: string,
  ) {
    if (prefix === 'auth' && secondSegment === 'login') {
      return 'connecte';
    }

    switch (method) {
      case 'POST':
        return 'cree';
      case 'DELETE':
        return 'supprime';
      default:
        return 'modifie';
    }
  }

  private resolveEntityId(request: AuditedRequest): string | number | null {
    if (request.params?.id) {
      return request.params.id;
    }

    if (request.params?.username) {
      return null;
    }

    const body = request.body || {};
    const candidates = [
      body.id,
      body.product_id,
      body.sequence_id,
      body.step_id,
      body.execution_mode_id,
      body.step_param_id,
      body.status_id,
    ];
    const candidate = candidates.find(
      (value) =>
        typeof value === 'number' ||
        (typeof value === 'string' && value.trim().length > 0),
    );

    return (candidate as string | number | undefined) ?? null;
  }

  private buildDetails(
    method: string,
    path: string,
    request: AuditedRequest,
  ): string {
    const [prefix, secondSegment] = path.split('/').filter(Boolean);
    const safeBody = this.sanitizeBody(request.body || {});
    const action = this.resolveDetailAction(method, prefix, secondSegment);
    const id = request.params?.id;

    switch (prefix) {
      case 'auth':
        return `Connexion utilisateur: ${this.formatValue(safeBody.username)}`;
      case 'execution-mode':
        return this.joinDetails(`Mode d'execution ${action}`, [
          this.detail('id', id),
          this.detail('nom', safeBody.name),
          this.detail('description', safeBody.description),
        ]);
      case 'step':
        return this.joinDetails(`Step normalise ${action}`, [
          this.detail('id', id),
          this.detail('nom', safeBody.name),
          this.detail('description', safeBody.description),
          this.detail('depend de', safeBody.depends_on),
        ]);
      case 'step-param':
        return this.joinDetails(`Parametre de step ${action}`, [
          this.detail('id', id),
          this.detail('step', safeBody.step_id),
          this.detail('nom', safeBody.param_name),
          this.detail('type', safeBody.param_type),
          this.detail('valeur par defaut', safeBody.default_value),
        ]);
      case 'step-limit':
        return this.joinDetails(`Limite de step ${action}`, [
          this.detail('id', id),
          this.detail('step', safeBody.step_id),
          this.detail('nom', safeBody.limit_name),
          this.detail('type', safeBody.limit_type),
          this.detail('comparaison', safeBody.comparison_type),
          this.detail('valeur', safeBody.limit_value),
          this.detail('min', safeBody.limit_min),
          this.detail('max', safeBody.limit_max),
          this.detail('unite', safeBody.unit),
        ]);
      case 'sequence':
        return this.joinDetails(`Sequence normalisee ${action}`, [
          this.detail('id', id),
          this.detail('nom', safeBody.name),
          this.detail('description', safeBody.description),
          this.detail('depend de', safeBody.depends_on),
        ]);
      case 'sequence-step':
        return this.joinDetails(`Association sequence-step ${action}`, [
          this.detail('id', id),
          this.detail('sequence', safeBody.sequence_id),
          this.detail('step', safeBody.step_id),
          this.detail('ordre', safeBody.order_index),
        ]);
      case 'product-sequence':
        return this.joinDetails(`Association produit-sequence ${action}`, [
          this.detail('id', id),
          this.detail('produit', safeBody.product_id),
          this.detail('sequence', safeBody.sequence_id),
          this.detail('ordre', safeBody.order_index),
        ]);
      case 'product-step-param':
        return this.joinDetails(`Valeur parametre produit ${action}`, [
          this.detail('id', id),
          this.detail('produit', safeBody.product_id),
          this.detail('parametre step', safeBody.step_param_id),
          this.detail('valeur', safeBody.value),
        ]);
      case 'component-instance':
        return this.joinDetails(`Instance composant ${action}`, [
          this.detail('id', id),
          this.detail('produit', safeBody.product_id),
          this.detail('step', safeBody.step_id),
          this.detail('index', safeBody.instance_index),
          this.detail('nom', safeBody.instance_name),
          this.detail('reference physique', safeBody.physical_ref),
          this.detail('actif', this.formatBoolean(safeBody.is_active)),
        ]);
      case 'product-step-limit':
        return this.joinDetails(`Limite produit ${action}`, [
          this.detail('id', id),
          this.detail('instance composant', safeBody.component_instance_id),
          this.detail('limite step', safeBody.step_limit_id),
          this.detail('mode', safeBody.execution_mode_id),
          this.detail('valeur', safeBody.limit_value),
          this.detail('min', safeBody.limit_min),
          this.detail('max', safeBody.limit_max),
          this.detail('actif', this.formatBoolean(safeBody.is_active)),
        ]);
      case 'product-execution-config':
        return this.joinDetails(`Configuration execution ${action}`, [
          this.detail('id', id),
          this.detail('produit', safeBody.product_id),
          this.detail('mode', safeBody.execution_mode_id),
          this.detail('sequence', safeBody.sequence_id),
          this.detail('step', safeBody.step_id),
          this.detail('actif', this.formatBoolean(safeBody.is_active)),
          this.detail('ignorer echec', this.formatBoolean(safeBody.ignore_fail)),
          this.detail('retries', safeBody.retry_on_fail),
          this.detail('repetitions', safeBody.repeat_count),
          this.detail('delai', this.formatMilliseconds(safeBody.retry_delay_ms)),
        ]);
      case 'rights':
        return this.joinDetails(`Droit ${action}`, [
          this.detail('id', id || safeBody.id_right),
          this.detail('description', safeBody.description),
          this.detail('module', safeBody.module),
        ]);
      case 'uploads':
        return secondSegment === 'avatar'
          ? this.joinDetails(`Avatar ${action}`, [
              this.detail('fichier', safeBody.avatarUrl),
            ])
          : `Upload ${action}: /api/${path}`;
      case 'product-counter':
        return this.joinDetails(`Compteur produit ${action}`, [
          this.detail('produit', id || safeBody.product_id),
          this.detail('compteur', safeBody.count),
        ]);
      case 'product-status':
        return this.joinDetails(`Statut produit ${action}`, [
          this.detail('id', id || safeBody.status_id),
          this.detail('produit', safeBody.product_id),
          this.detail('mode', safeBody.mode_id),
          this.detail('barcode', safeBody.barcode),
          this.detail('failed', this.formatBoolean(safeBody.failed)),
          this.detail('duree', safeBody.duration),
        ]);
      case 'status':
        return this.joinDetails(`Status ${action}`, [
          this.detail('id', id || safeBody.id),
          this.detail('tester', safeBody.tester_id),
          this.detail('item', safeBody.item_id),
          this.detail('termine', this.formatBoolean(safeBody.terminated)),
        ]);
      case 'step-status':
        return this.joinDetails(`Statut step ${action}`, [
          this.detail('id', id || safeBody.status_id),
          this.detail('produit', safeBody.product_id),
          this.detail('test', safeBody.test_id),
          this.detail('parametre', safeBody.parameter_id),
        ]);
      default:
        break;
    }

    const details = [`${method} /api/${path}`];

    if (Object.keys(safeBody).length > 0) {
      details.push(`payload=${JSON.stringify(safeBody)}`);
    }

    return details.join(' - ');
  }

  private joinDetails(title: string, details: Array<string | null>) {
    const visibleDetails = details.filter(
      (detail): detail is string => detail !== null && detail.trim().length > 0,
    );

    return visibleDetails.length > 0
      ? `${title}: ${visibleDetails.join(', ')}`
      : title;
  }

  private detail(label: string, value: unknown): string | null {
    const formattedValue = this.formatValue(value);

    if (formattedValue === null) {
      return null;
    }

    return `${label} ${formattedValue}`;
  }

  private formatValue(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value === 'boolean') {
      return this.formatBoolean(value);
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : null;
    }

    return String(value);
  }

  private formatBoolean(value: unknown): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return value === true || value === 'true' ? 'oui' : 'non';
  }

  private formatMilliseconds(value: unknown): string | null {
    const formattedValue = this.formatValue(value);

    return formattedValue === null ? null : `${formattedValue} ms`;
  }

  private sanitizeBody(body: Record<string, unknown>) {
    const sensitiveKeys = new Set([
      'password',
      'newPassword',
      'currentPassword',
      'access_token',
      'token',
    ]);

    return Object.fromEntries(
      Object.entries(body)
        .filter(([key]) => !sensitiveKeys.has(key))
        .map(([key, value]) => [
          key,
          typeof value === 'string' && value.length > 120
            ? `${value.slice(0, 117)}...`
            : value,
        ]),
    );
  }
}
