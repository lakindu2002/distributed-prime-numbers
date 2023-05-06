import { ConsulInstance } from "@distributed/types/common";
import { Logger, constructUrlToHit, onConnectedToServer } from "@distributed/utils/helpers";
import axios from "axios";
import node from "@distributed/utils/node";

type AgentCreate = {
  port: number;
  hostName: string;
  ipAddr: string;
  instanceId: string;
};

const getConsulPayload = ({ appName, instanceId, port, ip, customMeta }: { appName: string, instanceId: string, port: number, ip: string, customMeta?: any }) => ({
  Name: appName,
  ID: instanceId,
  Port: port,
  Meta: {
    ip,
    ...customMeta
  },
  Checks: [
    {
      Name: `Check Counter health ${port}`,
      TCP: `${ip}: ${port}`,
      Interval: "10s",
      Timeout: "5s"
    }
  ]
})

export class Agent {
  private port: number;

  private instanceId: string

  private hostName: string

  private ipAddr: string;

  private static singleton: Agent;

  private constructor({ hostName, ipAddr, port, instanceId }: AgentCreate) {
    this.port = port;
    this.ipAddr = ipAddr;
    this.hostName = hostName;
    this.instanceId = instanceId;
  }

  static getSingleton(props?: AgentCreate): Agent {
    if (this.singleton) {
      return this.singleton;
    }
    if (!props) {
      throw new Error('No props');
    }
    this.singleton = new Agent(props)
    return this.singleton;
  }

  connectWithServer() {
    const registerPayload = getConsulPayload({ appName: process.env.APP_NAME, instanceId: this.instanceId, port: this.port, ip: this.ipAddr });
    axios.put(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), '/v1/agent/service/register'), registerPayload).then(() => {
      Logger.log(`Node ${this.hostName} | ${this.instanceId} Registered on Port ${this.port} with Consul`);
      onConnectedToServer();
      node.pingLeader();
    }).catch((err) => {
      Logger.log(`Failed to register with Consul - ${err.message}`);
    })
  }

  async disconnectFromServer() {
    await axios.put(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), `/v1/agent/service/deregister/${this.instanceId}`))
    node.removePing();
  }

  async getInstance(instanceId: string) {
    const instances = await this.getInstances();
    const instance = instances.find((instance) => instance.ID === instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }
    return instance;
  }

  async getInstances(): Promise<ConsulInstance[]> {
    const url = constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), '/v1/agent/services')
    const resp = await axios.get<{ [instanceId: string]: ConsulInstance }>(url);
    const instances = Object.values(resp.data);
    return instances;
  }

  async getInstanceHealth(instanceId: string) {
    try {
      const resp = await axios.get(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), `/v1/agent/health/service/id/${instanceId}`));
      return resp.data.AggregatedStatus;
    } catch (err) {
      return err.response?.data?.AggregatedStatus || 'critical';
    }
  }


  async updateInstanceMeta(instanceId: string, meta: { [key: string]: any }) {
    const instances = await this.getInstances();
    const instanceToUpdate = instances.find((instance) => instance.ID === instanceId);
    if (!instanceToUpdate) {
      Logger.log('NO INSTANCE FOUND ON REGISTRY TO UPDATE')
      return;
    }
    const newPayload = getConsulPayload({
      appName: String(process.env.APP_NAME),
      port: instanceToUpdate.Port,
      ip: instanceToUpdate.Meta.ip as string,
      instanceId: instanceToUpdate.ID,
      customMeta: {
        ...meta,
      }
    })
    await axios.put(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), '/v1/agent/service/register'), newPayload);
  }

  async getActiveInstances() {
    const instances = await this.getInstances();
    const promises = instances.map(async (instance) => {
      const health = await this.getInstanceHealth(instance.ID);
      if (health === 'critical') {
        // service is down
        return undefined;
      }
      // service is active
      return instance;
    })
    const activeInstances = (await Promise.all(promises)).filter((instance) => !!instance);
    Logger.log(`NUMBER OF ACTIVE INSTANCES - ${activeInstances.length}`)
    return activeInstances;
  }

  getPort() {
    return this.port;
  }

  getIp() {
    return this.ipAddr;
  }
}
