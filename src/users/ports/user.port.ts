import { Prisma, User } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';

/**
 * Token DI untuk UserPort. Dipakai oleh module lain (contoh: Auth) agar
 * bergantung pada kontrak, bukan pada implementasi konkret UsersService.
 */
export const USER_PORT = 'USER_PORT';

/**
 * Public contract yang disediakan User Module untuk module lain.
 *
 * Module lain (contoh: Auth) tidak boleh mengakses repository / tabel user
 * secara langsung. Mereka cukup bergantung pada kontrak ini.
 */
export interface UserPort {
  findByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null>;

  findById(userId: string, tx?: Prisma.TransactionClient): Promise<User | null>;

  createUser(dto: CreateUserDto, tx?: Prisma.TransactionClient): Promise<User>;

  ensureEmailAvailable(email: string): Promise<void>;
}
