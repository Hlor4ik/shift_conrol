import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@shiftcontrol/database';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators';
import { AuthenticatedRequest } from '../common/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) return false;
    if (user.role === UserRole.SUPERADMIN) return true;
    return requiredRoles.includes(user.role as UserRole);
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return false;

    if (user.role === UserRole.SUPERADMIN) {
      const headerCompany = request.headers['x-company-id'] as string | undefined;
      request.companyId = headerCompany ?? null;
      return true;
    }

    if (user.role === UserRole.WORKER) {
      request.companyId = null;
      return true;
    }

    if (!user.companyId) {
      throw new ForbiddenException('No company assigned');
    }
    request.companyId = user.companyId;
    return true;
  }
}
