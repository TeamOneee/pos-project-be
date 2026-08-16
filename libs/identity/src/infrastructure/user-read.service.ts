import { Injectable } from '@nestjs/common';
import { UserReadPort } from '../application/ports/user-read.port';
import { UserRepository } from './user.repository';

// Implementasi UserReadPort di identity; pemanggil lintas modul hanya
// boleh mengimpor port (06 §1.2, §3.2).
@Injectable()
export class UserReadService extends UserReadPort {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async userBelongsToMerchant(
    userId: string,
    merchantId: string,
  ): Promise<boolean> {
    return (
      (await this.userRepository.findByIdInMerchant(userId, merchantId)) !==
      null
    );
  }
}
