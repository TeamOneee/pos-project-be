import { SetMetadata } from '@nestjs/common';

export const SUCCESS_MESSAGE_KEY = 'success_message';

// menetapkan pesan yang tampil pada response envelope endpoint.
export const SuccessMessage = (
  message: string,
): ((target: object, key?: unknown) => void) =>
  SetMetadata(SUCCESS_MESSAGE_KEY, message);
