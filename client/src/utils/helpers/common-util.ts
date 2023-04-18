import { ConnectedNode, Message } from "@distributed/types/common";
import { EurekaClient } from "@distributed/utils/eureka";
import { notifyLeaderElected } from "./bully-util";

export const constructUrlToHit = (ip: string, port: number, path: string) =>
  `http://${ip}:${port}${path}`;

/**
 * Fetch all connected nodes in service regsitry in custom shape
 * @returns Connected Nodes.
 */
export const getAllConnectedNodesFromRegistry = (): ConnectedNode[] => {
  return EurekaClient.getSingleton()
    .getInstances()
    .map((higherNode) => ({
      port: Number((higherNode.port as any).$),
      ip: higherNode.ipAddr,
      instanceId: Number(higherNode.instanceId),
    }));
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
