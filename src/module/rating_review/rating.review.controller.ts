import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import RatingReviewServices from './rating.review.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const create_review_rating: RequestHandler = catchAsync(async (req, res) => {
  const result = await RatingReviewServices.create_review_rating_intoDb(
    req.body,
    req.user.id,
  );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Recorded Review Rating ',
    data: result,
  });
});

const findByAllReviewRating: RequestHandler = catchAsync(async (req, res) => {
  const { page, limit, search } = req.query;

  const pageNumber = parseInt(page as string) || 1;
  const limitNumber = parseInt(limit as string) || 10;

  const result = await RatingReviewServices.findByAllReviewRatingFromDb({
    page: pageNumber,
    limit: limitNumber,
    search: search as string,
  });

  res.status(httpStatus.OK).json(result);
});


const recentelyAcceptedTripe: RequestHandler = catchAsync(async (req, res) => {

  const result = await RatingReviewServices.recentelyAcceptedTripeIntoDb(req.user.id);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Find By Recentely  Accepeted Tripe ',
    data: result,
  });
});

const personal_details: RequestHandler = catchAsync(async (req, res) => {

  const result = await RatingReviewServices.personal_details_IntoDb(req.params.requestId);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Find  The Personal Details ',
    data: result,
  });


})

const RatingReviewController = {
  create_review_rating,
  findByAllReviewRating,
  recentelyAcceptedTripe,
  personal_details
};

export default RatingReviewController;
