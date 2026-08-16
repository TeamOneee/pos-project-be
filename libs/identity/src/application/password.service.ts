import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// NFR-SEC-001: password hanya disimpan sebagai hash argon2.
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}

// FR-AUTH-003/012: min 8 karakter dan kombinasi huruf + angka.
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PASSWORD_RULE_MESSAGE =
  'Password minimal 8 karakter dan mengandung huruf serta angka.';
