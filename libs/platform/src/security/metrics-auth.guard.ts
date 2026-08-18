import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const METRICS_PATH = '/api/v1/metrics';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const req = context.switchToHttp().getRequest();
    if (req.path !== METRICS_PATH) {
      return true;
    }

    const expectedUser = process.env.METRICS_AUTH_USER;
    const expectedPass = process.env.METRICS_AUTH_PASSWORD;
    if (!expectedUser || !expectedPass) {
      return true;
    }

    const authHeader: string | undefined = req.headers?.authorization;
    if (!authHeader?.startsWith('Basic ')) {
      throw new UnauthorizedException('Invalid metrics credentials');
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const colonIdx = decoded.indexOf(':');
    const user = decoded.slice(0, colonIdx);
    const pass = decoded.slice(colonIdx + 1);

    if (user !== expectedUser || pass !== expectedPass) {
      throw new UnauthorizedException('Invalid credentials');
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    return true;
  }
}
