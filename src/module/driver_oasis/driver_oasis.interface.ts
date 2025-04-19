import { Model, Types } from 'mongoose';

export type TDriverOasis = {
  userId: Types.ObjectId;
  driverOasis: string;
  isDelete?: boolean;
};

export interface DriverOasisModel extends Model< TDriverOasis> {
  // eslint-disable-next-line no-unused-vars
  isTDriverOasisExistByCustomId(id: string): Promise< TDriverOasis>;
}