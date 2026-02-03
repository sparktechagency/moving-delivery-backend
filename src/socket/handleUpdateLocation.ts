import { Server, Socket } from "socket.io";
import User from "../module/user/user.model";
import ApiError from "../app/error/ApiError";
import httpStatus from "http-status";
import driververifications from "../module/driver_verification/driver_verification.model";
import UserServices from "../module/user/user.services";

const handleUpdateLocation = async (io: Server, socket: Socket, userId: string) => {


    socket.on("update-location", (data: { lat: number, long: number }) => {

        if (data.lat && data.long) {
            console.log(data)
            UserServices.handleUpdateLocation(socket, userId, data);
        }
    })


    socket.on("get-driver-location", (data: { userId: string }) => {

        if (data.userId) {
            UserServices.handleGetLocation(socket, data.userId);
        }

    })
}

export default handleUpdateLocation