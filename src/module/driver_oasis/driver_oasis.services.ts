import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { TDriverOasis } from './driver_oasis.interface';
import driveroasiss from './driver_oasis.model';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { driver_oasiss_search_filed } from './driver_oasis.constant';

interface DriverOasisResponse {
  status: boolean;
  message: string;
}

const createDriverOasisIntoDb = async (
  payload: TDriverOasis,
  userId: string,
): Promise<DriverOasisResponse> => {
  try {
    const driverOassisBuilder = new driveroasiss({ ...payload, userId });
    const result = await driverOassisBuilder.save();
    return result && { status: true, message: 'successfully recorded' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'createDriverOasisIntoDb  server unavailable',
      '',
    );
  }
};

const findByAllDriverOasisAdminIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const driverOassisQuery = new QueryBuilder(
      driveroasiss.find().populate('userId', {
        name: 1,
        email: 1,
        phoneNumber: 1,
      }),
      query,
    )
      .search(driver_oasiss_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_driver_oasis = await driverOassisQuery.modelQuery;
    const meta = await driverOassisQuery.countTotal();

    return { meta, all_driver_oasis };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findByAllDriverOasisAdminIntoDb server unavailable',
      error,
    );
  }
};

const findByAllDriverOasisDriverIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const driverOassisQuery = new QueryBuilder(driveroasiss.find(), query)
      .search(driver_oasiss_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_driver_oasis = await driverOassisQuery.modelQuery;
    const meta = await driverOassisQuery.countTotal();

    return { meta, all_driver_oasis };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findByAllDriverOasisAdminIntoDb server unavailable',
      error,
    );
  }
};

const findBySpecificOasisDriverIntoDb = async (id: string) => {
  try {
    return await driveroasiss.isTDriverOasisExistByCustomId(id);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findBySpecificOasisDriverIntoDb server unavailable',
      error,
    );
  }
};

const updateOasisDriverIntoDb = async (
  payload: Partial<TDriverOasis>,
  id: string,
): Promise<DriverOasisResponse> => {
  try {
    const isExistOasisDriver =
      await driveroasiss.isTDriverOasisExistByCustomId(id);
    if (!isExistOasisDriver) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Oasis Driver IS NOT EXIST', '');
    }

    const result = await driveroasiss.findByIdAndUpdate(id, payload, {
      new: true,
      upsert: true,
    });
    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'issues by  the updateOasisDriverIntoDb',
        '',
      );
    }
    return (
      result && { status: true, message: 'successfully  update driver oassis' }
    );
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'updateOasisDriverIntoDb server unavailable',
      error,
    );
  }
};

const deleteOasisDriverIntoDb = async (id: string) => {
  try {
    const result = await driveroasiss.findByIdAndDelete(id);
    if (!result) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'iisues by the delete setion driver oasis',
        '',
      );
    }
    return result && { status: true, message: 'successfully delete' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      ' deleteOasisDriverIntoDb server unavailable',
      error,
    );
  }
};

const DriverOasisServices = {
  createDriverOasisIntoDb,
  findByAllDriverOasisAdminIntoDb,
  findByAllDriverOasisDriverIntoDb,
  findBySpecificOasisDriverIntoDb,
  updateOasisDriverIntoDb,
  deleteOasisDriverIntoDb,
};

export default DriverOasisServices;
