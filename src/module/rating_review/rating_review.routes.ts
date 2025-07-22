import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import ratingReviewValidationSchema from './rating.review.zod.validations';
import RatingReviewController from './rating.review.controller';

const route = express.Router();

route.post(
  '/user_rating_review',
  auth(USER_ROLE.user),
  validationRequest(ratingReviewValidationSchema.ratingReviewSchema),
  RatingReviewController.create_review_rating,
);

route.get(
  '/avg_rating',
  auth(USER_ROLE.user, USER_ROLE.driver),
  RatingReviewController.findByAllReviewRating,
);

const RatingReviewRoutes = route;

export default RatingReviewRoutes;
