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
import Conversation from '../conversation/conversation.model';
import Message from '../message/message.model';
import notifications from '../notification/notification.modal';
import { request } from 'http';
import requests from '../requests/requests.model';
import stripepaymentgateways from '../payment_gateway/payment gateway.model';
import drivertransactionInfos from '../drivers_transaction_info/drivers_transaction_info.model';
import ratingreview from '../rating_review/rating.review.model';
import sendEmail from '../../utility/sendEmail';
import emailcontext from '../../utility/emailcontex/sendvarificationData';

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
    const data = req.body as any;

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
        ],
      },
      { _id: 1, driverLicense: 1, driverNidCard: 1 },
    );

    if (isDriverVerificationExist) {
      // try {
      //   if (isDriverVerificationExist?.driverLicense) {
      //     const licenseExists = await fileExists(
      //       isDriverVerificationExist.driverLicense,
      //     );
      //     if (licenseExists) {
      //       await fs.unlink(isDriverVerificationExist.driverLicense);
      //     }
      //   }

      //   if (isDriverVerificationExist?.driverNidCard) {
      //     const nidExists = await fileExists(
      //       isDriverVerificationExist.driverNidCard,
      //     );
      //     if (nidExists) {
      //       await fs.unlink(isDriverVerificationExist.driverNidCard);
      //     }
      //   }
      // } catch (fileError: any) {
      //   throw new ApiError(
      //     httpStatus.NOT_EXTENDED,
      //     'Error while deleting files',
      //     fileError,
      //   );
      // }
      if (isDriverVerificationExist.request_status === 'pending') {
        throw new ApiError(
          httpStatus.CONFLICT,
          'Driver verification request is already pending approval',
          '',
        );
      }
      if (isDriverVerificationExist.request_status === 'approved') {
        throw new ApiError(
          httpStatus.CONFLICT,
          'Driver is already verified',
          '',
        );
      }

      if (isDriverVerificationExist.request_status === 'rejected') {
        throw new ApiError(
          httpStatus.CONFLICT,
          'Previous driver verification request was rejected. Please contact support for further assistance.',
          '',
        );
      }

      // throw new ApiError(
      //   httpStatus.CONFLICT,
      //   'Driver verification already exists for this user',
      //   '',
      // );
    }
    console.log("data", data)
    const driverVerificationDoc = new driververifications({
      ...data,
      autoDetectLocation: {
        type: 'Point',
        coordinates: [data.autoDetectLocation[1], data.autoDetectLocation[0]],
      },
      userId,
    });

    await driverVerificationDoc.save();

    const driver = await User.findById(userId);

    if (driver) {
      sendEmail(
        driver.email,
        emailcontext.sendDriverPendingVerification(
          driver.name,
          0,
          'Driver Verification Request Received',
        ),
        'Driver Verification Received',
      );
    }

    const admins = await User.find({ role: { $in: ['admin', 'superAdmin'] } });

    console.log("admins", admins)

    for (const admin of admins) {
      sendEmail(
        admin.email,
        emailcontext.sendDriverVerificationNotification(
          admin.name,
          0,
          'New Driver Verification Request',
        ),
        'New Driver Verification Request',
      );
    }

    return {
      status: true,
      message: 'Driver verification data successfully recorded. Now waiting for admin approval.',
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
      .search(["userId.name", "userId.email", "userId.phoneNumber"])
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
    const verification = await driververifications.isDriverVerificationExistByCustomId(id);

    return {

      ...verification,
      driverVerificationStatus: verification?.request_status || 'not_applied',

    }

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

    console.log(data)
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
      {
        $set: {
          autoDetectLocation: {
            type: 'Point',
            coordinates: coordinates
          }
        }
      },
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


// ==================== Helper Functions ====================

/**
 * Calculate location-based suggestion priority
 * @param driverCity - Driver's preferred city
 * @param driverState - Driver's preferred state
 * @param userAddress - User's pickup address
 * @returns Priority level (1 = high priority/location match, 2 = nearby)
 */
const calculateLocationPriority = (
  driverCity: string | undefined,
  driverState: string | undefined,
  userAddress: string
): number => {
  const normalizedAddress = userAddress.toLowerCase();
  const normalizedCity = driverCity?.toLowerCase();
  const normalizedState = driverState?.toLowerCase();

  // Priority 1: Driver operates in the same city or state as pickup location
  if (normalizedCity && normalizedAddress.includes(normalizedCity)) {
    return 1;
  }

  if (normalizedState && normalizedAddress.includes(normalizedState)) {
    return 1;
  }

  // Priority 2: Driver is nearby but not in preferred operating area
  return 2;
};

/**
 * Calculate dynamic pricing based on distance
 * @param basePrice - Base price from truck details
 * @param estimatedRoadKm - Estimated road distance in kilometers
 * @returns Calculated final price
 */
const calculateDynamicPrice = (
  basePrice: number,
  estimatedRoadKm: number
): string => {
  const EXTRA_KM_THRESHOLD = 20;
  const EXTRA_RATE_PER_KM = 2.5;

  let finalPrice = basePrice;

  if (estimatedRoadKm > EXTRA_KM_THRESHOLD) {
    const extraKm = estimatedRoadKm - EXTRA_KM_THRESHOLD;
    const extraCharge = extraKm * EXTRA_RATE_PER_KM;
    finalPrice += extraCharge;
  }

  return finalPrice.toFixed(2);
};

/**
 * Calculate geo metrics for driver
 * @param distanceInMeters - Distance in meters from $geoNear
 * @param driverCoords - Driver's coordinates
 * @param userCoords - User's pickup coordinates
 * @returns Geo metrics object with distance, duration, bearing, and route type
 */
const calculateGeoMetrics = (
  distanceInMeters: number,
  driverCoords: { longitude: number; latitude: number },
  userCoords: { longitude: number; latitude: number }
) => {
  const ROAD_DISTANCE_FACTOR = 1.4; // Realistic road distance multiplier
  const CITY_TRAFFIC_FACTOR = 1.5; // Minutes per km in city traffic

  const distanceKm = Number((distanceInMeters / 1000).toFixed(2));
  const estimatedRoadKm = Number((distanceKm * ROAD_DISTANCE_FACTOR).toFixed(2));

  const bearingDegrees = Number(
    geolib.getRhumbLineBearing(driverCoords, userCoords).toFixed(1)
  );

  const estimatedDurationMin = Number((distanceKm * CITY_TRAFFIC_FACTOR).toFixed(1));
  const routeType = classifyRouteType(distanceKm);

  return {
    distanceKm,
    estimatedRoadKm,
    bearingDegrees,
    estimatedDurationMin,
    routeType,
  };
};

/**
 * Enrich driver data with calculated metrics
 * @param driver - Raw driver data from aggregation
 * @param userOriginCoords - User's pickup coordinates
 * @param userAddress - User's pickup address
 * @returns Enriched driver object with all metrics
 */
const enrichDriverWithMetrics = (
  driver: any,
  userOriginCoords: { longitude: number; latitude: number },
  userAddress: string
): DriverWithMetrics => {
  const driverCoords = {
    longitude: driver.autoDetectLocation.coordinates[0],
    latitude: driver.autoDetectLocation.coordinates[1],
  };

  const geoMetrics = calculateGeoMetrics(
    driver.geoMetrics.distanceInMeters,
    driverCoords,
    userOriginCoords
  );

  const suggestionPriority = calculateLocationPriority(
    driver.picCities,
    driver.picState,
    userAddress
  );

  const basePrice = Number(driver?.truckDetails?.price || 0);
  const price = calculateDynamicPrice(basePrice, geoMetrics.estimatedRoadKm);

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
      distanceKm: geoMetrics.distanceKm,
      estimatedDurationMin: geoMetrics.estimatedDurationMin,
      bearingDegrees: geoMetrics.bearingDegrees,
      routeType: geoMetrics.routeType,
    },
    suggestionPriority,
    userTripDistanceKm: geoMetrics.estimatedRoadKm,
  };
};

