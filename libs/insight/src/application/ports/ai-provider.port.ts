import {
  AiGenerationRequest,
  GeneratedInsightNarrative,
} from '../insight.models';

export abstract class AiProviderPort {
  /**
   * menghasilkan narasi untuk evidence yang sudah dihitung dan divalidasi backend.
   * implementasi provider tidak boleh menentukan angka, tipe, scope merchant, periode, atau persistence.
   */
  abstract generate(
    request: AiGenerationRequest,
  ): Promise<GeneratedInsightNarrative[]>;
}
