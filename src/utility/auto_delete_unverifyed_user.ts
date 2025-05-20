import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';
import User from '../module/user/user.model';

const auto_delete_unverifyed_user = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(currentTime.getTime() - 10 * 60 * 1000);

    const unverifyedUsers = await User.find(
      {
        isVerify: false,
        isDelete: false,
        createdAt: { $lt: timeThreshold },
      },
      { _id: 1 },
    ).lean();

    if (unverifyedUsers.length === 0) {
      return { deletedCount: 0, message: 'unverifyed user to delete' };
    }

    const userIds = unverifyedUsers?.map((userId) => userId._id);

    const deleteResult = await User.deleteMany({
      _id: { $in: userIds },
    });

    if (!deleteResult || deleteResult?.deletedCount === 0) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete unVarifyed account ',
        '',
      );
    }
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'unverifyed user request  cron under issues ',
      error,
    );
  }
};

export default auto_delete_unverifyed_user;
