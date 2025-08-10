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

const privacyPolicys: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.privacyPolicysIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Recorded',
    data: result,
  });
});

const findByPrivacyPolicyss: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.findByPrivacyPolicyssIntoDb();
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find By Privacy Policy ',
    data: result,
  });
});

const termsConditions: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.termsConditionsIntoDb(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully  Recorded',
    data: result,
  });
});

const findByTermsConditions: RequestHandler = catchAsync(async (req, res) => {
  const result = await AboutServices.findBytermsConditionsIntoDb();
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Find By Terms Conditions ',
    data: result,
  });
});

const SettingController = {
  updateAboutUs,
  findByAboutUs,
  privacyPolicys,
  findByPrivacyPolicyss,
  termsConditions,
  findByTermsConditions,
};

export default SettingController;
