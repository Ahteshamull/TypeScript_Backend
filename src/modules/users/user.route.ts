import { Router } from 'express';
import { UserController } from './user.controller';
import auth from '../../shared/middlewares/auth';

import validateRequest from '../../shared/middlewares/validateRequest';
import { UserValidation } from './user.validation';

const router = Router();

// Profile retrieval (descriptive + backward-compatible fallback)
router.get('/get-profile', auth(), UserController.getProfile);
router.get('/profile', auth(), UserController.getProfile);

// Get all users (descriptive + backward-compatible fallback)
router.get('/get-all-users', auth(), UserController.getAllUsers);
router.get('/', auth(), UserController.getAllUsers);

// Get user presence & status
router.get(
  '/get-user-status/:userId',
  auth(),
  UserController.getUserStatus
);

// Update user profile
router.patch(
  '/update-profile',
  auth(),
  validateRequest(UserValidation.updateProfileZodSchema),
  UserController.updateProfile
);

export const UserRoutes = router;
