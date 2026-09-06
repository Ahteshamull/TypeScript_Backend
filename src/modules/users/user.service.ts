import { User } from './user.model';
import ApiError from '../../shared/errors/ApiError';
import { IUser } from './user.interface';

const getUserProfile = async (id: string) => {
  const user = await User.findById(id).select('-password').lean();
  return user;
};

const getAllUsers = async () => {
  const users = await User.find().select('-password').lean();
  return users;
};

const updateUserProfile = async (id: string, payload: Partial<IUser>) => {
  const isExist = await User.findById(id);
  if (!isExist) {
    throw new ApiError(404, 'User does not exist');
  }

  // Disallow modifying sensitive fields via profile update
  delete payload.password;
  delete payload.email;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: 'after' }
  ).select('-password');

  return updatedUser;
};

const getUserStatus = async (id: string) => {
  const user = await User.findById(id)
    .select('name email profileImage isOnline lastSeen')
    .lean();
  if (!user) {
    throw new ApiError(404, 'User does not exist');
  }
  return user;
};

export const UserService = {
  getUserProfile,
  getAllUsers,
  updateUserProfile,
  getUserStatus,
};

