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
    const verification =  await driververifications.isDriverVerificationExistByCustomId(id);

    return {
      
      ...verification,
      driverVerificationStatus:verification?.request_status || 'not_applied',

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


//const googleUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${fromLat},${fromLong}&destinations=${destLat},${destLong}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
const searching_for_available_trip_truck_listsWithMongo = async (
  userLocation: IUserLocation,
  userId: string
): Promise<DriverWithMetrics[]> => {
  try {
    // ✅ Update user location
    const result = await User.updateOne(
      { _id: userId, isDelete: false },
      { $set: userLocation },
      { new: true, upsert: true }
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Issue updating user geolocation.', '');
    }


    const [fromLong, fromLat] = userLocation.to.coordinates;
    const [destLong, destLat] = userLocation.from.coordinates;

    // ✅ Calculate straight-line distance
    const straightLineMeters = geolib.getDistance(
      { longitude: fromLong, latitude: fromLat },
      { longitude: destLong, latitude: destLat }
    );

    const straightLineKm = Number((straightLineMeters / 1000).toFixed(2));

    // ✅ Estimate realistic road distance (Google-like)
    // On average, road distance ≈ straightLine × 1.4
    const estimatedRoadKm = Number((straightLineKm * 1.6).toFixed(2));

    // ✅ Find all verified & ready drivers with truck details
    const drivers = await driververifications.aggregate([
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

    if (!drivers.length) return [];

    // ✅ Constants
    const FLAT_RATE = 50;
    const EXTRA_KM_THRESHOLD = 20;
    const EXTRA_RATE_PER_KM = 2.5;
    const MAX_DISTANCE_KM = 30;

    const enrichedDrivers = drivers.map((driver: any) => {
      const [lng, lat] = driver.autoDetectLocation;
      const driverCoords = {
        longitude: parseFloat(lng.toString()),
        latitude: parseFloat(lat.toString()),
      };

      const destinationCoords = { longitude: destLong, latitude: destLat };

      const distanceInMeters = geolib.getDistance(driverCoords, destinationCoords);
      const distanceKm = Number((distanceInMeters / 1000).toFixed(2));

      const bearingDegrees = Number(
        geolib.getRhumbLineBearing(driverCoords, destinationCoords).toFixed(1)
      );

      const estimatedDurationMin = Number((distanceKm * 1.2).toFixed(1));

      const routeType = classifyRouteType(distanceKm);

      // 💰 Pricing logic
      let finalPrice = driver?.truckDetails?.price;
      if (estimatedRoadKm > EXTRA_KM_THRESHOLD) {
        const extraKm = estimatedRoadKm - EXTRA_KM_THRESHOLD;
        const extraCharge = extraKm * EXTRA_RATE_PER_KM;
        finalPrice += extraCharge;
      }

      const price = Number(finalPrice).toFixed(2);

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
        userTripDistanceKm: estimatedRoadKm, // ✅ realistic driving distance
      };
    });

    return enrichedDrivers
      .filter(driver => driver.geoMetrics.distanceKm <= MAX_DISTANCE_KM)
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
    if(result.request_status === 'approved'){
      // send email to driver that verification is approved
      const user = await User.findById(payload.driverId);
      if(user){
        await sendEmail(
          user.email,
          `Dear ${user.name}, your driver verification has been approved. You can now start accepting trips.`,
          'Driver Verification Approved',
          
        );
      }
    } else if (result.request_status === 'rejected'){
      // send email to driver that verification is rejected

      const user = await User.findById(payload.driverId);
      if(user){
        await sendEmail(
          user.email,
          `Dear ${user.name}, we regret to inform you that your driver verification has been rejected. Please review the documents and try again.  \n${!result.isVerifyDriverLicense && "Driving license"} \n ${!result.isVerifyDriverNid && "NID"} `,
          'Driver Verification Rejected',
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
