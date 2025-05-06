import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import mongoose, { Types } from 'mongoose';
import driververifications from '../driver_verification/driver_verification.model';
import { RequestResponse, TRequest } from './requests.interface';
import User from '../user/user.model';
import { USER_ACCESSIBILITY } from '../user/user.constant';
import SelectTruck from '../select_truck/select_truck.model';
import requests from './requests.model';
import QueryBuilder from '../../app/builder/QueryBuilder';
import NotificationServices from '../notification/notification.services';
import notifications from '../notification/notification.modal';

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
  try {
    const request = await requests.findOne({
      _id: requestId,
      driverId,
      isCanceled: false,
      isDelete: false,
      isAccepted: false,
      isCompleted: false,
    });

    if (!request) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Request not found or not available',
        '',
      );
    }

    const driverVerification = await driververifications.findOne({
      _id: request.driverVerificationsId,
      isVerifyDriverLicense: true,
      isVerifyDriverNid: true,
      isReadyToDrive: true,
      isDelete: false,
    });

    if (!driverVerification) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Driver not verified or not eligible',
        '',
      );
    }

    const truckExists = await SelectTruck.exists({
      _id: driverVerification.driverSelectedTruck,
      isDelete: false,
    });

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
      { new: true },
    );

    if (!updatedRequest) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to update request',
        '',
      );
    }
    // send accepted notification

    return {
      status: true,
      message: 'Request accepted successfully',
    };
  } catch (error: any) {
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
    const request = await requests.findOne({       
      _id: requestId,       
      driverId,       
      isAccepted: true,       
      isCompleted: false,       
      isCanceled: false,       
      isDelete: false,     
    }, {userId:1, driverVerificationsId:1}).session(session);
      
    if (!request) {       
      throw new ApiError(         
        httpStatus.NOT_FOUND,         
        'Active request not found or not eligible for completion',         
        '',       
      );     
    }      
    
    const isDriverVerified = await driververifications.exists({       
      _id: request.driverVerificationsId,       
      isVerifyDriverLicense: true,       
      isVerifyDriverNid: true,       
      isReadyToDrive: true,       
      isDelete: false,     
    }).session(session);      
    
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
    
    if(!sendNotification) {       
      throw new ApiError(httpStatus.NO_CONTENT, 'Issues by the complete status notification section', '');     
    }      
    
    const notificationsBuilder = new notifications({       
      userId: request.userId.toString(),       
      title: data.time,       
      content: data.content,     
    });      
    
    const storeNotification = await notificationsBuilder.save({ session });
    
    if(!storeNotification) {       
      throw new ApiError(httpStatus.NO_CONTENT, 'Issues by the complete status notification section', '');     
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
};

export default RequestServices;
