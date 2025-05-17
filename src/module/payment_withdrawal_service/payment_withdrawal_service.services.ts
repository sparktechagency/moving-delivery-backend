import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import User from '../user/user.model';
import stripepaymentgateways from '../payment_gateway/payment gateway.model';
import {
  MonthStat,
  StatsQuery,
  StatsResult,
} from './payment_withdrawal_service.interface';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { USER_ACCESSIBILITY, USER_ROLE } from '../user/user.constant';
import driververifications from '../driver_verification/driver_verification.model';
import mongoose from 'mongoose';

const getUserCreationStats = async (query: { year?: string }) => {
  try {
    const matchStage: Record<string, any> = {};

    if (query.year) {
      const year = parseInt(query.year);
      matchStage.createdAt = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }

    const [stats, total] = await Promise.all([
      User.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
          },
        },
        {
          $project: {
            _id: 0,
            year: '$_id.year',
            month: '$_id.month',
            count: 1,
          },
        },
      ]),
      User.countDocuments(matchStage),
    ]);

    return {
      totalUserCount: total,
      monthlyStats: stats,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch user creation stats',
      error,
    );
  }
};

/**
 * @param query
 * @returns
 */
const getAdminCreationStatsIntoDb = async (
  query: StatsQuery,
): Promise<StatsResult> => {
  try {
    const matchStage: Record<string, any> = { isDelete: false };

    if (query.year) {
      const year = parseInt(query.year, 10);
      matchStage.createdAt = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
      };
    }
    const aggregationPipeline: any = [
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          monthlyAmount: { $sum: '$price' },
          monthlyCount: { $sum: 1 },
          cardCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentmethod', 'card'] }, 1, 0],
            },
          },
          cashCount: {
            $sum: {
              $cond: [{ $eq: ['$paymentmethod', 'cash'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$monthlyAmount' },
          totalCount: { $sum: '$monthlyCount' },
          monthlyStats: {
            $push: {
              year: '$_id.year',
              month: '$_id.month',
              totalAmount: '$monthlyAmount',
              paymentCount: '$monthlyCount',
              cardCount: '$cardCount',
              cashCount: '$cashCount',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          totalCount: 1,
          monthlyStats: 1,
        },
      },
    ];

    const result = await stripepaymentgateways.aggregate(aggregationPipeline);

    const {
      totalAmount = 0,
      totalCount = 0,
      monthlyStats = [],
    } = result[0] || {};

    const statsWithGrowth = monthlyStats.map(
      (stat: MonthStat, index: number, array: MonthStat[]) => {
        if (index === 0) {
          return { ...stat, growth: null };
        }

        const previousStat = array[index - 1];
        const growth =
          previousStat.totalAmount > 0
            ? Number(
                (
                  ((stat.totalAmount - previousStat.totalAmount) /
                    previousStat.totalAmount) *
                  100
                ).toFixed(2),
              )
            : null;

        return { ...stat, growth };
      },
    );

    return {
      totalAmount,
      totalCount,
      monthlyStats: statsWithGrowth,
    };
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch admin creation statistics',
      '',
    );
  }
};

const recentUserStatusIntoDb = async (query: Record<string, unknown> = {}) => {
  try {
    const finalQuery = {
      sort: query.sort || '-createdAt',
      limit: query.limit || '10',
      ...query,
    };

    const userQuery = new QueryBuilder(
      User.find().select('name email photo from to'),
      finalQuery,
    )
      .filter()
      .paginate()
      .fields();

    const [users, meta] = await Promise.all([
      userQuery.modelQuery,
      userQuery.countTotal(),
    ]);

    return { meta, users };
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to fetch recent user status',
      '',
    );
  }
};

/**
 * @param payload 
 * @returns
 */
const restricts_account_withdrawal_into_db = async (payload: { userId: string }) => {
  const session = await mongoose.startSession();
  
  try {
    
    session.startTransaction();
    
    const isRestrict = await User.findOne({
      _id: payload.userId,
      status: USER_ACCESSIBILITY.blocked,
      isDelete: false,
      role: USER_ROLE.driver,
    }).session(session).lean();
    
    if (!isRestrict) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'This driver account is not restricted or does not exist',
        '',
      );
    }

    const changeUserStatus = await User.findByIdAndUpdate(
      payload.userId,
      { status: USER_ACCESSIBILITY.isProgress },
      { new: true, session: session },
    );
    
    if (!changeUserStatus) {
      throw new ApiError(
        httpStatus.NOT_MODIFIED,
        'Issues updating user account status',
        '',
      );
    }

    const driverVerification = await driververifications.findOne({
      userId: payload.userId,
    }).session(session);
    
    if (!driverVerification) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification record not found',
        '',
      );
    }

    const changeVerificationRestrictionStatus = await driververifications.findByIdAndUpdate(
      driverVerification._id, 
      { isVerifyDriverNid: true, isReadyToDrive: true },
      { new: true, session: session },
    );
    
    if (!changeVerificationRestrictionStatus) {
      throw new ApiError(
        httpStatus.NOT_MODIFIED,
        'Issues updating driver verification restriction status',
        '',
      );
    }

    await session.commitTransaction();
    session.endSession();
    
    return {
      status:true,
      message: 'Driver account restrictions removed successfully',
    };
    
  } catch (error: any) {

    await session.abortTransaction();
    session.endSession();
    
    if (error instanceof ApiError) {
      throw error;
    }
  
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to remove restrictions from driver account',
      error.message || '',
    );
  }
};


const Payment_Withdrawal_Services = {
  getUserCreationStats,
  getAdminCreationStatsIntoDb,
  recentUserStatusIntoDb,
  restricts_account_withdrawal_into_db,
};

export default Payment_Withdrawal_Services;
