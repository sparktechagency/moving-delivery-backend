import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import validationRequest from '../../middleware/validationRequest';

import AboutController from './settings.controller';
import settingValidationSchema from './settings.validation';

const routes = express.Router();

routes.post(
  '/about',
  auth(USER_ROLE.admin),
  validationRequest(settingValidationSchema.AboutValidationSchema),
  AboutController.updateAboutUs,
);

routes.get('/find_by_about_us', AboutController.findByAboutUs);

const SettingsRoutes = routes;

export default SettingsRoutes;
