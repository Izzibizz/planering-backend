import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

export async function uploadImageBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<{
  publicId: string;
  url: string;
  thumbnailUrl: string;
}> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "planering-gallery",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        filename_override: fileName,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          thumbnailUrl: cloudinary.url(result.public_id, {
            secure: true,
            transformation: [
              {
                width: 480,
                height: 360,
                crop: "fill",
                gravity: "auto",
                fetch_format: "auto",
                quality: "auto",
              },
            ],
          }),
        });
      },
    );

    uploadStream.end(buffer);
  });
}

export async function deleteImageFromCloudinary(
  publicId: string,
): Promise<void> {
  if (!isCloudinaryConfigured()) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
