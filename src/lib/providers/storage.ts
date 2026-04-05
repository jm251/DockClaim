import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env, featureFlags } from "@/lib/env";

export interface UploadedAsset {
  storagePath: string;
  storageUrl: string;
}

export interface StorageProvider {
  isConfigured: boolean;
  uploadFile(input: {
    file: File;
    folder: string;
    fileNameBase: string;
  }): Promise<UploadedAsset>;
}

function sanitizeName(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
}

class CloudinaryStorageProvider implements StorageProvider {
  isConfigured = featureFlags.isStorageConfigured;

  constructor() {
    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  async uploadFile(input: {
    file: File;
    folder: string;
    fileNameBase: string;
  }): Promise<UploadedAsset> {
    if (!this.isConfigured) {
      throw new Error("Cloudinary is not configured.");
    }

    const arrayBuffer = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: sanitizeName(input.folder),
          public_id: sanitizeName(input.fileNameBase),
          resource_type: "auto",
          use_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Upload failed."));
            return;
          }

          resolve({
            storagePath: result.public_id,
            storageUrl: result.secure_url,
          });
        },
      );

      stream.end(buffer);
    });
  }
}

export const storageProvider = new CloudinaryStorageProvider();
