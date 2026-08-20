import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// NFR-SEC-001: password hanya disimpan sebagai hash bcrypt.
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

// FR-AUTH-003/012: min 8 karakter dan kombinasi huruf + angka.
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_RULE_MESSAGE =
  'Password minimal 8 karakter dan mengandung huruf serta angka.';
