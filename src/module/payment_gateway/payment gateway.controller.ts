import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import PaymentGatewayServices from './payment gateway.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const createConnectedAccountAndOnboardingLink: RequestHandler = catchAsync(
  async (req, res) => {
    const result =
      await PaymentGatewayServices.createConnectedAccountAndOnboardingLinkIntoDb(
        req.user,
      );

    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Link created successfully',
      data: result,
    });
  },
);

const updateOnboardingLink:RequestHandler=catchAsync(async(req , res)=>{

    const result=await PaymentGatewayServices.updateOnboardingLinkIntoDb(req.user.id);
    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message:  'Successfully Updating On Boarding Link',
      data: result,
    });
})



const PaymentGatewayController = {
  createConnectedAccountAndOnboardingLink,
  updateOnboardingLink
};

export default PaymentGatewayController;
