import { Model, Types } from 'mongoose';

export interface FileFields {
  [fieldname: string]: Express.Multer.File[];
}

export interface RequestWithMultipleFiles extends Request {
  files?: FileFields;
}

export interface DriverVerificationResponse {
  status: boolean;
  message: string;
}

export type TDriverVerification = {
  userId: Types.ObjectId;
  driverSelectedTruck:  Types.ObjectId;
  driverLicense: string;
  isVerifyDriverLicense: boolean;
  driverNidCard: string;
  isVerifyDriverNid: boolean;
  isReadyToDrive: boolean;
  driverLocation:string;
  vehicleNumber:string;
  autoDetectLocation:number[];

  fuleType: 'Diesel' | 'Gasoline' | 'Natural Gas' | 'Hydrogen' | 'Electric' | 'Hybrid Fuels' | 'Dimethyl Ether (DME)' | 'Renewable Diesel';
  vehicleAge:number;
  workingPreferredDate:string;
  isDelete?: boolean;
};

export interface DriverOasisModel extends Model<TDriverVerification> {
  // eslint-disable-next-line no-unused-vars
  isDriverVerificationExistByCustomId(id: string): Promise<TDriverVerification>;
}
