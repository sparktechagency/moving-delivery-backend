
import drivertransactionInfos from './drivers_transaction_info.model';
import ApiError from '../../app/error/ApiError';
import httpStatus from 'http-status';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { DriverTransactionResponse } from './drivers_transaction_info.interface';
import { driver_transaction_search } from './drivers_transaction_info.constant';

const findByA_all_transactionin_IntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const allTransactionQuery = new QueryBuilder(
      drivertransactionInfos.find().populate('driverId', {
        name: 1,
        email: 1,
        stripeAccountId: 1,
      }),

      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields().search(driver_transaction_search);

    const allTransaction = await allTransactionQuery.modelQuery;
    const meta = await allTransactionQuery.countTotal();

    return { meta, allTransaction };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'issus by the server unavalable',
      error,
    );
  }
};

const delete_transaction_intodb = async (
  transactionId: string,
): Promise<DriverTransactionResponse> => {
  try {
    const result =
      await drivertransactionInfos.findByIdAndDelete(transactionId);
    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'issues by the delete specific transaction',
        '',
      );
    }

    return {
      status: true,
      message: 'successfully delete transaction information',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'issus by the  delete_transaction into db server unavalable',
      error,
    );
  }
};

const drivers_transaction_server = {
  findByA_all_transactionin_IntoDb,
  delete_transaction_intodb,
};

export default drivers_transaction_server;
