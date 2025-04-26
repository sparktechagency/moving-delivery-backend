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
  driverSelectedTruck: Types.ObjectId;
  driverLicense: string;
  isVerifyDriverLicense: boolean;
  driverNidCard: string;
  isVerifyDriverNid: boolean;
  isReadyToDrive: boolean;
  driverLocation: string;
  vehicleNumber: string;
  autoDetectLocation: number[];

  fuleType:
    | 'Diesel'
    | 'Gasoline'
    | 'Natural Gas'
    | 'Hydrogen'
    | 'Electric'
    | 'Hybrid Fuels'
    | 'Dimethyl Ether (DME)'
    | 'Renewable Diesel';
  vehicleAge: number;
  workingPreferredDate: string;
  isDelete?: boolean;
};

export interface DriverOasisModel extends Model<TDriverVerification> {
  // eslint-disable-next-line no-unused-vars
  isDriverVerificationExistByCustomId(id: string): Promise<TDriverVerification>;
}


// Interface definitions
export interface Location {
  address: string;
  coordinates: [number, number];
}

export interface UserLocation {
  from: Location;
  to: Location;
}

export interface TruckInfo {
  _id: string;
  truckcategories: string;
  photo: string;
}

export interface Driver {
  _id: string;
  driverSelectedTruck: TruckInfo;
  autoDetectLocation: [string, string];
  id: string;
}

export interface DriverData {
  success: boolean;
  message: string;
  data: Driver[];
}

export interface GeoMetrics {
  distanceKm: string;
  estimatedDurationMin: string;
  bearingDegrees: string;
  routeType: string;
}

export interface DriverWithMetrics {
  driverId: string;
  truckType: string;
  distanceKm: string;
  estimatedDurationMin: string;
  bearingDegrees: string;
  routeType: string;
  driverLocation: [string, string];
  truckPhoto: string;
}
