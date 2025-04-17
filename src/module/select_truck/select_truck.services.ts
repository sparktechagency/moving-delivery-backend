import { TSelectTruck } from './select_truck.interface';

const createSelectTruckIntoDb = async (payload: TSelectTruck,userId:string) => {
  return payload;
};

const SelectTruckServices = {
    createSelectTruckIntoDb,
};

export default SelectTruckServices;
