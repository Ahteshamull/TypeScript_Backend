export type IUser = {
  name: string;
  email: string;
  password?: string;
  profileImage?: string;
  role: 'admin' | 'user';
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
