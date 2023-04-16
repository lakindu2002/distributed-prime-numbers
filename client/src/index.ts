import express from "express";
import { EurekaClient } from "@distributed/utils/eureka";

// tslint:disable-next-line:no-var-requires
require("dotenv").config();

// tslint:disable-next-line:no-var-requires
const yargs = require("yargs");

// adding CLI params for port and hostname
const argv = yargs.options({
  port: {
    alias: "p",
    describe: "Port number",
    type: "number",
    demandOption: true,
  },
  host: {
    alias: "h",
    describe: "Host name",
    type: "string",
    demandOption: true,
  },
}).argv;

// initializing express app
const app = express();

const port = argv.port;

const eurekaClient = new EurekaClient({
  appName: process.env.APP_NAME,
  hostName: argv.host,
  ipAddr: "127.0.0.1",
  port: Number(port),
});

// json middleware
app.use(express.json());

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.send("Hello world");
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});

eurekaClient.connectWithServer();

function exitHandler(options: any, exitCode: any) {
  if (options.exit) {
    eurekaClient.disconnectFromServer();
  }
}

// deregistered listener
(eurekaClient.getClient() as any).on("deregistered", () => {
  process.exit();
});

// instance created listener
(eurekaClient.getClient() as any).on("started", () => {
  console.log("Started Connection");
});

process.on("SIGINT", exitHandler.bind(null, { exit: true }));
