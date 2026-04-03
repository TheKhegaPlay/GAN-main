// REQUIREMENT 1.1: Define evidence processing workflow states
// Tracks the progression of digital evidence through restoration pipeline
export type EvidenceStatus = 'uploaded' | 'processing' | 'restored';

// REQUIREMENT 1.2: Structure for individual evidence items
// Stores: unique identifier, filename, current processing status, and selected GAN model
export interface Evidence {
  id: string;                    // REQUIREMENT 2.3: Unique evidence identifier
  filename: string;              // REQUIREMENT 1.3: Store uploaded filename
  status: EvidenceStatus;        // REQUIREMENT 1.1: Current workflow status
  ganModel: string;              // REQUIREMENT 3.1: GAN model selection (ESRGAN, GFPGAN, SRGAN)
}

export interface ForensicCase {
  id: string;
  name: string;
  description: string;
  evidences: Evidence[];
}

export interface ForensicState {
  cases: ForensicCase[];
}
