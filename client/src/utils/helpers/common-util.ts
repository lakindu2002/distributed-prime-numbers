import { ConnectedNode, Message, NodeResponse } from "@distributed/types/common";
import { Agent } from "@distributed/utils/agent";
import { notifyLeaderElected } from "./bully-util";
import { Logger } from "./logger";
import axios from "axios";

export const constructUrlToHit = (ip: string, port: number, path: string) =>
  `http://${ip}:${port}${path}`;

/**
 * Fetch all connected nodes in service regsitry in custom shape
 * @returns Connected Nodes.
 */
export const getAllConnectedNodesFromRegistry = async (): Promise<ConnectedNode[]> => {
  const instances = await Agent.getSingleton().getInstances();
  return instances.map((connectedNode) => ({
    port: connectedNode.Port,
    ip: String(connectedNode.Meta.ip),
    instanceId: Number(connectedNode.ID),
  }));
};

/**
 *
 * @param nodes The connected nodes from the Consul Service Registry
 * @returns An array of NodeResponse that includes meta from all services
 */
export const getNodesInformation = async (nodes: ConnectedNode[]): Promise<NodeResponse[]> => {
  const promises = nodes.map(async (eachNode) => {
    const resp = await axios.get<Partial<NodeResponse>>(constructUrlToHit('localhost', eachNode.port, '/information'))
    return { ...resp.data, ip: eachNode.ip } as NodeResponse;
  })
  const responses = await Promise.all(promises);
  return responses;
};

/**
 * broadcasts a message to all connected nodes.
 * @param payload message to broadcast
 */
export const broadcastMessage = async ({ action, payload }: Message) => {
  switch (action) {
    case "leader_elected": {
      await notifyLeaderElected(payload.leaderId);
      break;
    }
  }
};

export const getRandomTimeDuration = (MAX_BOUND: number = 20, MIN_BOUND = 10) => {
  const timeoutPeriod = (Math.floor(Math.random() * (MAX_BOUND - MIN_BOUND + 1)) + MIN_BOUND) * 1000;
  Logger.log(`TIMEOUT_PERIOD - ${timeoutPeriod}`);
  return timeoutPeriod;
}

/**
 *
 * @returns An array that will comprise of service registry + service info by pinging the `/information` endpoint.
 */
export const getNodes = async (): Promise<NodeResponse[]> => {
  const connectedNodes = await getAllConnectedNodesFromRegistry();
  const connectedNodesInformation = await getNodesInformation(connectedNodes);
  return connectedNodesInformation;
}

