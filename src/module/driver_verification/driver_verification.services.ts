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
import User from '../user/user.model';

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
    // also added  deriver location Into User Collection Database sect55ion using transaction  rollback section 

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
  userId: string
): Promise<DriverWithMetrics[]> => {
  try {
    // Step 1: Update user’s geolocation
    const result = await User.updateOne(
      { _id: userId, isDelete: false },
      { $set: userLocation },
      { new: true, upsert: true }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Issue updating user geolocation.',
        ''
      );
    }

    // ✅ Step 2: Extract user destination coordinates
    const [destLong, destLat] = userLocation.to.coordinates;

    // ✅ Step 3: Find verified, available drivers with truck info
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
          isVerifyDriverNid: true,
          isReadyToDrive: true,
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          autoDetectLocation: 1,
          truckDetails: { $arrayElemAt: ['$truckDetails', 0] },
          isVerifyDriverNid: 1,
          isReadyToDrive: 1,
        },
      },
    ]);

    //  Step 4: No available drivers
    if (!drivers.length) return [];

    // --- Per km rates for France by truck category ---
    const truckRatesPerKm: Record<string, number> = {
      small: 1.5,
      medium: 2,
      large: 2.5,
    };

    //  Step 5: Enrich drivers with geo metrics & per km pricing
    const enrichedDrivers = drivers.map((driver:any) => {
      const [lng, lat] = driver.autoDetectLocation;
      const driverCoords = {
        longitude: parseFloat(lng?.toString()),
        latitude: parseFloat(lat?.toString()),
      };
      const destinationCoords = { longitude: destLong, latitude: destLat };

      // --- Distance & time calculation ---
      const distanceInMeters = geolib.getDistance(driverCoords, destinationCoords);
      const distanceKm = Number((distanceInMeters / 1000).toFixed(2));
      const bearingDegrees = Number(
        geolib.getRhumbLineBearing(driverCoords, destinationCoords).toFixed(1)
      );
      const estimatedDurationMin = Number((distanceKm * 1.2).toFixed(1));
      const routeType = classifyRouteType(distanceKm);

      // ---  Price per km based on truck category ---
      const ratePerKm = truckRatesPerKm[driver.truckDetails.truckcategories] || 2;
      const totalPrice = distanceKm * ratePerKm;
      const price = totalPrice.toFixed(2);

      return {
        _id: driver._id.toString(),
        driverId: driver.userId,
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

    //  Step 6: Sort by nearest driver and limit results
    return enrichedDrivers
      .sort((a, b) => a.geoMetrics.distanceKm - b.geoMetrics.distanceKm)
      .slice(0, 5);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Error finding nearest available trip truck drivers',
      error
    );
  }
};




const verify_driver_admin_IntoDb = async (
  payload: {
    isVerifyDriverLicense: boolean;
    isVerifyDriverNid: boolean;
    isReadyToDrive: boolean;
    driverId: string;
  },
  id: string,
): Promise<DriverVerificationResponse> => {
  try {
    const isExistDriverVerificationRequest = await driververifications.exists({
      _id: id,
      userId: payload.driverId,
    });
    if (!isExistDriverVerificationRequest) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'this driver verification  request not founded',
        '',
      );
    }

    const result = await driververifications.findByIdAndUpdate(
      id,
      {
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
      },
      { new: true, upsert: true },
    );
    if (!result) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'issues by the  driver verification section ',
        '',
      );
    }

    return {
      status: true,
      message: 'Successfylly Verified',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Error finding nearest available trip truck drivers',
      error,
    );
  }
};

const delete_driver_verification_request_IntoDb = async (id: string) => {
  try {
    const result = await driververifications.deleteOne({
      $and: [
        {
          _id: id,
          isVerifyDriverLicense: false,
          isVerifyDriverNid: false,
          isReadyToDrive: false,
        },
      ],
    });

    return result.deletedCount === 1
      ? { status: true, message: 'successfully delete driver verified requst' }
      : {
        status: false,
        message: 'already verified user can not be delete',
      };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Error finding delete_driver_verification_request_IntoDb',
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
  verify_driver_admin_IntoDb,
  delete_driver_verification_request_IntoDb,
};

export default DriverVerificationServices;
