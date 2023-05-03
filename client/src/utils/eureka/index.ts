import { Eureka, EurekaClient as Client } from "eureka-js-client";
import { onConnectedToServer } from "@distributed/utils/helpers";
import axios from "axios";

type EurekaCreate = {
  port: number;
  appName: string;
  hostName: string;
  ipAddr: string;
  instanceId: string;
};

export class EurekaClient {
  private client: Eureka;

  private appName: string;

  private port: number;

  private instanceId: string

  private static singleton: EurekaClient;

  private constructor({ appName, hostName, ipAddr, port, instanceId }: EurekaCreate) {
    this.appName = appName;
    this.port = port;
    this.instanceId = instanceId;
    this.client = new Eureka({
      instance: {
        instanceId,
        port: {
          '$': port,
          '@enabled': true,
        },
        app: appName,
        hostName,
        ipAddr,
        dataCenterInfo: {
          '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
          name: "MyOwn",
        },
        vipAddress: `prime-number-${port}-${hostName}.dc.com`,
      },
      eureka: {
        fetchRegistry: true,
        fetchMetadata: true,
        host: process.env.EUREKA_HOST,
        port: Number(process.env.EUREKA_PORT),
        servicePath: '/eureka/apps/',
        registryFetchInterval: 100,
        heartbeatInterval: 10,
      },
    });
  }

  static getSingleton(props?: EurekaCreate): EurekaClient {
    if (this.singleton) {
      return this.singleton;
    }
    if (!props) {
      throw new Error('No props');
    }
    this.singleton = new EurekaClient(props)
    return this.singleton;
  }

  connectWithServer() {
    this.client.start((err) => {
      if (err) {
        console.log(`Error Occurred While Connecting With Eureka - ${err}`)
        return;
      }
      console.log(`Node ${this.appName} Registered on Port ${this.port} with Eureka Server`);
      // create a random time out period between 5 to 15 seconds to prevent all nodes from starting election at the same time.
      const MAX_BOUND = 15;
      const MIN_BOUND = 5;
      const timeoutPeriod = (Math.floor(Math.random() * (MAX_BOUND - MIN_BOUND + 1)) + MIN_BOUND) * 1000;
      console.log('TIMEOUT_PERIOD', timeoutPeriod);
      setTimeout(onConnectedToServer, timeoutPeriod)
    });
  }

  disconnectFromServer() {
    this.client.stop((err) => {
      console.log(err || `Instance on Port ${this.port} stopped.`);
    })
  }

  async updateInstance(instanceId: number, metadata: { [key: string]: string }) {
    const updateUrl = new URL(`http://${process.env.EUREKA_HOST}:${process.env.EUREKA_PORT}/eureka/apps/${process.env.APP_NAME}/${instanceId}/metadata`)
    Object.entries(metadata).forEach(([key, value]) => {
      // add query params.
      updateUrl.searchParams.append(key, value);
    })
    await axios.put(updateUrl.toString());
  }

  getInstances(): Client.EurekaInstanceConfig[] {
    const apps = this.client.getInstancesByAppId('PRIME-NUMBER-COMPUTER');
    return apps;
  }

  getActiveInstances(): Client.EurekaInstanceConfig[] {
    return this
      .getInstances()
      .filter((app) => app.status === 'UP' && app.instanceId !== this.instanceId)
  }

  getClient() {
    return this.client;
  }
}
