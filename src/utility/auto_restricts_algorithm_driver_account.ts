import httpStatus, { REQUESTED_RANGE_NOT_SATISFIABLE } from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../app/error/ApiError';
import notifications from '../module/notification/notification.modal';
import stripepaymentgateways from '../module/payment_gateway/payment gateway.model';
import requests from '../module/requests/requests.model';
import { payment_status } from '../module/payment_gateway/payment gateway.constant';
import NotificationServices from '../module/notification/notification.services';
import User from '../module/user/user.model';
import { USER_ACCESSIBILITY } from '../module/user/user.constant';
import driververifications from '../module/driver_verification/driver_verification.model';

/**
 * Auto restrict driver accounts with payment issues
 * Implements transaction rollback for data integrity
 */
const auto_restricts_algorithm_driver_account = async () => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const currentTime = new Date();

    // Threshold for initial payment notification - 3 days, 23 hours, 50 minutes ago
    const timeThreshold = new Date(
      currentTime.getTime() -
        (3 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 50 * 60 * 1000),
    );

    // Threshold for account restriction - 4 days after notification
    const restrictionThreshold = new Date(
      currentTime.getTime() - 4 * 24 * 60 * 60 * 1000,
    );

    const acceptedRequestPaymentIssues = await requests
      .find(
        {
          isAccepted: true,
          isCompleted: false,
          isRemaining: false,
          isDelete: false,
          createdAt: { $lt: timeThreshold },
        },
        { _id: 1, driverVerificationsId: 1, driverId: 1, userId: 1 },
      )
      .lean();

    if (acceptedRequestPaymentIssues.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return {
        deletedCount: 0,
        message: 'No accepted but payment issues request to delete',
      };
    }

    const requestIds = acceptedRequestPaymentIssues?.map((requestId) => {
      return {
        requestId: requestId._id,
        driverVerificationsId: requestId.driverVerificationsId,
        driverId: requestId.driverId,
        userId: requestId.userId,
      };
    });

    const results = {
      notificationsSent: 0,
      accountsRestricted: 0,
      failed: 0,
    };

    for (const request of requestIds) {

      const requestSession = await mongoose.startSession();
      requestSession.startTransaction();

      try {
        const paymentExists = await stripepaymentgateways
          .findOne({
            requestId: request.requestId,
            payment_status: payment_status.unpaid,
          })
          .lean();

        if (!paymentExists) {
          const existingNotification: any = await notifications
            .findOne(
              {
                driverId: request.driverId,
                requestId: request.requestId,
              },
              {
                createdAt: 1,
              },
            )
            .sort({ createdAt: -1 })
            .lean();

          // If notification was sent more than 4 days ago, restrict the account
          if (
            existingNotification &&
            new Date(existingNotification?.createdAt) < restrictionThreshold
          ) {
            // 1. Update User status to "Blocked"
            const userUpdate = await User?.findByIdAndUpdate(
              request.userId,
              { status: USER_ACCESSIBILITY.blocked },
              { new: true, session: requestSession },
            );

            if (!userUpdate) {
              throw new ApiError(
                httpStatus.NOT_FOUND,
                'User not found during block operation',
                '',
              );
            }

            // 2. Update driver verification fields
            const driverVerificationUpdate =
              await driververifications?.findOneAndUpdate(
                { _id: request.driverVerificationsId },
                {
                  isVerifyDriverNid: false,
                  isReadyToDrive: false,
                },
                { new: true, session: requestSession },
              );

            if (!driverVerificationUpdate) {
              throw new ApiError(
                httpStatus.NOT_FOUND,
                'Driver verification record not found',
                '',
              );
            }

            // 3. Send restriction notification
            const restrictionData = {
              title: 'Account Blocked Notification',
              content:
                'Your account has been blocked due to unpaid balance. Please contact support to resolve this issue.',
              time: new Date(),
            };

            const restrictionNotification = new notifications({
              driverId: request.driverId,
              requestId: request.requestId,
              title: restrictionData.title,
              content: restrictionData.content,
              createdAt: restrictionData.time,
            });

            await restrictionNotification.save({ session: requestSession });

            const notificationSent =
              await NotificationServices.sendPushNotification(
                request.driverId?.toString() as string,
                restrictionData,
              );

            if (!notificationSent) {
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                'Failed to send restriction notification',
                '',
              );
            }

            results.accountsRestricted++;
          } else if (!existingNotification) {
            const data = {
              title: 'Payment Iusses Notification',
              content: `Next 4 days if you not provided remaining balance, your account and algorithm searching will be automatically restricted`,
              time: new Date(),
            };

            const notificationsBuilder = new notifications({
              driverId: request.driverId,
              requestId: request.requestId,
              title: data.title,
              content: data.content,
              createdAt: data.time,
            });

            const storeNotification = await notificationsBuilder.save({
              session: requestSession,
            });

            if (!storeNotification) {
              throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                'Failed to store notification',
                '',
              );
            };

            // const sendNotification =
            //   await NotificationServices.sendPushNotification(
            //     request.driverId?.toString() as string,
            //     data,
            //   );

            // if (!sendNotification) {
            //   throw new ApiError(
            //     httpStatus.INTERNAL_SERVER_ERROR,
            //     'Failed to send push notification',
            //     '',
            //   );
            // }

            results.notificationsSent++;
          }
        }

        await requestSession.commitTransaction();
        requestSession.endSession();
      } catch (requestError: any) {
        await requestSession.abortTransaction();
        requestSession.endSession();

        results.failed++;
        console.error(
          `Error processing request ${request.requestId}:`,
          requestError,
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return {
      notificationsSent: results.notificationsSent,
      accountsRestricted: results.accountsRestricted,
      failed: results.failed,
      message: 'Payment notifications and account restrictions processed',
    };
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'auto_restricts_algorithm_driver_account cron under issues',
      error,
    );
  }
};

export default auto_restricts_algorithm_driver_account;
