import { z } from 'zod';

const selectTruckSchema = z.object({
  body: z.object({
    
    truckcategories: z.string({
      required_error: 'Truck category is required',
    }),
     price:z.number({required_error:"price is required"}),
    photo: z.string({
      required_error: 'Photo is required',
    }).optional(),
  }).optional(),
});


const UpdateselectTruckSchema = z.object({
  body: z.object({
    
    truckcategories: z.string({
      required_error: 'Truck category is required',
    }).optional(),
     price:z.number({required_error:"price is required"}).optional(),
    photo: z.string({
      required_error: 'Photo is required',
    }).optional(),
  }).optional(),
});

const SelectTruckValidationSchema={
    selectTruckSchema ,
    UpdateselectTruckSchema
};

export default SelectTruckValidationSchema;



