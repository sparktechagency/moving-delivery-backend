import { Model, Types } from 'mongoose';

export type TSelectTruck = {
  userId: Types.ObjectId;
  truckcategories: string;
  photo: string;
  price:number;
  isDelete?: boolean;
};

export interface SelectTruckModel extends Model<TSelectTruck> {
  // eslint-disable-next-line no-unused-vars
  isSelectTruckExistByCustomId(id: string): Promise<TSelectTruck>;
}
