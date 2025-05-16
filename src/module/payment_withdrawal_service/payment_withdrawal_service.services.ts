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



const Payment_Withdrawal_Services = {
  getUserCreationStats,
  getAdminCreationStatsIntoDb,
  recentUserStatusIntoDb,
};

export default Payment_Withdrawal_Services;
