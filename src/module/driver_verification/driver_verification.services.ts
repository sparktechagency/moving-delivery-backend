import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import driververifications from './driver_verification.model';
import fs from 'fs/promises';
import {
  Driver,
  DriverVerificationResponse,
  DriverWithMetrics,
  IUserLocation,
  RequestWithMultipleFiles,
} from './driver_verification.interface';
import QueryBuilder from '../../app/builder/QueryBuilder';
import * as geolib from 'geolib'; // Important!
import config from '../../app/config';
import { classifyRouteType } from '../../utility/math/calculateDistance';

/**
 * @param req
 * @param userId
 * @returns
 */
const recordDriverVerificationIntoDb = async (
  req: RequestWithMultipleFiles,
  userId: string,
): Promise<DriverVerificationResponse> => {
  try {
    const data = req.body;

    if (!data) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Driver verification data is required',
        '',
      );
    }

    const isDriverVerificationExist = await driververifications.findOne(
      {
        $and: [
          { userId },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1, driverLicense: 1, driverNidCard: 1 },
    );

    if (isDriverVerificationExist) {
      try {
        if (isDriverVerificationExist?.driverLicense) {
          const licenseExists = await fileExists(
            isDriverVerificationExist.driverLicense,
          );
          if (licenseExists) {
            await fs.unlink(isDriverVerificationExist.driverLicense);
          }
        }

        if (isDriverVerificationExist?.driverNidCard) {
          const nidExists = await fileExists(
            isDriverVerificationExist.driverNidCard,
          );
          if (nidExists) {
            await fs.unlink(isDriverVerificationExist.driverNidCard);
          }
        }
      } catch (fileError: any) {
        throw new ApiError(
          httpStatus.NOT_EXTENDED,
          'Error while deleting files',
          fileError,
        );
      }

      throw new ApiError(
        httpStatus.CONFLICT,
        'Driver verification already exists for this user',
        '',
      );
    }

    const driverVerificationDoc = new driververifications({
      ...data,
      userId,
    });

    await driverVerificationDoc.save();

    return {
      status: true,
      message: 'Driver verification data successfully recorded',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Driver verification service unavailable',
      error,
    );
  }
};

/**

 * @param filePath 
 * @returns 
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const findByDriverVerifictionAdminIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const allDriverVerificationQuery = new QueryBuilder(
      driververifications
        .find()
        .populate('userId', {
          name: 1,
          email: 1,
          phoneNumber: 1,
        })
        .populate('driverSelectedTruck', {
          truckcategories: 1,
          photo: 1,
        }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_driver_verification = await allDriverVerificationQuery.modelQuery;
    const meta = await allDriverVerificationQuery.countTotal();

    return { meta, all_driver_verification };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findByDriverVerifictionAdminIntoDb server unavailable',
      error?.message || error,
    );
  }
};

const findBySpecificDriverVerificationIntoDb = async (id: string) => {
  try {
    return await driververifications.isDriverVerificationExistByCustomId(id);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'find By Specific Drive rVerification IntoDb verification service unavailable',
      error,
    );
  }
};

const updateDriverVerificationIntoDb = async (
  req: Request,
  id: string,
): Promise<DriverVerificationResponse> => {
  try {
    const data = req.body;
    if (!data) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Driver verification data is required',
        '',
      );
    }

    const isDriverVerificationExist = await driververifications.findOne(
      {
        $and: [
          { _id: id },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1 },
    );

    if (!isDriverVerificationExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'driver is not verified ', '');
    }

    const result = await driververifications.findByIdAndUpdate(id, data, {
      new: true,
      upsert: true,
    });

    return (
      result && {
        status: true,
        message: 'successfully updated driver verification profile',
      }
    );
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'update driver verificationIntoDb service unavailable',
      error,
    );
  }
};

/**
 * @param payload
 * @param userId
 * @returns
 */
