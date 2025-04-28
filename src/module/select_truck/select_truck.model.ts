import { Schema, model } from 'mongoose';
import { SelectTruckModel, TSelectTruck } from './select_truck.interface';

const TselectTruckSchema = new Schema<TSelectTruck, SelectTruckModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
    },
    truckcategories: {
      type: String,
      required: [true, 'truckcategories is required'],
      unique: true,
    },
    photo: {
      type: String,
      required: [true, 'photo is require'],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

TselectTruckSchema.pre('find', function (next) {
  this.find({ isDelete: { $ne: true } });
  next();
});

TselectTruckSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDelete: { $ne: true } } });
  next();
});

TselectTruckSchema.pre('findOne', function (next) {
  this.findOne({ isDelete: { $ne: true } });
  next();
});

TselectTruckSchema.statics.isSelectTruckExistByCustomId = async function (
  id: string,
): Promise<TSelectTruck | null> {
  return await this.findOne({ _id: id, isDelete: false });
};

const SelectTruck = model<TSelectTruck, SelectTruckModel>(
  'SelectTruck',
  TselectTruckSchema,
);
export default SelectTruck;
