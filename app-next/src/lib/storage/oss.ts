// Reserved for future OSS integration.
// Implement providers here (S3, OSS, COS, etc.) and export a minimal interface:

export interface UploadResult {
  url: string; // public or signed URL to the asset
  key?: string;
}

export async function uploadImage(_: File | Buffer | ArrayBuffer, __?: { mime?: string; filename?: string }): Promise<UploadResult> {
  throw new Error("OSS upload not implemented");
}

