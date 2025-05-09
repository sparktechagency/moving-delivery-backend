import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';
import { payment_status } from '../module/payment_gateway/payment gateway.constant';
import stripepaymentgateways from '../module/payment_gateway/payment gateway.model';

/**
 * Handles identification and removal of unpaid payments that are approximately 23 hours and 50 minutes old
 * @returns {Promise<Object>} 
 */
const handle_unpaid_payment = async () => {
  try {
    const currentTime = new Date();
    const timeThreshold = new Date(
      currentTime.getTime() - (23 * 60 + 50) * 60 * 1000,
    );

    const unpaidPayments = await stripepaymentgateways
      .find(
        {
          payment_status: payment_status.unpaid,
          isDelete: false,
          createdAt: { $lt: timeThreshold },
        },
        { _id: 1 },
      )
      .lean();

    if (unpaidPayments.length === 0) {
      return { deletedCount: 0, message: 'No unpaid payments to delete' };
    }

    const paymentIds = unpaidPayments.map((payment) => payment._id);

    const deleteResult = await stripepaymentgateways.deleteMany({
      _id: { $in: paymentIds },
    });

    if (!deleteResult || deleteResult.deletedCount === 0) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete unpaid payments',
        '',
      );
    }
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'unpaid payment cron under issues ',
      error,
    );
  }
};

export default handle_unpaid_payment;
