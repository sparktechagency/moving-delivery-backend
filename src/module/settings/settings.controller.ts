import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import AboutServices from './settings.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const updateAboutUs: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.updateAboutUsIntoDb(req.body);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Updated ',
    data: result,
  });
});

const findByAboutUs: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.findByAboutUsIntoDb();
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find AboutUs',
    data: result,
  });
});

const AboutController = {
  updateAboutUs,
  findByAboutUs,
};

export default AboutController;
