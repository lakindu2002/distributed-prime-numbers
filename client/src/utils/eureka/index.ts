import { Eureka, EurekaClient as Client } from "eureka-js-client";
import { onConnectedToServer } from "@distributed/utils/helpers";

type EurekaCreate = {
  port: number;
  appName: string;
  hostName: string;
  ipAddr: string;
  instanceId: string
};

export class EurekaClient {
  private client: Eureka;

  private appName: string;

  private port: number;

  private static singleton: EurekaClient;

  private constructor({ appName, hostName, ipAddr, port, instanceId }: EurekaCreate) {
    this.appName = appName;
    this.port = port;
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
        servicePath: '/eureka/apps/'
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
      // create a random time out period between 5 to 10 seconds to prevent all nodes from starting election at the same time.
      const MAX_BOUND = 10;
      const MIN_BOUND = 5;
      const timeoutPeriod = (Math.floor(Math.random() * (MAX_BOUND - MIN_BOUND + 1)) + MIN_BOUND) * 1000;
      setTimeout(onConnectedToServer, timeoutPeriod)
    });
  }

  disconnectFromServer() {
    this.client.stop((err) => {
      console.log(err || `Instance on Port ${this.port} stopped.`);
    })
  }

  getInstances(): Client.EurekaInstanceConfig[] {
    const apps = this.client.getInstancesByAppId('PRIME-NUMBER-COMPUTER');
    return apps;
  }

  getClient() {
    return this.client;
  }
}
