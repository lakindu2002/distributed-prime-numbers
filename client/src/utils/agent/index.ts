import { ConsulInstance } from "@distributed/types/common";
import { constructUrlToHit, onConnectedToServer } from "@distributed/utils/helpers";
import axios from "axios";

type AgentCreate = {
  port: number;
  hostName: string;
  ipAddr: string;
  instanceId: string;
};

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
    const registerPayload = {
      Name: process.env.APP_NAME,
      ID: this.instanceId,
      Port: this.port,
      Meta: {
        ip: this.ipAddr
      },
      Checks: [
        {
          Name: `Check Counter health ${this.port}`,
          TCP: `${this.ipAddr}: ${this.port}`,
          Interval: "10s",
          Timeout: "5s"
        }
      ]
    }
    axios.put(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), '/v1/agent/service/register'), registerPayload).then(() => {
      console.log(`Node ${this.hostName} | ${this.instanceId} Registered on Port ${this.port} with Consul`);
      onConnectedToServer();
    }).catch((err) => {
      console.log('Failed to register with Consul', err.message);
    })
  }

  async disconnectFromServer() {
    await axios.put(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), `/v1/agent/service/deregister/${this.instanceId}`))
  }

  async getInstances(): Promise<ConsulInstance[]> {
    const url = constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), '/v1/agent/services')
    const resp = await axios.get<{ [instanceId: string]: ConsulInstance }>(url);
    const instances = Object.values(resp.data);
    console.log(`*********** NUMBER OF INSTANCES - ${instances.length} ***********`)
    return instances;
  }

  async getActiveInstances() {
    const instances = await this.getInstances();
    const promises = instances.map(async (instance) => {
      const resp = await axios.get(constructUrlToHit(process.env.CONSUL_HOST, Number(process.env.CONSUL_PORT), `/v1/agent/health/service/id/${instance.ID}`));
      if (resp.data.AggregatedStatus === 'critical') {
        // service is down
        return undefined;
      }
      // service is active
      return instance;
    })
    const activeInstances = (await Promise.all(promises)).filter((instance) => !!instance);
    console.log(`*********** NUMBER OF ACTIVE INSTANCES - ${activeInstances.length} ***********`)
    return activeInstances;
  }

  getPort() {
    return this.port;
  }

  getIp() {
    return this.ipAddr;
  }
}
