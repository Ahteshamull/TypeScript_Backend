import { Request, Response } from 'express';
import catchAsync from '../../shared/utils/catchAsync';
import sendResponse from '../../shared/utils/sendResponse';
import { UserService } from './user.service';
import ApiError from '../../shared/errors/ApiError';

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const result = await UserService.getUserProfile(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsers();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const result = await UserService.updateUserProfile(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const getUserStatus = catchAsync(async (req: Request, res: Response) => {
  const targetUserId = req.params.userId as string;
  const result = await UserService.getUserStatus(targetUserId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User status retrieved successfully',
    data: result,
  });
});

export const UserController = {
  getProfile,
  getAllUsers,
  updateProfile,
  getUserStatus,
};
