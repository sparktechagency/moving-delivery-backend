import { aboutus } from './settings.modal';
import httpStatus from 'http-status';
import { TAboutUs } from './settings.interface';
import ApiError from '../../app/error/ApiError';

const updateAboutUsIntoDb = async (payload: TAboutUs) => {
  try {
    const aboutText = payload.aboutUs?.trim() ?? "";

    if (!aboutText) {
      await aboutus.deleteMany();
      return { status: true, message: "AboutUs content cleared successfully" };
    }
    const result = await aboutus.findOneAndUpdate(
      {},
      { aboutUs: aboutText, isDelete: payload.isDelete ?? false },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return result
      ? { status: true, message: "AboutUs successfully saved" }
      : { status: false, message: "Failed to save AboutUs" };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update AboutUs in DB",
      error
    );
  }
};


const findByAboutUsIntoDb = async () => {
  try {
    const result = await aboutus
      .findOne()
      .select('-isDelete -createdAt -updatedAt');

    return result;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update about into db',
      error,
    );
  }
};

const AboutServices = {
  updateAboutUsIntoDb,
  findByAboutUsIntoDb,
};

export default AboutServices;
