import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import drivers_transaction_controller from './drivers_transaction_info.controller';

const route = express.Router();

route.get(
  '/find_by_all_transaction_info',
  
  drivers_transaction_controller.findByA_all_transaction,
);

route.delete('/delete_transaction/:id',drivers_transaction_controller.delete_transaction);

const drivers_transaction_router = route;

export default drivers_transaction_router;
