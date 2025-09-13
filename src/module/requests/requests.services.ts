import httpStatus from 'http-status';
import mongoose, { Types } from 'mongoose';
import ApiError from '../../app/error/ApiError';
import driververifications from '../driver_verification/driver_verification.model';
import { RequestResponse, TRequest } from './requests.interface';

import QueryBuilder from '../../app/builder/QueryBuilder';
import notifications from '../notification/notification.modal';
import NotificationServices from '../notification/notification.services';
import SelectTruck from '../select_truck/select_truck.model';
import requests from './requests.model';

/**
 * @param userId
 * @param payload
 * @returns
 */
/**
 * @param userId
 * @param payload
 * @returns
 */
const sendRequestIntoDb = async (
  userId: string,
  payload: Partial<TRequest>,
): Promise<RequestResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    const verifiedDriver = await driververifications?.findOne(
      {
        _id: payload.driverVerificationsId,
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
        isDelete: false,
      },
      { driverSelectedTruck: 1, userId: 1 },
      { session },
    );

    if (!verifiedDriver) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification not found or requirements not met',
        '',
      );
    }

    const selectedTruck = await SelectTruck?.findOne(
      {
        _id: verifiedDriver.driverSelectedTruck,
        isDelete: false,
      },
      { _id: 1 },
      { session },
    );

    if (!selectedTruck) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Selected truck not found or unavailable',
        '',
      );
    }

    // Replace findOne with aggregate to check for existing requests
    const existingRequestResult = await requests
      ?.aggregate([
        {
          $match: {
            driverId: verifiedDriver.userId,
            isDelete: false,
            $or: [
              { isAccepted: true, isCompleted: false, isCanceled: false },
              { isAccepted: false, isCompleted: false, isCanceled: false },
            ],
          },
        },
        {
          $count: 'count',
        },
      ])
      .session(session);

    // Check if any existing requests were found
    const existingRequestCount =
      existingRequestResult && existingRequestResult.length > 0
        ? existingRequestResult[0].count
        : 0;

    if (existingRequestCount > 0) {
      await session.commitTransaction();
      session.endSession();
      return {
        status: true,
        message: 'Request already exists and is being processed',
      };
    }

    payload.price = Number(payload.price);

    const newRequest = await requests?.create(
      [
        {
          ...payload,
          userId,
          driverId: verifiedDriver.userId,
          driverVerificationsId: verifiedDriver._id,
        },
      ],
      { session },
    );

    if (!newRequest || newRequest.length === 0) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to create request',
        '',
      );
    }
    const data = {
      title: 'Connection Request Accepted',
      content: `Send Your Request This Driver`,
      time: new Date(),
    };

    const sendNotification = await NotificationServices.sendPushNotification(
      userId.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }


    const notificationsBuilder = new notifications({
      driverId: verifiedDriver.userId.toString(),
      requestId: newRequest[0]._id.toString(),
      title: data.time,
      content: data.content,
    });


    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: 'Request sent successfully',
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

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
        .populate([
          {
            path: 'userId',
            select: 'name from.coordinates to.coordinates',
          },
          {
            path: 'driverVerificationsId',
            select: 'driverSelectedTruck',
            populate: {
              path: 'driverSelectedTruck',
              select: 'truckcategories',
            },
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete -selectedProduct -trucktripeTime -price -avgRating -totalReviews -createdAt -updatedAt',
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isExistRequest: any = await requests.findOne(
      {
        _id: requestId,
        driverId,
        isCanceled: false,
        isDelete: false,
        isAccepted: false,
        isCompleted: false,
      },
      { _id: 1, driverVerificationsId: 1, userId: 1 },
      { session },
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
      { driverSelectedTruck: 1, userId: 1 },
      { session },
    );

    if (!verifiedDriver) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification not found or requirements not met',
        '',
      );
    }

    const selectedTruck = await SelectTruck.findOne(
      {
        _id: verifiedDriver.driverSelectedTruck,
        isDelete: false,
      },
      { _id: 1 },
      { session },
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
      { new: true, upsert: true, session },
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_IMPLEMENTED,
        'some issues by the cancel request section ',
        '',
      );
    }

    const data = {
      title: 'Connection Request Accepted',
      content: `Send Your Request This Driver`,
      time: new Date(),
    };

    const sendNotification = await NotificationServices.sendPushNotification(
      driverId.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    const notificationsBuilder = new notifications({
      userId: isExistRequest?.userId,
      requestId: isExistRequest?._id.toString(),
      title: data.time,
      content: data.content,
    });

    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: 'successfully accepted cancel request ',
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

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
            select: 'name from.coordinates to.coordinates',
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete  -trucktripeTime',
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

// accepted request

/**
 * @param driverId
 * @param requestId
 * @returns
 */
const acceptedRequestIntoDb = async (
  driverId: string,
  requestId: string,
): Promise<RequestResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await requests.findOne(
      {
        _id: requestId,
        driverId,
        isCanceled: false,
        isDelete: false,
        isAccepted: false,
        isCompleted: false,
      },
      { userId: 1, driverVerificationsId: 1 },
      { session },
    );

    if (!request) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Request not found or not available',
        '',
      );
    }

    const driverVerification = await driververifications.findOne(
      {
        _id: request.driverVerificationsId,
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
        isDelete: false,
      },
      { driverSelectedTruck: 1, userId: 1 },
      { session },
    );

    if (!driverVerification) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Driver not verified or not eligible',
        '',
      );
    }

    const truckExists = await SelectTruck.exists({
      _id: driverVerification?.driverSelectedTruck,
      isDelete: false,
    }).session(session);

    if (!truckExists) {
      throw new ApiError(
        httpStatus.PRECONDITION_FAILED,
        'Selected truck not available',
        '',
      );
    }
    const updatedRequest = await requests.findByIdAndUpdate(
      requestId,
      { isAccepted: true },
      { new: true, session },
    );

    if (!updatedRequest) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to update request',
        '',
      );
    }
    // send accepted notification

    const data = {
      title: 'Connection Request Accepted',
      content: `Driver Accepted Your Request`,
      time: new Date(),
    };

    const sendNotification = await NotificationServices.sendPushNotification(
      driverId.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    const notificationsBuilder = new notifications({
      userId: request?.userId,
      requestId: request?._id.toString(),
      title: data.time,
      content: data.content,
    });

    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: 'Request accepted successfully',
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to process request',
      error,
    );
  }
};
const findByAllRemainingTripeIntoDb = async (
  driverId: string,
  query: Record<string, unknown>,
) => {
  try {
    const myRemainingTrip = new QueryBuilder(
      requests
        .find({
          driverId,
          isCanceled: false,
          isDelete: false,
          isAccepted: true,
          isCompleted: false,
        })
        .populate([
          {
            path: 'userId',
            select: 'name  from.coordinates to.coordinates',
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete -trucktripeTime',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const allremainingtrip = await myRemainingTrip.modelQuery;
    const meta = await myRemainingTrip.countTotal();

    return { meta, allremainingtrip };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error my remaining rrip request',
      error,
    );
  }
};

/**
 * @param driverId
 * @param requestId
 * @returns
 */
const completedTripeRequestIntoDb = async (
  driverId: string,
  requestId: string,
): Promise<RequestResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await requests
      .findOne(
        {
          _id: requestId,
          driverId,
          isAccepted: true,
          isCompleted: false,
          isCanceled: false,
          isDelete: false,
        },
        { userId: 1, driverVerificationsId: 1 },
      )
      .session(session);

    if (!request) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Active request not found or not eligible for completion',
        '',
      );
    }

    const isDriverVerified = await driververifications
      .exists({
        _id: request.driverVerificationsId,
        isVerifyDriverLicense: true,
        isVerifyDriverNid: true,
        isReadyToDrive: true,
        isDelete: false,
      })
      .session(session);

    if (!isDriverVerified) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Driver verification status is invalid',
        '',
      );
    }

    const updatedRequest = await requests.findByIdAndUpdate(
      requestId,
      { isCompleted: true },
      { new: true, session },
    );

    if (!updatedRequest) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to mark request as completed',
        '',
      );
    }

    const data = {
      title: 'Connection Request Accepted',
      content: `Accepted your connection request`,
      time: new Date(),
    };

    const sendNotification = await NotificationServices.sendPushNotification(
      request.userId.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    const notificationsBuilder = new notifications({
      userId: request.userId.toString(),
      requestId: request._id,
      title: data.time,
      content: data.content,
    });

    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      throw new ApiError(
        httpStatus.NO_CONTENT,
        'Issues by the complete status notification section',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      status: true,
      message: 'Trip completed successfully',
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to complete trip',
      error,
    );
  }
};

