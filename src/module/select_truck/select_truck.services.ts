import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { TSelectTruck } from './select_truck.interface';
import selecttrucks from './select_truck.model';
import QueryBuilder from '../../app/builder/QueryBuilder';
import { select_truck_search_filed } from './select_truck.constant';

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

interface CreateSelectedTruckResponse {
  status: boolean;
  message: string;
}

const createSelectTruckIntoDb = async (
  req: RequestWithFile,
  userId: string,
): Promise<CreateSelectedTruckResponse> => {
  try {
    const file = req.file;
    const { truckcategories } = req.body as { truckcategories?: string };

    const createSelectTruck: { truckcategories?: string; photo?: string } = {};
    createSelectTruck.truckcategories = truckcategories;
    createSelectTruck.photo = file?.path;

    const select_truck_builder = new selecttrucks({
      ...createSelectTruck,
      userId,
    });
    const result = await select_truck_builder.save();

    // Fix potential undefined return - ensure we always return a CreateSelectedTruckResponse
    return result
      ? { status: true, message: 'successfully create selected truck' }
      : { status: false, message: 'failed to create selected truck' };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'create selected truck server unavailable',
      error,
    );
  }
};

const findAllTruckByAdminIntoDb = async (query: Record<string, unknown>) => {
  try {
    const fileFolderQuery = new QueryBuilder(
      selecttrucks.find().populate('userId', {
        name: 1,
        email: 1,
        phoneNumber: 1,
      }),
      query,
    )
      .search(select_truck_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_selected_truck = await fileFolderQuery.modelQuery;
    const meta = await fileFolderQuery.countTotal();

    return { meta, all_selected_truck };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findAllTruckByAdminIntoDb server unavailable',
      error,
    );
  }
};

const findAllTruckByDriverIntoDb = async (query: Record<string, unknown>) => {
  try {
    const fileFolderQuery = new QueryBuilder(selecttrucks.find(), query)
      .search(select_truck_search_filed)
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_selected_truck = await fileFolderQuery.modelQuery;
    const meta = await fileFolderQuery.countTotal();

    return { meta, all_selected_truck };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findAllTruckByDriverIntoDb server unavailable',
      error,
    );
  }
};

const findBySpecificSelectedTruckIntoDb = async (id: string) => {
  try {
    return await selecttrucks.isSelectTruckExistByCustomId(id);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findBySpecificSelectedTruckIntoDb server unavailable',
      error,
    );
  }
};

const update_selected_truckIntoDb = async (
  req: RequestWithFile,
  id: string,
): Promise<CreateSelectedTruckResponse> => {
  try {
    const file = req.file;
    const { truckcategories } = req.body as { truckcategories?: string };
    const updateData: { truckcategories?: string; photo?: string } = {};

    if (truckcategories) {
      updateData.truckcategories = truckcategories;
    }

    if (file) {
      updateData.photo = file.path;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No data provided for update',
        '',
      );
    }

    if (truckcategories) {
      const existingTruck = await selecttrucks.findOne(
        {
          _id: id,
        },
        { _id: 1 },
      );

      if (!existingTruck) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `A truck with category not "${truckcategories}" already exists`,
          '',
        );
      }
    }

    const result = await selecttrucks.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Selected truck not found', '');
    }

    return {
      status: true,
      message: 'Successfully updated truck',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'update_selected_truckIntoDb server unavailable',
      error,
    );
  }
};
const SelectTruckServices = {
  createSelectTruckIntoDb,
  findAllTruckByAdminIntoDb,
  findBySpecificSelectedTruckIntoDb,
  findAllTruckByDriverIntoDb,
  update_selected_truckIntoDb,
};

export default SelectTruckServices;
