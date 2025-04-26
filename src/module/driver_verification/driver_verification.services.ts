import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import driververifications from './driver_verification.model';
import fs from 'fs/promises';
import {
  DriverData,
  DriverVerificationResponse,
  DriverWithMetrics,
  RequestWithMultipleFiles,
  UserLocation,
} from './driver_verification.interface';
import QueryBuilder from '../../app/builder/QueryBuilder';

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

const findByDriverVerifictionAdminIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {
    const allDriverVerificationQuery = new QueryBuilder(
      driververifications
        .find()
        .populate('userId', {
          name: 1,
          email: 1,
          phoneNumber: 1,
        })
        .populate('driverSelectedTruck', {
          truckcategories: 1,
          photo: 1,
        }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const all_driver_verification = await allDriverVerificationQuery.modelQuery;
    const meta = await allDriverVerificationQuery.countTotal();

    return { meta, all_driver_verification };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'findByDriverVerifictionAdminIntoDb server unavailable',
      error?.message || error,
    );
  }
};

const findBySpecificDriverVerificationIntoDb = async (id: string) => {
  try {
    return await driververifications.isDriverVerificationExistByCustomId(id);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'find By Specific Drive rVerification IntoDb verification service unavailable',
      error,
    );
  }
};

const updateDriverVerificationIntoDb = async (
  req: Request,
  id: string,
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
          { _id: id },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1 },
    );

    if (!isDriverVerificationExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'driver is not verified ', '');
    }

    const result = await driververifications.findByIdAndUpdate(id, data, {
      new: true,
      upsert: true,
    });

    return (
      result && {
        status: true,
        message: 'successfully updated driver verification profile',
      }
    );
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'update driver verificationIntoDb service unavailable',
      error,
    );
  }
};

/**
 * It is possible that the app will automatically detect the driver's live location
 * @param payload
 * @param userId
 * @returns
 */
const detected_Driver_Auto_Live_Location_IntoDb = async (
  payload: any,
  userId: string,
): Promise<DriverVerificationResponse> => {
  try {
    const coordinates = payload.autoDetectLocation;

    if (!coordinates) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates parameter is missing',
        '',
      );
    }
    if (!Array.isArray(coordinates)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates must be an array',
        '',
      );
    }

    if (coordinates.length === 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Coordinates array cannot be empty',
        '',
      );
    }

    if (!userId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required', '');
    }

    const query = {
      userId,
      isDelete: false,
      isReadyToDrive: true,
      isVerifyDriverLicense: true,
      isVerifyDriverNid: true,
    };

    const result = await driververifications.findOneAndUpdate(
      query,
      { $set: { autoDetectLocation: coordinates } },
      { new: true },
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        'Driver verification record not found or not eligible',
        '',
      );
    }

    return {
      status: true,
      message: 'Successfully recorded live location',
    };
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'Location update service is temporarily unavailable',
      error,
    );
  }
};

const deleteDriverVerificationIntoDb = async (
  id: string,
): Promise<DriverVerificationResponse> => {
  try {
    const isDriverVerificationExist = await driververifications.findOne(
      {
        $and: [
          { _id: id },
          { isDelete: false },
          { isReadyToDrive: true },
          { isVerifyDriverLicense: true },
          { isVerifyDriverNid: true },
        ],
      },
      { _id: 1 },
    );

    if (!isDriverVerificationExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'driver is not verified ', '');
    }

    //  started delete  code in this section

    return {
      status: true,
      message: 'successfully updated driver verification profile',
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'delete driver verificationI ntoDb service unavailable',
      error,
    );
  }
};


//  started 

// User location data
const userLocation: UserLocation = {
  from: {
      address: "1600 Amphitheatre Parkway, Mountain View AD",
      coordinates: [-122.083851, 37.423021]
  },
  to: {
      address: "1 Infinite Loop, Cupertino, CA",
      coordinates: [-122.032182, 37.331741]
  }
};

