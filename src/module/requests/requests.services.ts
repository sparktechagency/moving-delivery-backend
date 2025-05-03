import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { Types } from 'mongoose';
import driververifications from '../driver_verification/driver_verification.model';
import { RequestResponse, TRequest } from './requests.interface';
import User from '../user/user.model';
import { USER_ACCESSIBILITY } from '../user/user.constant';
import SelectTruck from '../select_truck/select_truck.model';
import requests from './requests.model';
import QueryBuilder from '../../app/builder/QueryBuilder';

/**
 * @param userId - The ID of the user sending the request
 * @param payload - The request payload data
 * @returns Promise with status and message
 */
const sendRequestIntoDb = async (
  userId: string,
  payload: Partial<TRequest>,
): Promise<RequestResponse> => {
  try {
    // Validate inputs
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid user ID provided',
        '',
      );
    }

    if (
      !payload.driverVerificationsId ||
      !Types.ObjectId.isValid(payload.driverVerificationsId)
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid driver verification ID',
        '',
      );
    }

    // Find verified driver with all required checks in a single query
    const verifiedDriver = await driververifications.findOne(
      {
        _id: payload.driverVerificationsId,
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
        isDelete: false,
      },
      { driverSelectedTruck: 1, userId: 1 },
    );

    if (!verifiedDriver) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification not found or requirements not met',
        '',
      );
    }

    // Check if driver exists and meets required criteria
    const driver = await User.findOne(
      {
        _id: verifiedDriver.userId,
        isVerify: true,
        isDelete: false,
        status: USER_ACCESSIBILITY.isProgress,
      },
      { _id: 1 },
    );

    if (!driver) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver not found or not currently available',
        '',
      );
    }

    // Validate selected truck exists
    const selectedTruck = await SelectTruck.findOne(
      {
        _id: verifiedDriver.driverSelectedTruck,
        isDelete: false,
      },
      { _id: 1 },
    );

    if (!selectedTruck) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Selected truck not found or unavailable',
        '',
      );
    }

    // Check for existing active request to prevent duplicates
    const existingRequest = await requests.findOne(
      {
        userId,
        driverId: driver._id,
        isAccepted: false,
        isDelete: false,
        isCompleted: false,
        isCanceled: false,
        isRemaining: false,
      },
      { _id: 1 },
    );

    if (existingRequest) {
      return {
        status: true,
        message: 'Request already exists and is being processed',
      };
    }

    // Create and save the new request
    const newRequest = await requests.create({
      ...payload,
      userId,
      driverId: driver._id,
      driverVerificationsId: verifiedDriver._id,
    });

    if (!newRequest) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create request',
        '',
      );
    }

    // TODO: Implement notification service here
    // await notificationService.sendRequestNotification(driver._id, userId);

    return {
      status: true,
      message: 'Request sent successfully',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error processing request',
      error,
    );
  }
};

const myClientRequestIntoDb = async (
  driverId: string,
  query: Record<string, unknown>,
) => {
  try {
    const myrequest = new QueryBuilder(
      requests
        .find({
          driverId,
          isCanceled: false,
          isDelete: false,
          isAccepted: false,
          isCompleted: false,
        })
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const allrequest = await myrequest.modelQuery;
    const meta = await myrequest.countTotal();

    return { meta, allrequest };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error processing request',
      error,
    );
  }
};

const clientRequestDetailsIntoDb = async (requestId: string) => {
  try {
    return await requests
      .findOne({
        _id: requestId,
        isCanceled: false,
        isDelete: false,
        isAccepted: false,
        isCompleted: false,
      })
      .populate([
        {
          path: 'userId',
          select: 'name email from',
        },
      ])
      .select(
        '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete',
      );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error processing request',
      error,
    );
  }
};

// cancel request ----> driver

const cancelRequestIntoDb = async (
  driverId: string,
  requestId: string,
): Promise<RequestResponse> => {
  try {
    const isExistRequest = await requests.findOne(
      {
        _id: requestId,
        driverId,
        isCanceled: false,
        isDelete: false,
        isAccepted: false,
        isCompleted: false,
      },
      { _id: 1, driverVerificationsId: 1 },
    );

    if (!isExistRequest) {
      throw new ApiError(
        httpStatus.NOT_ACCEPTABLE,
        'some issues by the requests collection',
        '',
      );
    }

    const verifiedDriver = await driververifications.findOne(
      {
        _id: isExistRequest.driverVerificationsId,
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
        isDelete: false,
      },
      { driverSelectedTruck: 1 },
    );

    if (!verifiedDriver) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification not found or requirements not met',
        '',
      );
    }

    // Validate selected truck exists
    const selectedTruck = await SelectTruck.findOne(
      {
        _id: verifiedDriver.driverSelectedTruck,
        isDelete: false,
      },
      { _id: 1 },
    );

    if (!selectedTruck) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Selected truck not found or unavailable',
        '',
      );
    }

    const result = await requests.findByIdAndUpdate(
      requestId,
      { isCanceled: true },
      { new: true, upsert: true },
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_IMPLEMENTED,
        'some issues by the cancel request section ',
        '',
      );
    }

    // send notification cancel request

    return {
      status: true,
      message: 'successfully accepted cancel request ',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error processing request',
      error,
    );
  }
};

const findByAllCancelRequstIntoDb = async (
  driverId: string,
  query: Record<string, unknown>,
) => {
  try {
    const myrequest = new QueryBuilder(
      requests
        .find({
          driverId,
          isCanceled: true,
          isDelete: false,
          isAccepted: false,
          isCompleted: false,
        })
        .populate([
          {
            path: 'userId',
            select: 'name  from',
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete -selectedProduct -trucktripeTime',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const allrequest = await myrequest.modelQuery;
    const meta = await myrequest.countTotal();

    return { meta, allrequest };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error processing request',
      error,
    );
  }
};

const RequestServices = {
  sendRequestIntoDb,
  myClientRequestIntoDb,
  clientRequestDetailsIntoDb,
  cancelRequestIntoDb,
  findByAllCancelRequstIntoDb,
};

export default RequestServices;
