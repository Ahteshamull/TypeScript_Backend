import streamifier from 'streamifier';
import cloudinary from '../../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder = 'chat_app_uploads'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const cldUploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary upload returned undefined'));
        }

        // Auto-optimize images (f_auto, q_auto)
        if (result.secure_url && result.resource_type === 'image') {
          const urlParts = result.secure_url.split('/upload/');
          if (urlParts.length === 2) {
            result.secure_url = `${urlParts[0]}/upload/f_auto,q_auto/${urlParts[1]}`;
          }
        }

        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(cldUploadStream);
  });
};
