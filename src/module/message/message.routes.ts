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
  '/get-messages/:conversationId',
  auth(USER_ROLE.user),
  MessageController.getMessages,
);

router.post(
  '/new_message',
  auth(USER_ROLE.user, USER_ROLE.driver),
  upload.fields([{ name: 'imageUrl', maxCount: 5 }]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      // Handle image uploads if they exist
      if (files?.imageUrl) {
        // Store paths of uploaded images
        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(MessageValidationSchema.messageSchema),
  MessageController.new_message,
);

router.patch(
  '/update_message_by_Id/:messageId',
  auth(USER_ROLE.user, USER_ROLE.driver),
  upload.fields([{ name: 'imageUrl', maxCount: 5 }]),
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.body.data && typeof req.body.data === 'string') {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      if (files?.imageUrl) {
        req.body.imageUrl = files.imageUrl.map((file) =>
          file.path.replace(/\\/g, '/'),
        );
      }

      next();
    } catch (error: any) {
      next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON data', error));
    }
  },
  validationRequest(MessageValidationSchema.messageUpdateSchema),
  MessageController.updateMessageById,
);

router.delete(
  '/delete_message/:messageId',
  auth(USER_ROLE.user, USER_ROLE.driver),
  MessageController.deleteMessageById,
);

const messageRoutes = router;

export default messageRoutes;
