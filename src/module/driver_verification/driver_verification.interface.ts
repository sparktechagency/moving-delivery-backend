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
  // fuleType:
  //   | 'Diesel'
  //   | 'Gasoline'
  //   | 'Natural Gas'
  //   | 'Hydrogen'
  //   | 'Electric'
  //   | 'Hybrid Fuels'
  //   | 'Dimethyl Ether (DME)'
  //   | 'Renewable Diesel';
  truckSize: string;
  loadCapacity: string;
  picState: string;
  picCities: string;
  vehicleAge: number;
  workingPreferredDate: string;
  isDelete?: boolean;
};

export interface DriverOasisModel extends Model<TDriverVerification> {
  // eslint-disable-next-line no-unused-vars
  isDriverVerificationExistByCustomId(id: string): Promise<TDriverVerification>;
}

// Types for our data
export interface ITruck {
  _id: string;
  truckcategories: string;
  photo: string;
}

export interface IDriver extends Document {
  _id: string;
  driverSelectedTruck: ITruck;
  autoDetectLocation: number[];
  id: string;
}

export interface IUserLocation {
  from: {
    address: string;
    coordinates: number[];
  };
  to: {
    address: string;
    coordinates: number[];
  };
}

export interface Driver {
  userId: any;
  _id: string;
  autoDetectLocation: [number, number];
  truckDetails: {
    _id: string;
    truckcategories: string[];
    photo: string;
  };
}

export interface DriverWithMetrics {
  _id: string;
  driverSelectedTruck: {
    _id: string;
    truckcategories: string[];
    photo: string;
    price: string;
  };
  geoMetrics: {
    distanceKm: number;
    estimatedDurationMin: number;
    bearingDegrees: number;
    routeType: string;
  };
}
