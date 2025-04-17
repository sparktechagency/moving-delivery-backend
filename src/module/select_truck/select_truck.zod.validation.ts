import { z } from 'zod';

const selectTruckSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: 'userId is required' }),

    truckcategories: z.string({
      required_error: 'Truck category is required',
    }),

    photo: z.string({
      required_error: 'Photo is required',
    }),
  }),
});

const SelectTruckValidationSchema={
    selectTruckSchema 
};

export default SelectTruckValidationSchema;



