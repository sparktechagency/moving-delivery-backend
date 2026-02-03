import { Server, Socket } from "socket.io";
import requests from "../module/requests/requests.model";

const STEPS: Record<number, Record<string, boolean>> = {

    2: {
        isDriverArrived: true,
    },
    3: {
        isDriverStartTrip: true,
    },
    4: {
        isDriverEndTrip: true,
    },
    5: {
        isPaymentCompleted: true,
    },

}

const STATUS_MAP: Record<number, string> = {
    2: "driver_arrived",
    3: "driver_start_trip",
    4: "driver_end_trip",
    5: "payment_completed",
}

const handleUpdateRequest = async (io: Server, socket: Socket, userId: string) => {

    socket.on("update-request", async (data: { requestId: string, step: number }) => {
        try {
            const result = await requests.findOneAndUpdate(
                { _id: data.requestId },
                { ...STEPS[data.step] },
                { new: true }
            );
            console.log(result);
            io.to(userId).emit('request-updated', result);
        } catch (error) {
            console.log(error);
        }
    })
}

export default handleUpdateRequest;