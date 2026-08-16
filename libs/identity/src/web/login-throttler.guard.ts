import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// FR-AUTH-010: rate-limit login per email + IP (5 percobaan/menit).
// Dipasang hanya pada route login; global throttler tetap berlaku untuk seluruh API.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req['body'] as { email?: unknown } | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const ip = typeof req['ip'] === 'string' ? req['ip'] : 'unknown';
    return Promise.resolve(`login:${email}:${ip}`);
  }
}
