import express, { NextFunction, Request, Response } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';
import SelectTruckValidationSchema from './select_truck.zod.validation';
import SelectTruckController from './select_truck.controller';
import users from '../user/user.model';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';

const router = express.Router();
router.post(
  '/create_select_trueck',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', ''));
    }
  },

  validationRequest(SelectTruckValidationSchema.selectTruckSchema),
  SelectTruckController.createSelectTruck,
);

router.get(
  '/find_by_all_selected_truck_by_driver',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin, USER_ROLE.driver),
  SelectTruckController.findAllTruckByDriver,
);

router.get(
  '/find_by_all_selected_truck_by_admin',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  SelectTruckController.findAllTruckByAdmin,
);

router.get(
  '/find_by_specific_selcted_truck/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  SelectTruckController.findBySpecificSelectedTruck,
);

router.patch(
  '/update_select_truck/:id',
  auth(USER_ROLE.admin, USER_ROLE.superAdmin),
  upload.single('file'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }
      next();
    } catch (error) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', ''));
    }
  },
  validationRequest(SelectTruckValidationSchema.UpdateselectTruckSchema),
  SelectTruckController.update_selected_truck,
);

const SelectTruckRouter = router;

export default SelectTruckRouter;
