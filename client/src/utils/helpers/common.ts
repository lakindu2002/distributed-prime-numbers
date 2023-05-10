import { ConnectedNode, ConsulInstance, Message, NodeResponse, Role } from "@distributed/types/common";
import { Agent } from "@distributed/utils/agent";
import { notifyLeaderElected } from "@distributed/utils/leader-election/bully";
import { Logger } from "@distributed/utils/helpers/logger";
import axios from "axios";
import cache from "@distributed/utils/helpers/cache";

export const constructUrlToHit = (path: string, ip: string = Agent.getSingleton().getIp(), port: number = Agent.getSingleton().getSidecarPort()) => `http://${ip}:${port}${path}`;

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
    try {
      const resp = await axios.get<Partial<NodeResponse>>(constructUrlToHit('/information'), {
        headers: {
          destination: `${eachNode.ip}:${eachNode.port}`
        }
      })
      return { ...resp.data, ip: eachNode.ip } as NodeResponse;
    } catch (err) {
      Logger.log(`ERROR - ${err?.message}`);
    }
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

export const getAllAcceptors = async () => {
  const cacheKey = Role.ACCEPTOR;
  const cacheResp = await cache.getItemFromCache(cacheKey);

  if (!!cacheResp && cacheResp !== null) {
    return JSON.parse(cacheResp) as ConsulInstance[];
  }
  const nodes = await Agent.getSingleton().getActiveInstances();
  const acceptors = nodes.filter((app) => app.Meta.role === Role.ACCEPTOR);
  await cache.saveItemToCache(cacheKey, JSON.stringify(acceptors), 3);
  return acceptors;
};

export const getLearner = async () => {
  const cacheKey = Role.LEARNER;
  const cacheResp = await cache.getItemFromCache(cacheKey);

  if (!!cacheResp && cacheResp !== null) {
    Logger.log('RETURNING FROM CACHE');
    return JSON.parse(cacheResp)[0] as ConsulInstance;
  }

  const nodes = await Agent.getSingleton().getActiveInstances();
  const learners = nodes.filter((app) => app.Meta.role === Role.LEARNER); // only one learner will be in the system
  if (learners.length !== 1) {
    throw new Error('Learner count is not 1');
  }
  await cache.saveItemToCache(cacheKey, JSON.stringify(learners), 3);
  const learner = learners[0];
  return learner;
};

export const getProposers = async () => {
  const cacheKey = Role.PROPOSER;
  const cacheResp = await cache.getItemFromCache(cacheKey);

  if (!!cacheResp && cacheResp !== null) {
    return JSON.parse(cacheResp) as ConsulInstance[];
  }
  const nodes = await Agent.getSingleton().getActiveInstances();
  const proposers = nodes.filter((app) => app.Meta.role === Role.PROPOSER);
  await cache.saveItemToCache(cacheKey, JSON.stringify(proposers), 3);
  return proposers;
};

export const getRandomNumber = (MAX_BOUND: number, MIN_BOUND: number) => Math.floor(Math.random() * (MAX_BOUND - MIN_BOUND + 1)) + MIN_BOUND