const findByAllCompletedTripeIntoDb = async (
  driverId: string,
  query: Record<string, unknown>,
) => {
  try {
    const myCompletedTrip = new QueryBuilder(
      requests
        .find({
          driverId,
          isCanceled: false,
          isDelete: false,
          isAccepted: true,
          isCompleted: true,
        })
        .populate([
          {
            path: 'userId',
            select: ' name from.coordinates to.coordinates',
          },
          // {
          //   path: "driverVerificationsId",
          //   select: "driverSelectedTruck",
          //   populate: {
          //     path: "driverSelectedTruck",
          //     select: "truckcategories",
          //   }
          // }
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete  -trucktripeTime -price -avgRating -totalReviews -createdAt -updatedAt',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const allcompletetrip = await myCompletedTrip.modelQuery;
    const meta = await myCompletedTrip.countTotal();

    return { meta, allcompletetrip };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Error my remaining rrip request',
      error,
    );
  }
};

/**
 * @param driverId
 * @returns
 */
const getDriverDashboardIntoDb = async (driverId: string) => {
  try {
    const baseFilter = {
      driverId,
      isDelete: false,
    };

    const [
      canceledRequests,
      pendingRequests,
      acceptedRequests,
      completedRequests,
      userInfo,
      recentBookings,
    ] = await Promise.all([
      requests.countDocuments({
        ...baseFilter,
        isCanceled: true,
        isAccepted: false,
        isCompleted: false,
      }),

      requests.countDocuments({
        ...baseFilter,
        isCanceled: false,
        isAccepted: false,
        isCompleted: false,
      }),

      requests.countDocuments({
        ...baseFilter,
        isCanceled: false,
        isAccepted: true,
        isCompleted: false,
      }),

      requests.countDocuments({
        ...baseFilter,
        isCanceled: false,
        isAccepted: true,
        isCompleted: true,
      }),

      driververifications
        .findOne(
          {
            userId: driverId,
            isVerifyDriverLicense: true,
            isVerifyDriverNid: true,
            isReadyToDrive: true,
            isDelete: false,
          },
          { _id: 1, vehicleNumber: 1 },
        )
        .populate('userId', { name: 1 }),

      requests
        .find({
          ...baseFilter,
          isAccepted: true,
        })
        .sort({ createdAt: -1 })
        .select('bookingTime from to userId fare')
        .populate('userId', {
          name: 1,
          photo: 1,
          from: 1,
        })
        .limit(3),
    ]);

    // panding price

    // Return organized dashboard data
    return {
      stats: {
        canceled: canceledRequests,
        pending: pendingRequests,
        active: acceptedRequests,
        completed: completedRequests,
      },
      driverInfo: userInfo,
      recentBookings,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch driver dashboard data',
      error,
    );
  }
};

// user history ----->  section  ----> started

const user_upcomming_history_IntoDb = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  try {
    const userTripHistory = new QueryBuilder(
      requests
        .find({
          userId,
          isCanceled: false,
          isDelete: false,
          isCompleted: false,
        })
        .populate([
          {
            path: 'userId',
            select: 'from.coordinates to.coordinates',
          },
          {
            path: 'driverId',
            select: 'name',
          },
          {
            path: 'driverVerificationsId',
            select: 'driverSelectedTruck',
            populate: {
              path: 'driverSelectedTruck',
              select: 'truckcategories',
            },
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId  -isCompleted -isCanceled -isRemaining -isDelete -selectedProduct -trucktripeTime  -avgRating -totalReviews -createdAt -updatedAt',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const user_all_tripe_history = await userTripHistory.modelQuery;
    const meta = await userTripHistory.countTotal();

    return { meta, user_all_tripe_history };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch  upcomming user history data ',
      error,
    );
  }
};

const completed_history_IntoDb = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  try {
    const userTripHistory = new QueryBuilder(
      requests
        .find({
          userId,
          isCanceled: false,
          isDelete: false,
          isAccepted: true,
          isCompleted: true,
        })
        .populate([
          {
            path: 'userId',
            select: 'from.coordinates to.coordinates',
          },
          {
            path: 'driverId',
            select: 'name',
          },
          {
            path: 'driverVerificationsId',
            select: 'driverSelectedTruck',
            populate: {
              path: 'driverSelectedTruck',
              select: 'truckcategories',

            },
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete -selectedProduct -trucktripeTime  -avgRating -totalReviews -createdAt -updatedAt',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const user_completed_history = await userTripHistory.modelQuery;
    const meta = await userTripHistory.countTotal();

    return {
      meta,
      user_completed_history,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch completed history into db ',
      error,
    );
  }
};

/**
 * @param userId
 * @param requestId
 * @returns
 */
/**
 * @param userId
 * @param requestId
 * @returns
 */
const user_cancel_tripe_request_IntoDb = async (
  userId: string,
  requestId: string,
): Promise<RequestResponse> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if request exists
    const isExistTripeRequest: any = await requests
      .findOne({
        _id: requestId,
        isAccepted: true,
        isCompleted: false,
        isCanceled: false,
        isDelete: false,
      })
      .select('driverId')
      .session(session);

    if (!isExistTripeRequest) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'This trip is not available for cancellation',
        '',
      );
    }

    // Cancel request
    const cancelRequestResult = await requests.findByIdAndUpdate(
      requestId,
      { isCanceled: true },
      { new: true, upsert: false, session },
    );

    if (!cancelRequestResult) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to cancel the trip request',
        '',
      );
    }

    // Create notification
    const data = {
      title: 'Trip Request Canceled',
      content: `User has canceled the trip request`,
      time: new Date(),
    };

    const notificationsBuilder = new notifications({
      userId,
      driverId: isExistTripeRequest.driverId,
      requestId: isExistTripeRequest._id,
      title: data.title,
      content: data.content,
      createdAt: data.time,
    });

    const storeNotification = await notificationsBuilder.save({ session });

    if (!storeNotification) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to store notification',
        '',
      );
    }

    // Send push notification
    const sendNotification = await NotificationServices.sendPushNotification(
      isExistTripeRequest.driverId.toString(),
      data,
    );

    if (!sendNotification) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to send push notification',
        '',
      );
    }

    
    await session.commitTransaction();

    return {
      status: true,
      message: 'Successfully canceled your trip request',
    };
  } catch (error: any) {
    await session.abortTransaction();

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to cancel trip request',
      error,
    );
  } finally {
   
    session.endSession();
  }
};

