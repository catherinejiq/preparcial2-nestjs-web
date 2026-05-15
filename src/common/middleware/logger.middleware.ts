import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('Audit');

  use(req: Request, _res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const userId = (req.headers['x-user-id'] as string) ?? 'ANONYMOUS';

    this.logger.log(`[User: ${userId}] accedió a ${originalUrl} - ${method}`);

    next();
  }
}