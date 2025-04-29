import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import PaymentGateWayServices from './payment gateway.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const create_payment_init: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGateWayServices.createPaymentIntent(
    req.body,
  );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Create Payment Init',
    data: result,
  });
});

const   payment_webhook_events:RequestHandler=catchAsync(async(req , res)=>{

     const  result=await PaymentGateWayServices.handleWebhookEvent(req.body);
     sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfull Payment Webhook Events',
      data: result,
    });

})


const PaymentGateWayController = {
  create_payment_init,
  payment_webhook_events
};

export default PaymentGateWayController;
