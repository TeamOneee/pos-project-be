// membedakan kegagalan provider agar state job dapat menentukan retry yang aman.
export class AiProviderError extends Error {
  constructor(
    readonly category:
      | 'PROVIDER_CONFIGURATION'
      | 'PROVIDER_NETWORK'
      | 'PROVIDER_TIMEOUT'
      | 'PROVIDER_OUTPUT'
      | 'PROVIDER_REJECTED',
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
