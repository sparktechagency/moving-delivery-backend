import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { IRatingReview, RequestResponse } from './rating.review.interface';
import requests from '../requests/requests.model';
import ratingreview from './rating.review.model';
import QueryBuilder from '../../app/builder/QueryBuilder';


const create_review_rating_intoDb = async (
  payload: IRatingReview,
  userId: string,
): Promise<RequestResponse> => {
  try {
    const isRequest = await requests.findOne(
      {
        _id: payload.requestId,
        userId,
        isDelete: false,
        isAccepted: true,
        isCompleted: true,
      },
      {
        driverId: 1,
        userId: 1,
      },
    );

    if (!isRequest) {
      throw new ApiError(httpStatus.NOT_FOUND, 'not founded tripe request', '');
    }

    const isRatingExist = await ratingreview.exists({
      requestId: payload.requestId,
      isDelete: false,
      isRating: true,
    });

    if (isRatingExist) {
      return {
        status: false,
        message: 'This has already been recorded with the tripe rating ',
      };
    }
    const rating_reviewBuilder = new ratingreview({
      ...payload,
      userId,
      driverId: isRequest.driverId,
    });
    const result = await rating_reviewBuilder.save();

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'issues by the create_review_rating_intoDb',
        '',
      );
    }

    return {
      status: true,
      message: 'successfully recorded rating review',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create_review_rating_intoDb',
      error,
    );
  }
};

interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

const findByAllReviewRatingFromDb = async ({ page = 1, limit = 10, search = '' }: QueryParams) => {
  const skip = (page - 1) * limit;

  const searchMatchStage = search
    ? {
      $match: {
        $or: [
          { 'driverDetails.name': { $regex: search, $options: 'i' } },
          { 'driverDetails.email': { $regex: search, $options: 'i' } },
        ],
      },
    }
    : null;

  const pipeline: any[] = [
    {
      $group: {
        _id: '$driverId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'driverDetails',
      },
    },
    { $unwind: '$driverDetails' },
    {
      $project: {
        _id: 0,
        driverId: '$_id',
        name: '$driverDetails.name',
        email: '$driverDetails.email',
        avgRating: { $round: ['$avgRating', 1] },
        reviewCount: '$count',
      },
    },
  ];

  if (searchMatchStage) {
    pipeline.push(searchMatchStage);
  }
  const countPipeline = [...pipeline, { $count: 'total' }];

  pipeline.push(
    { $sort: { avgRating: -1 } },
    { $skip: skip },
    { $limit: limit }
  );

  const [data, totalResult] = await Promise.all([
    ratingreview.aggregate(pipeline),
    ratingreview.aggregate(countPipeline),
  ]);

  const total = totalResult[0]?.total || 0;

  return {
    success: true,
    message: 'Successfully found average ratings for all drivers',
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data,

  };
};



const recentelyAcceptedTripeIntoDb = async (driverId: string) => {
  try {
    const userTripHistory = new QueryBuilder(
      ratingreview
        .find({
          driverId,
          isDelete: false,
        })
        .populate([
          {
            path: 'userId',
            select: 'name photo from.coordinates to.coordinates',
          },
          {
            path: 'requestId',
            select: 'requestId isAccepted isCompleted isCanceled price',


          },
        ])
        .select(
          '-driverId -isRating -isDelete -createdAt -updatedAt -requestId',
        )

        .sort({ createdAt: -1 }),
      {},
    )
      .filter()
      .paginate()
      .fields();

    const user_completed_history = await userTripHistory.modelQuery;
    const meta = await userTripHistory.countTotal();

    return {
      meta,
      user_completed_history,
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'some issue by the recent accepted trip',
      error,
    );
  }
};

const personal_details_IntoDb = async (requestId: string) => {

  try {

    const result = await ratingreview
      .find({
        requestId,
        isDelete: false,
      })
      .populate([
        {
          path: 'userId',
          select: 'name phoneNumber location photo',
        },
        {
          path: 'requestId',
          select: 'requestId isAccepted isCompleted driverVerificationsId',
          populate: [
            {
              path: 'driverVerificationsId',
              select: 'driverSelectedTruck',
              populate: {
                path: 'driverSelectedTruck',
                select: 'truckName truckcategories',
                populate: {
                  path: 'truckcategories',
                  select: 'categoryName capacity',
                },
              },
            },
          ],
        },
      ])
      .select(
        '-driverId -isRating -isDelete -createdAt -updatedAt -requestId',
      );
    return result

  }
  catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'some issue by the personal details',
      error,
    );
  }
}



const RatingReviewServices = {
  create_review_rating_intoDb,
  findByAllReviewRatingFromDb,
  recentelyAcceptedTripeIntoDb,
  personal_details_IntoDb
};

export default RatingReviewServices;
