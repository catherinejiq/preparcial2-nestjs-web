import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    const VALID_TOKEN = 'web123';

    if (!authHeader || authHeader !== VALID_TOKEN) {
      throw new UnauthorizedException('Invalid or missing Authorization token');
    }

    return true;
  }
}