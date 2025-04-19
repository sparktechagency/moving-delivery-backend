import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import Driver_Oasis_Validation_Schema from './driver_oasis.zod.validation';
import DriverOasisController from './driver_oasis.controller';

const router = express.Router();

router.post(
  '/crerte_driver_oasis',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validationRequest(Driver_Oasis_Validation_Schema.driver_oasis_schema),
  DriverOasisController.createDriverOasis,
);

router.get(
  '/find_by_all_deriver_oassis_admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DriverOasisController.findByAllDriverOasisAdmin,
);

router.get(
  '/find_by_all_deriver_oassis_driver',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DriverOasisController.findByAllDriverOasisDriver,
);

router.get(
  '/find_by_specific_driver_oasis/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DriverOasisController.findBySpecificOasisDriver,
);

router.patch(
  '/update_oiasis_driver/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  validationRequest(Driver_Oasis_Validation_Schema.update_driver_oasis_schema),
  DriverOasisController.updateOasisDriver,
);

router.delete(
  '/delete_driver_oasis/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  DriverOasisController.deleteOasisDriver,
);

const DriverOasisRouter = router;

export default DriverOasisRouter;
