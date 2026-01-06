// server.ts
import { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import { connectSocket } from "./socket/socketConnection";

let server: Server;

async function main() {
  try {
    

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      shutdown(1);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection:", reason);
      shutdown(1);
    });


    await mongoose.connect(config.database_url as string);
    console.log("✅ Database connected successfully");

   
    server = app.listen(Number(config.port),config.host as string, () => {
      console.log(
        `🚀 Server is listening at http://${config.host}:${config.port}`
      );
    });
    connectSocket(server);
    process.on("SIGTERM", () => {
      console.log("SIGTERM received");
      shutdown(0);
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received");
      shutdown(0);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
}


function shutdown(code: number) {
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(code);
    });
  } else {
    process.exit(code);
  }
}

main().then(() => {
  console.log("--- Moving delivery server is running ---");
});
