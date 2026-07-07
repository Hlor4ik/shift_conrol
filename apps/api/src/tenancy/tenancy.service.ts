import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@shiftcontrol/database';
import { JwtPayload } from '../common/current-user.decorator';

@Injectable()
export class TenancyService {
  resolveCompanyId(user: JwtPayload, headerCompanyId?: string | null): string | null {
    if (user.role === UserRole.SUPERADMIN) {
      return headerCompanyId ?? null;
    }
    if (user.role === UserRole.WORKER) {
      return null;
    }
    if (!user.companyId) {
      throw new ForbiddenException('No company assigned');
    }
    return user.companyId;
  }

  requireCompanyId(user: JwtPayload, headerCompanyId?: string | null): string {
    const companyId = this.resolveCompanyId(user, headerCompanyId);
    if (!companyId) {
      throw new ForbiddenException('Company context required');
    }
    return companyId;
  }
}
