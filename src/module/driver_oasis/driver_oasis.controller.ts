import { RequestHandler } from "express";
import catchAsync from "../../utility/catchAsync";
import DriverOasisServices from "./driver_oasis.services";
import sendRespone from "../../utility/sendRespone";
import httpStatus from "http-status";



const createDriverOasis:RequestHandler=catchAsync(async(req , res)=>{

    const result=await DriverOasisServices.createDriverOasisIntoDb(req.body,req.user.id);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'Successfully create driver oassis ',
        data: result,
      });
});

const  findByAllDriverOasisAdmin:RequestHandler=catchAsync(async(req , res)=>{

    const result=await DriverOasisServices.findByAllDriverOasisAdminIntoDb(req.query);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully find by all  driver oassis ',
        data: result,
      });

});

const  findByAllDriverOasisDriver:RequestHandler=catchAsync(async(req , res)=>{
    const result=await  DriverOasisServices.findByAllDriverOasisDriverIntoDb(req.query);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully find by all  driver oassis ',
        data: result,
      });

});

const findBySpecificOasisDriver:RequestHandler=catchAsync(async(req, res)=>{

    const result=await DriverOasisServices.findBySpecificOasisDriverIntoDb(req.params.id);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully find by specifc  driver oassis ',
        data: result,
      });

});

const  updateOasisDriver:RequestHandler=catchAsync(async(req , res)=>{

    const result=await DriverOasisServices.updateOasisDriverIntoDb(req.body, req.params.id);

    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully Update Driver Oassis ',
        data: result,
      });


});


const  deleteOasisDriver:RequestHandler=catchAsync(async(req , res)=>{

    const result=await DriverOasisServices.deleteOasisDriverIntoDb(req.params.id);
    sendRespone(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Successfully delete Driver Oassis ',
        data: result,
      });


})

const DriverOasisController={
    createDriverOasis,
    findByAllDriverOasisAdmin,
    findByAllDriverOasisDriver,
    findBySpecificOasisDriver,
    updateOasisDriver,
    deleteOasisDriver
};

export default DriverOasisController;