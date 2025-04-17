import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import SelectTruckServices from './select_truck.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const createSelectTruck: RequestHandler = catchAsync(async (req, res) => {
  const result = await SelectTruckServices.createSelectTruckIntoDb(
    req.body,
    req.user.id,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Added the Truck Services',
    data: result,
  });
});

const SelectTruckController = {
  createSelectTruck,
};

export default SelectTruckController;
