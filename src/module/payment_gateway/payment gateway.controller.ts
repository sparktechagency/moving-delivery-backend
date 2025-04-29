import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utility/catchAsync';
import sendRespone from '../../utility/sendRespone';
import PaymentGateWayServices from './payment gateway.services';

const create_payment_init: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGateWayServices.createPaymentIntent(req.body);

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfully Create Payment Init',
    data: result,
  });
});

const payment_webhook_events: RequestHandler = catchAsync(async (req, res) => {
  const result = await PaymentGateWayServices.handleWebhookEvent(req.body);
  sendRespone(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Successfull Payment Webhook Events',
    data: result,
  });
});

const driver_Account_For_Payment: RequestHandler = catchAsync(
  async (req, res) => {
    const result = await PaymentGateWayServices.createDriverAccountAndOnBoardLink(req.body);

    sendRespone(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Successfull add driver account',
      data: result,
    });
  },
);

const PaymentGateWayController = {
  create_payment_init,
  payment_webhook_events,
  driver_Account_For_Payment,
};

export default PaymentGateWayController;
