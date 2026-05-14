import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly validToken = process.env.ADMIN_TOKEN;

  canActivate(context: ExecutionContext): boolean {
    if (!this.validToken) {
      throw new UnauthorizedException('Admin access not configured');
    }

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid or missing Authorization token');
    }

    const token = authHeader.slice(7);
    if (token !== this.validToken) {
      throw new UnauthorizedException('Invalid or missing Authorization token');
    }

    return true;
  }
}