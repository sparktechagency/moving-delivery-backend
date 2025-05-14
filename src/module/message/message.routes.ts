import express, { NextFunction, Request, Response } from 'express';

import { USER_ROLE } from '../user/user.constant';
import MessageController from './message.controller';
import auth from '../../middleware/auth';
import upload from '../../utility/uplodeFile';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import validationRequest from '../../middleware/validationRequest';
import MessageValidationSchema from './message.zod.validation';

const router = express.Router();

router.get(
  '/get-messages/:userId',
  auth(USER_ROLE.user),
  MessageController.getMessages,
);

router.post(
  '/new_message',
  auth(USER_ROLE.user, USER_ROLE.driver),
  upload.fields([
    { name: 'videoUrl', maxCount: 2 },
    { name: 'imageUrl', maxCount: 5 },
  ]),
  (req: Request, _res: Response, next: NextFunction) => {
     try {
    if (req.body.data && typeof req.body.data === 'string') {
      req.body = JSON.parse(req.body.data);
    }
    
    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    console.log(files?.imageUrl);

    // Handle image uploads if they exist
    if (files?.imageUrl) {
      // Store paths of uploaded images
      req.body.imageUrl = files.imageUrl.map(file => file.path);
    }

    // Handle video uploads if they exist
    if (files?.videoUrl) {
      // Store paths of uploaded videos
      req.body.videoUrl = files.videos.map(file => file.path);
    }

    next();
  } catch (error: any) {
    next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
  }
  },
  validationRequest(MessageValidationSchema.messageSchema),
  MessageController.new_message,
);

const messageRoutes = router;

export default  messageRoutes;