const detected_Driver_Auto_Live_Location_IntoDb = async (
  payload: any,
  userId: string,
): Promise<DriverVerificationResponse> => {
  try {
    const coordinates = payload.autoDetectLocation;

    if (!coordinates) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates parameter is missing',
        '',
      );
    }
    if (!Array.isArray(coordinates)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates must be an array',
        '',
      );
    }

    if (coordinates.length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates array cannot be empty',
        '',
      );
    }

    if (!userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required', '');
    }

    const query = {
      userId,
      isDelete: false,
      isReadyToDrive: true,
      isVerifyDriverLicense: true,
      isVerifyDriverNid: true,
    };

    const result = await driververifications.findOneAndUpdate(
      query,
      { $set: { autoDetectLocation: coordinates } },
      { new: true },
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification record not found or not eligible',
        '',
      );
    }

    return {
      status: true,
      message: 'Successfully recorded live location',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Location update service is temporarily unavailable',
      error,
    );
  }
};

const deleteDriverVerificationIntoDb = async (
  id: string,
): Promise<DriverVerificationResponse> => {
  try {
    const isDriverVerificationExist = await driververifications.findOne(
      {
        $and: [
          { _id: id },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1 },
    );

    if (!isDriverVerificationExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'driver is not verified ', '');
    }

    //  started delete  code in this section

    return {
      status: true,
      message: 'successfully updated driver verification profile',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'delete driver verificationI ntoDb service unavailable',
      error,
    );
  }
};

const searching_for_available_trip_truck_listsWithMongo = async (
  userLocation: IUserLocation,
): Promise<DriverWithMetrics[]> => {
  try {
    const [destLng, destLat] = userLocation.to.coordinates;
    const drivers: Driver[] = await driververifications.aggregate([
      {
        $lookup: {
          from: 'selecttrucks',
          localField: 'driverSelectedTruck',
          foreignField: '_id',
          as: 'truckDetails',
        },
      },
      {
        $match: {
          'truckDetails.0': { $exists: true },
          'autoDetectLocation.0': { $exists: true },
          'autoDetectLocation.1': { $exists: true },
        },
      },
      {
        $project: {
          _id: 1,
          autoDetectLocation: 1,
          truckDetails: { $arrayElemAt: ['$truckDetails', 0] },
        },
      },
    ]);

    if (!drivers.length) {
      return [];
    };

    const enrichedDrivers =  drivers && drivers?.map((driver) => {
      const [lng, lat] = driver?.autoDetectLocation;
      const driverCoords = {
        longitude: parseFloat(lng?.toString()),
        latitude: parseFloat(lat?.toString()),
      };
      const destinationCoords = { longitude: destLng, latitude: destLat };

      const distanceInMeters = geolib?.getDistance(
        driverCoords,
        destinationCoords,
      );
      const distanceKm = Number((distanceInMeters / 1000).toFixed(2));
      const bearingDegrees = Number(
        geolib.getRhumbLineBearing(driverCoords, destinationCoords).toFixed(1),
      );
      const estimatedDurationMin = Number((distanceKm * 1.2).toFixed(1));
      const routeType = classifyRouteType(distanceKm);
      const price = (distanceKm * Number(config?.per_kilometer_price))?.toFixed(
        2,
      );

      return {
        _id: driver._id.toString(),
        
        driverSelectedTruck: {
          _id: driver.truckDetails._id.toString(),
          truckcategories: driver.truckDetails.truckcategories,
          photo: driver.truckDetails.photo,
          price,
        },
        geoMetrics: {
          distanceKm,
          estimatedDurationMin,
          bearingDegrees,
          routeType,
        },
      };
    });
    return enrichedDrivers
      .sort((a, b) => a?.geoMetrics?.distanceKm - b?.geoMetrics?.distanceKm)?.slice(0, 5);
  } catch (error: any) {
  
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Error finding nearest available trip truck drivers',
      error,
    );
  }
};

const DriverVerificationServices = {
  recordDriverVerificationIntoDb,
  findByDriverVerifictionAdminIntoDb,
  findBySpecificDriverVerificationIntoDb,
  updateDriverVerificationIntoDb,
  detected_Driver_Auto_Live_Location_IntoDb,
  deleteDriverVerificationIntoDb,
  searching_for_available_trip_truck_listsWithMongo,
};

export default DriverVerificationServices;
