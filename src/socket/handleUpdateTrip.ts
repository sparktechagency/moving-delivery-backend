import { Server, Socket } from "socket.io";
import requests from "../module/requests/requests.model";
import NotificationServices from "../module/notification/notification.services";

const STEPS: Record<number, Record<string, boolean>> = {

    1: {
        isDriverOnTheWay: true,
    },
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
    1: "Driver On The Way",
    2: "Driver Arrived",
    3: "Driver Start The Trip",
    4: "Driver End The Trip",
    5: "Payment Completed",
}

const handleUpdateRequest = async (io: Server, socket: Socket, userId: string) => {

    socket.on("update-request", async (data: { requestId: string, status: number }) => {
        try {
            const result = await requests.findOneAndUpdate(
                { _id: data.requestId },
                { ...STEPS[data.status] },
                { new: true }
            );

            console.log(result)
            console.log(result);

            if (result && result.driverId) {
                const message = STATUS_MAP[data.status];
                io.to(result.driverId.toString()).emit('request-updated', result);
                io.to(result.userId.toString()).emit('request-updated', result);
                NotificationServices.sendPushNotification(result.userId.toString(), {
                    title: "Your Request Updated",
                    content: message,
                    time: new Date(),
                })
            }
        } catch (error) {
            console.log(error);
        }
    })
}

export default handleUpdateRequest;