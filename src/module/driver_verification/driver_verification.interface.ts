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
  driverSelectedTruck: string[];
  selectedDriverOasis: string[];
  driverLicense: string;
  isVerifyDriverLicense: boolean;
  driverNidCard: string;
  isVerifyDriverNid: boolean;
  isReadyToDrive: boolean;
  isDelete?: boolean;
};

export interface DriverOasisModel extends Model<TDriverVerification> {
  // eslint-disable-next-line no-unused-vars
  isDriverVerificationExistByCustomId(id: string): Promise<TDriverVerification>;
}
