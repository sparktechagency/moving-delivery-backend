interface Participant {
  userId: string;
  role?: string; 
}

export interface TCall {
  roomId: string;
  participants: Participant[];
  status?: string;      
  startTime?: Date;
  endTime?: Date;
  billingRate?: number; 
}

