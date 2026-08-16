import { Injectable } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';
import { PrismaWriteService } from '@app/platform';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaWriteService) {}

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findActiveByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
