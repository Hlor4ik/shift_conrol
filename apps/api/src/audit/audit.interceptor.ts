import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditAction } from '@shiftcontrol/database';
import { PrismaService } from '../prisma/prisma.service';
import { SKIP_AUDIT_KEY } from '../common/decorators';
import { AuthenticatedRequest } from '../common/current-user.decorator';

const METHOD_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PATCH: AuditAction.UPDATE,
  PUT: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

function parseEntityFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  let i = 0;
  if (segments[i] === 'api') i++;
  if (segments[i] === 'v1') i++;
  return segments[i] ?? 'unknown';
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method;
    const action = METHOD_ACTION[method];
    if (!action || !request.user) return next.handle();

    const adminRoles = ['SUPERADMIN', 'MANAGER'];
    if (!adminRoles.includes(request.user.role)) return next.handle();

    const entity = parseEntityFromPath(request.path);
    const entityId = typeof request.params?.id === 'string' ? request.params.id : undefined;

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              userId: request.user.sub,
              action,
              entity,
              entityId,
              newValue: method !== 'DELETE' ? (responseBody as object) : undefined,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            },
          });
        } catch {
          // audit failure should not break request
        }
      }),
    );
  }
}
