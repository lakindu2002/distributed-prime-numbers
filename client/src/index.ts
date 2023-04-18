import { EurekaClient } from "@distributed/utils/eureka";
import cli from "@distributed/utils/cli";
import api from '@distributed/server';
import node from '@distributed/utils/node';

require("dotenv").config();

const port = cli.getPortNumber();

api.startServer(port);

const eurekaClient = EurekaClient.getSingleton({
  appName: process.env.APP_NAME,
  hostName: cli.getHostName(),
  ipAddr: "127.0.0.1",
  port,
  instanceId: node.getNodeId().toString()
});

eurekaClient.connectWithServer();

function exitHandler(options: any) {
  if (options.exit) {
    eurekaClient.disconnectFromServer();
  }
}

// deregistered listener
(eurekaClient.getClient() as any).on("deregistered", () => {
  process.exit();
});

process.on("SIGINT", exitHandler.bind(null, { exit: true }));
