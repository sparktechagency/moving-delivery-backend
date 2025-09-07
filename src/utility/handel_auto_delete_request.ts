import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';
import requests from '../module/requests/requests.model';

const handel_auto_delete_request = async () => {
  try {
    // const currentTime = new Date();
    // const timeThreshold = new Date(currentTime.getTime() - 30 * 60 * 1000);

    // const unacceptedRequest = await requests
    //   .find(
    //     {
    //       isAccepted: false,
    //       isCompleted: false,
    //       isRemaining: false,
    //       isDelete: false,
    //       createdAt: { $lt: timeThreshold },
    //     },
    //     { _id: 1 },
    //   )
    //   .lean();

    // if (unacceptedRequest.length === 0) {
    //   return { deletedCount: 0, message: 'No unaccepted request to delete' };
    // }

    // const requestIds = unacceptedRequest?.map((requestId) => requestId._id);
    // const deleteResult = await requests.deleteMany({
    //   _id: { $in: requestIds },
    // });

    // if (!deleteResult || deleteResult?.deletedCount === 0) {
    //   throw new ApiError(
    //     httpStatus.INTERNAL_SERVER_ERROR,
    //     'Failed to delete  un acceptable request',
    //     '',
    //   );
    // }
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'unaccepted user request  cron under issues ',
      error,
    );
  }
};

export default handel_auto_delete_request;
