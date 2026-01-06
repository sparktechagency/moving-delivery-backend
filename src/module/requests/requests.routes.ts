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

router.post(
  '/cancel_request/:requestId',
  auth(USER_ROLE.driver),
  RequestController.cancelRequest,
);

router.get(
  '/find_by_all_cancel_request',
  auth(USER_ROLE.driver),
  RequestController.findByAllCancelRequst,
);

// accepted request router
router.post(
  '/accepted_request/:requestId',
  auth(USER_ROLE.driver),
  RequestController.acceptedRequest,
);

// find by the all remaing  requst ----> specific driver ways
router.get(
  '/find_by_all_remaining_request',
  auth(USER_ROLE.driver),
  RequestController.findByAllRemainingTripe,
);

//completed request router ------> driver section

router.post(
  '/completed_request/:requestId',
  auth(USER_ROLE.driver),
  RequestController.completedTripeRequest,
);

// find by the all completed tripe request

router.get(
  '/find_by_all_completed_tripe',
  auth(USER_ROLE.driver),
  RequestController.findByAllCompletedTripe,
);
// find by the driver  dashboard

router.get(
  '/driver_dashboard',
  auth(USER_ROLE.driver),
  RequestController.driver_dashboard,
);

// find by specific user upcomming history

router.get(
  '/find_by_all_upcomming_history',
  auth(USER_ROLE.driver, USER_ROLE.user),
  RequestController.user_upcomming_history,
);

//find by the specifc user complted tripe history

router.get(
  '/find_by_all_completed_tripe_history',
  auth(USER_ROLE.user),
  RequestController.completed_history,
);

// user cancel tripe

router.post(
  '/user_cancel_tripe/:requestId',
  auth(USER_ROLE.user),
  RequestController.user_cancel_tripe_request,
);


router.get("/cancel_user_tripe_history", auth(USER_ROLE.user), RequestController.cancel_user_history)



const RequestRoutes = router;
export default RequestRoutes;
