import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { IRatingReview, RequestResponse } from './rating.review.interface';
import requests from '../requests/requests.model';
import ratingreview from './rating.review.model';


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


const RatingReviewServices = {
  create_review_rating_intoDb,
  findByAllReviewRatingFromDb,
};

export default RatingReviewServices;
