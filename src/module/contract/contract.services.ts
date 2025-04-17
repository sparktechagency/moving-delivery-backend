import httpStatus from 'http-status';
import ApiError from '../../app/error/ApiError';
import { TContract } from './contract.interface';
import { Contract } from './contract.model';

// create contract into db
const createContractIntoDb = async (payload: TContract) => {
  const buildInShoes = new Contract(payload);
  const result = await buildInShoes.save();
  return result;
};

// get contract all db
const AllContractIntoDb = async () => {
  const result = await Contract.find({}).sort({ isfavorite: -1 });
  return result;
};

// find sp[ecifiq contract into db
const SpecificContractIdIntoDb = async (id: string) => {
  const result = await Contract.findById(id);
  return result;
};

//updatecontract from db
const UpdateContractFromDb = async (
  id: string,
  payload: Partial<TContract>,
) => {
  const isExistUser = await Contract.findById(id);
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist in System', '');
  }
  const result = await Contract.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

//delete contract from db
const DeleteContractFromDb = async (id: string) => {
  const isExistUser = await Contract.findById(id);
  if (!isExistUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'User Not Exist in the System',
      '',
    );
  }

  const result = await Contract.updateOne({ _id: id }, { isDelete: true });
  return result;
};

//favourate contract db
const FavoriteContrcatFromDb = async (id: string) => {
  const isExistUser = await Contract.findById(id);
  if (!isExistUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'User Not Exist in the System',
      '',
    );
  }
  const result = await Contract.updateOne(
    { _id: id },
    { isfavorite: isExistUser?.isfavorite ? false : true },
  );
  return result;
};

export const ContractService = {
  createContractIntoDb,
  AllContractIntoDb,
  SpecificContractIdIntoDb,
  UpdateContractFromDb,
  DeleteContractFromDb,
  FavoriteContrcatFromDb,
};
