import { RequestHandler } from 'express';
import catchAsync from '../../utility/catchAsync';
import drivers_transaction_server from './drivers_transaction_info.services';
import sendRespone from '../../utility/sendRespone';
import httpStatus from 'http-status';

const findByA_all_transaction: RequestHandler = catchAsync(async (req, res) => {
  const result =
    await drivers_transaction_server.findByA_all_transactionin_IntoDb(
      req.query,
    );

  sendRespone(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Successfully Driver Verification Record ',
    data: result,
  });
});


const  delete_transaction:RequestHandler=catchAsync(async(req , res)=>{

     const result=await drivers_transaction_server.delete_transaction_intodb(req.params.id);
     sendRespone(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Successfully Delete Transaction Details ',
      data: result,
    });

});

const drivers_transaction_controller = {
  findByA_all_transaction,
  delete_transaction
};

export default drivers_transaction_controller;