/**
 * Sort drivers by priority and distance
 * @param drivers - Array of enriched drivers
 * @returns Sorted array of drivers
 */
const sortDriversByPriorityAndDistance = (
  drivers: DriverWithMetrics[]
): DriverWithMetrics[] => {
  return drivers.sort((a, b) => {
    // First sort by priority (1 is higher than 2)
    if (a.suggestionPriority !== b.suggestionPriority) {
      return a.suggestionPriority - b.suggestionPriority;
    }
    // Then sort by distance (closer is better)
    return a.geoMetrics.distanceKm - b.geoMetrics.distanceKm;
  });
};

// ==================== Main Function ====================

/**
 * Search for available drivers within 30 km radius
 * @param userLocation - User's pickup and destination location
 * @param userId - User's ID
 * @returns Array of available drivers with calculated metrics, sorted by priority and distance
 */
const searching_for_available_trip_truck_listsWithMongo = async (
  userLocation: IUserLocation,
  userId: string
): Promise<DriverWithMetrics[]> => {
  try {
    // Update user location in database
    const updateResult = await User.updateOne(
      { _id: userId, isDelete: false },
      { $set: userLocation },
      { new: true, upsert: true }
    );

    if (!updateResult) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Issue updating user geolocation.',
        ''
      );
    }

    // Extract coordinates
    const [fromLong, fromLat] = userLocation.from.coordinates;
    const userAddress = userLocation.from.address.toLowerCase();
    const userOriginCoords = { longitude: fromLong, latitude: fromLat };

    // Search radius: 30 kilometers
    const SEARCH_RADIUS_KM = 20;
    const SEARCH_RADIUS_METERS = SEARCH_RADIUS_KM * 1000;

    // Find verified drivers within radius using geospatial query
    // Note: Using collection.aggregate() instead of model.aggregate() to bypass
    // the pre-aggregate middleware that adds $match before $geoNear
    const drivers = await driververifications.collection.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [fromLong, fromLat] },
          distanceField: 'geoMetrics.distanceInMeters',
          maxDistance: SEARCH_RADIUS_METERS,

          query: {
            isVerifyDriverNid: true,
            isVerifyDriverLicense: true,
            isReadyToDrive: true,
            isDelete: false,
          },
          spherical: true,
        },
      },
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
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          autoDetectLocation: 1,
          picCities: 1,
          picState: 1,
          truckDetails: { $arrayElemAt: ['$truckDetails', 0] },
          'geoMetrics.distanceInMeters': 1,
        },
      },
    ]).toArray();

    // Return empty array if no drivers found
    if (!drivers.length) {
      return [];
    }

    // Enrich each driver with calculated metrics
    const enrichedDrivers = drivers.map((driver) =>
      enrichDriverWithMetrics(driver, userOriginCoords, userAddress)
    );

    // Sort by priority and distance
    return sortDriversByPriorityAndDistance(enrichedDrivers);
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

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
        isVerifyDriverLicense: payload.isVerifyDriverLicense,
        isVerifyDriverNid: payload.isVerifyDriverNid,
        isReadyToDrive: payload.isReadyToDrive,
        request_status: payload.isReadyToDrive ? 'approved' : 'rejected'
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
    if (result.request_status === 'approved') {
      // send email to driver that verification is approved


      const user = await User.findById(payload.driverId);

      if (user) {
        sendEmail(
          user.email,
          emailcontext.sendDriverVerificationStatus(
            user.name,
            0,
            'Driver Verification Approved',
            "approved"
          ),
          'Driver Verification Approved',

        );
      }
    } else if (result.request_status === 'rejected') {
      // send email to driver that verification is rejected

      const user = await User.findById(payload.driverId);

      if (user) {
        sendEmail(
          user.email,
          emailcontext.sendDriverVerificationStatus(
            user.name,
            0,
            'Driver Verification Request Rejected',
            "rejected"
          ),
          'Driver Verification Request Rejected',
        );
      }
    }


    return {
      status: true,
      message: 'verification status successfully updated',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Error finding nearest available trip truck drivers',
      error,
    );
  }
};

const delete_driver_verification_request_IntoDb = async (id: string, userId: string) => {
  try {
    const retry = async (fn: () => Promise<any>) => {
      try {
        return await fn();
      } catch {
        return await fn();
      }
    };

    await driververifications.deleteOne({ _id: id });

    await Promise.all([
      retry(() =>
        Conversation.deleteMany({ participants: { $in: [userId] } })
      ),

      retry(() =>
        Message.deleteMany({ msgByUserId: userId })
      ),

      retry(() =>
        notifications.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),

      retry(() =>
        requests.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),

      retry(() =>
        stripepaymentgateways.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),

      retry(() =>
        drivertransactionInfos.deleteMany({
          $or: [{ driverId: userId }],
        })
      ),

      retry(() =>
        ratingreview.deleteMany({
          $or: [{ driverId: userId }, { userId }],
        })
      ),
    ]);

    return {
      status: true,
      message: "Successfully deleted driver verification request & related data",
    };

  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Error deleting driver verification request",
      error
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
