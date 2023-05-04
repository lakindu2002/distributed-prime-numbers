import { Agent } from "@distributed/utils/agent";
import cli from "@distributed/utils/cli";
import api from '@distributed/server';
import node from '@distributed/utils/node';

require("dotenv").config();

const port = cli.getPortNumber();

api.startServer(port);

const agent = Agent.getSingleton({
  hostName: cli.getHostName(),
  ipAddr: "127.0.0.1",
  port,
  instanceId: node.getNodeId().toString()
});

agent.connectWithServer();

async function exitHandler(options: any) {
  if (options.exit) {
    await agent.disconnectFromServer();
    process.exit(0);
  }
}

// deregistered listener
process.on("SIGINT", exitHandler.bind(null, { exit: true }));