// Driver data (would normally come from database)
const driverData: DriverData = {
  success: true,
  message: "Successfully Find Available druck driver list Lists",
  data: [
      {
          "_id": "680a9b10700c9865b213eab6",
          "driverSelectedTruck": {
              "_id": "68029fecf2bd4d633ae60ea7",
              "truckcategories": "tranker Truck",
              "photo": "src\\public\\images\\bangladesh-h1-streamlining-construction-logistics-how-tipper-trucks-simplify-material-transport-20240828.jpg-3597cd54-0fe9-4a8a-89b7-4d803b9e4959.webp"
          },
          "autoDetectLocation": ["-73.9375", "40.8303"],
          "id": "680a9b10700c9865b213eab6"
      },
      {
          "_id": "680aae7571a03ed430d5f79d",
          "driverSelectedTruck": {
              "_id": "6802a050db69c50f50d33af1",
              "truckcategories": "small truck",
              "photo": "src\\public\\images\\images-bda382fc-a163-47df-adff-17d661343eb4.jpg"
          },
          "autoDetectLocation": ["-73.9375", "40.8303"],
          "id": "680aae7571a03ed430d5f79d"
      },
      {
          "_id": "680d216b84ee8ab2e0c833a2",
          "driverSelectedTruck": {
              "_id": "68035cf3eca764a41e8fd221",
              "truckcategories": "dummy truckL",
              "photo": "src\\public\\images\\truck-pictures-2arrdpurjxr3cyu7-1c06aee7-3604-49ee-820b-b3e1cbb6c093.jpg"
          },
          "autoDetectLocation": ["-118.3292", "34.0522"],
          "id": "680d216b84ee8ab2e0c833a2"
      },
      {
          "_id": "680d229de68fff677b656e96",
          "driverSelectedTruck": {
              "_id": "6802a079d4376e04ecdb22fa",
              "truckcategories": "logging truck",
              "photo": "src\\public\\images\\images-9a72cd2c-2170-4c87-97c4-be4a936ae970.jpg"
          },
          "autoDetectLocation": ["-97.7431", "30.2672"],
          "id": "680d229de68fff677b656e96"
      },
      {
          "_id": "680d23adc5bcac5fbb8b4465",
          "driverSelectedTruck": {
              "_id": "68035cf3eca764a41e8fd221",
              "truckcategories": "dummy truckL",
              "photo": "src\\public\\images\\truck-pictures-2arrdpurjxr3cyu7-1c06aee7-3604-49ee-820b-b3e1cbb6c093.jpg"
          },
          "autoDetectLocation": ["-122.3321", "47.6062"],
          "id": "680d23adc5bcac5fbb8b4465"
      },
      {
          "_id": "680d24844e15f72b68d4726a",
          "driverSelectedTruck": {
              "_id": "68029fecf2bd4d633ae60ea7",
              "truckcategories": "tranker Truck",
              "photo": "src\\public\\images\\bangladesh-h1-streamlining-construction-logistics-how-tipper-trucks-simplify-material-transport-20240828.jpg-3597cd54-0fe9-4a8a-89b7-4d803b9e4959.webp"
          },
          "autoDetectLocation": ["-84.3877", "33.749"],
          "id": "680d24844e15f72b68d4726a"
      },
      {
          "_id": "680d25b24e15f72b68d4726f",
          "driverSelectedTruck": {
              "_id": "680347c0867b18b5711c53a9",
              "truckcategories": "dummy trucks",
              "photo": "src\\public\\images\\truck-pictures-2arrdpurjxr3cyu7-e6000ea9-6376-406f-9d29-6d8ade3de24f.jpg"
          },
          "autoDetectLocation": ["-73.9712", "40.7831"],
          "id": "680d25b24e15f72b68d4726f"
      }
  ]
};


function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}


// Function to calculate estimated duration based on distance
function calculateEstimatedDuration(distanceKm: number): number {
  // Average speed in km/h (adjust based on your requirements)
  const averageSpeed = 50;
  const durationHours = distanceKm / averageSpeed;
  return durationHours * 60; // Convert to minutes
}

// Function to determine bearing between two points
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = (θ*180/Math.PI + 360) % 360;
  
  return bearing;
}



function getRouteType(distanceKm: number): string {
  if (distanceKm < 5) return "short";
  if (distanceKm < 20) return "medium";
  return "long";
}

// Main function to find nearest drivers
async function findNearestDrivers(): Promise<DriverWithMetrics[]> {
  const destination = userLocation.to.coordinates;
  const destLat = destination[1];
  const destLng = destination[0];
  
  const driversWithMetrics: DriverWithMetrics[] = driverData.data.map(driver => {
      const driverLat = parseFloat(driver.autoDetectLocation[1]);
      const driverLng = parseFloat(driver.autoDetectLocation[0]);
      
      const distanceKm = calculateDistance(driverLat, driverLng, destLat, destLng);
      const estimatedDurationMin = calculateEstimatedDuration(distanceKm);
      const bearingDegrees = calculateBearing(driverLat, driverLng, destLat, destLng);
      const routeType = getRouteType(distanceKm);
      
      return {
          driverId: driver.id,
          truckType: driver.driverSelectedTruck.truckcategories,
          distanceKm: distanceKm.toFixed(2),
          estimatedDurationMin: estimatedDurationMin.toFixed(1),
          bearingDegrees: bearingDegrees.toFixed(1),
          routeType: routeType,
          driverLocation: driver.autoDetectLocation,
          truckPhoto: driver.driverSelectedTruck.photo
      };
  });
  
  driversWithMetrics.sort((a, b) => parseFloat(a.distanceKm) - parseFloat(b.distanceKm));
  
  return driversWithMetrics;
};



const searching_for_available_trip_truck_listsIntoDb = async (payload: any) => {
  try {
    const findAllDrivers = await driververifications
      .find({})
      .populate('driverSelectedTruck', {
        truckcategories: 1,
        photo: 1,
      }).select({
        autoDetectLocation:1
      });
    return findAllDrivers;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      'searching_for_available_trip_truck_lists Into Db server unavailable ',
      error,
    );
  }
};
const DriverVerificationServices = {
  recordDriverVerificationIntoDb,
  findByDriverVerifictionAdminIntoDb,
  findBySpecificDriverVerificationIntoDb,
  updateDriverVerificationIntoDb,
  detected_Driver_Auto_Live_Location_IntoDb,
  deleteDriverVerificationIntoDb,
  searching_for_available_trip_truck_listsIntoDb,
};

export default DriverVerificationServices;