const cancel_user_history_IntoDb = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  try {
    const userTripHistory = new QueryBuilder(
      requests
        .find({
          userId,
          isAccepted: true,
          isCompleted: false,
          isCanceled: true,
          isDelete: false,
        })
        .populate([
        {
            path: 'userId',
            select: 'from.coordinates to.coordinates',
          },
          {
            path: 'driverId',
            select: 'name',
          },
          {
            path: 'driverVerificationsId',
            select: 'driverSelectedTruck',
            populate: {
              path: 'driverSelectedTruck',
              select: 'truckcategories',

            },
          },
        ])
        .select(
          '-userId -driverId -driverVerificationsId -isAccepted -isCompleted -isCanceled -isRemaining -isDelete -selectedProduct -trucktripeTime  -avgRating -totalReviews -createdAt -updatedAt',
        ),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const user_completed_history = await userTripHistory.modelQuery;
    const meta = await userTripHistory.countTotal();

    return {
      meta,
      user_completed_history,
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch completed history into db ',
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
  acceptedRequestIntoDb,
  findByAllRemainingTripeIntoDb,
  completedTripeRequestIntoDb,
  findByAllCompletedTripeIntoDb,
  getDriverDashboardIntoDb,
  user_upcomming_history_IntoDb,
  completed_history_IntoDb,
  user_cancel_tripe_request_IntoDb,
  cancel_user_history_IntoDb,
};

export default RequestServices;
