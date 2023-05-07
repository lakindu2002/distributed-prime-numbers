import { Agent } from "@distributed/utils/agent";
import cli from "@distributed/utils/cli";
import api from '@distributed/server';
import sidecar from '@distributed/sidecar';
import node from '@distributed/utils/node';

require("dotenv").config();

const apiPort = cli.getPortNumber();
const sidecarPort = cli.getSidecarPortNumber();

api.startServer(apiPort);
sidecar.startSidecar(sidecarPort)

const agent = Agent.getSingleton({
  hostName: cli.getHostName(),
  ipAddr: "127.0.0.1",
  port: apiPort,
  instanceId: node.getNodeId().toString(),
  sidecarPort
});

agent.connectWithServer();

async function exitHandler(options: any) {
  if (options.exit) {
    await agent.disconnectFromServer();
    sidecar.stopSidecar();
    process.exit(0);
  }
}

// deregistered listener
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
