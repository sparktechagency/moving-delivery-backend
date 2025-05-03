import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import RequestValidationSchema from './requests.zod.validation';
import RequestController from './requests.controller';

const router = express.Router();

router.post(
  '/user_request_to_driver',
  auth(USER_ROLE.user),
  validationRequest(RequestValidationSchema.createRequestZodSchema),
  RequestController.sendRequest,
);

router.get(
  '/find_by_driver_all_trip_request',
  auth(USER_ROLE.driver),
  RequestController.myClientRequest,
);

router.get(
  '/find_by_specific_trip_request_details/:requestId',
  auth(USER_ROLE.driver),
  RequestController.clientRequestDetails,
);

router.get(
  '/cancel_request/:requestId',
  auth(USER_ROLE.driver),
  RequestController.cancelRequest,
);

router.get(
  '/find_by_all_cancel_request',
  auth(USER_ROLE.driver),
  RequestController.findByAllCancelRequst,
);

const RequestRoutes = router;
export default RequestRoutes;
