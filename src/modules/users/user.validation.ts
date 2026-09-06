import { z } from 'zod';

const updateProfileZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    profileImage: z.string().url('Profile image must be a valid URL').optional(),
  }),
});

export const UserValidation = {
  updateProfileZodSchema,
};
