import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import SelectTruckServices from './select_truck.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const createSelectTruck: RequestHandler = catchAsync(async (req, res) => {
  const result = await SelectTruckServices.createSelectTruckIntoDb(
    req as any,
    req.user.id,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully Added the Truck Services',
    data: result,
  });
});

const findAllTruckByAdmin: RequestHandler = catchAsync(async (req, res) => {
  const result = await SelectTruckServices.findAllTruckByAdminIntoDb(req.query);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully All selected truck ',
    data: result,
  });
});

const findAllTruckByDriver: RequestHandler = catchAsync(async (req, res) => {
  const result = await SelectTruckServices.findAllTruckByDriverIntoDb(
    req.query,
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully find All selected truck ',
    data: result,
  });
});

const findBySpecificSelectedTruck: RequestHandler = catchAsync(
  async (req, res) => {
    const result = await SelectTruckServices.findBySpecificSelectedTruckIntoDb(
      req.params.id,
    );
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfully find Specific selected truck ',
      data: result,
    });
  },
);

const update_selected_truck: RequestHandler = catchAsync(async (req, res) => {
  const result = await SelectTruckServices.update_selected_truckIntoDb(
    req as any, req.params.id
  );
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully update selected truck ',
    data: result,
  });
});

const SelectTruckController = {
  createSelectTruck,
  findAllTruckByAdmin,
  findBySpecificSelectedTruck,
  findAllTruckByDriver,
  update_selected_truck,
};

export default SelectTruckController;
