import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import driververifications from './driver_verification.model';
import fs from 'fs/promises';
import {
  DriverVerificationResponse,
  RequestWithMultipleFiles,
} from './driver_verification.interface';

/**
 * @param req
 * @param userId
 * @returns
 */
const recordDriverVerificationIntoDb = async (
  req: RequestWithMultipleFiles,
  userId: string,
): Promise<DriverVerificationResponse> => {
  try {
    const data = req.body;
    if (!data) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Driver verification data is required',
        '',
      );
    }

    const isDriverVerificationExist = await driververifications.findOne(
      {
        $and: [
          { userId },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1, driverLicense: 1, driverNidCard: 1 },
    );

    if (isDriverVerificationExist) {
      try {
        if (isDriverVerificationExist?.driverLicense) {

          const licenseExists = await fileExists(
            isDriverVerificationExist.driverLicense,
          );
          if (licenseExists) {
            await fs.unlink(isDriverVerificationExist.driverLicense);
          }
        }

        if (isDriverVerificationExist?.driverNidCard) {
          const nidExists = await fileExists(
            isDriverVerificationExist.driverNidCard,
          );
          if (nidExists) {
            await fs.unlink(isDriverVerificationExist.driverNidCard);
          }
        }
      } catch (fileError: any) {
        throw new ApiError(
          httpStatus.NOT_EXTENDED,
          'Error while deleting files',
          fileError,
        );
      }

      throw new ApiError(
        httpStatus.CONFLICT,
        'Driver verification already exists for this user',
        '',
      );
    }

    const driverVerificationDoc = new driververifications({
      ...data,
      userId,
    });

    await driverVerificationDoc.save();

    return {
      status: true,
      message: 'Driver verification data successfully recorded',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Driver verification service unavailable',
      error,
    );
  }
};

/**

 * @param filePath 
 * @returns 
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const DriverVerificationServices = {
  recordDriverVerificationIntoDb,
};

export default DriverVerificationServices;
