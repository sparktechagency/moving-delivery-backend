import express from 'express';
import { ContractController } from './contract.controller';
import validationRequest from '../../middleware/validationRequest';
import { ContractValidation } from './contract.zod.validation';

const router= express.Router();

router.post('/',validationRequest(ContractValidation.ContractValidationSchema),ContractController.createContract);
router.get("/",ContractController.AllContract);
router.get('/:id',ContractController.SpecificContractId);
router.patch("/:id",validationRequest(ContractValidation.UpdateContractValidationSchema),ContractController.UpdateContract);
router.delete("/:id",ContractController.DeleteContract);
router.patch("/favorite/:id",ContractController.FavoriteContrcat);
export const ContructRouter=router;