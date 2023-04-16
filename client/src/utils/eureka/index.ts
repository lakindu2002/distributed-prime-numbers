import { Eureka } from "eureka-js-client";

type EurekaCreate = {
  port: number;
  appName: string;
  hostName: string;
  ipAddr: string;
};

export class EurekaClient {
  private client: Eureka;

  private appName: string;

  private port: number;

  constructor({ appName, hostName, ipAddr, port }: EurekaCreate) {
    this.appName = appName;
    this.port = port;
    this.client = new Eureka({
      instance: {
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
      },
    });
  }

  connectWithServer() {
    this.client.start((err) => {
      console.log(err || `Application ${this.appName} Registered on Port ${this.port} with Eureka Server`);
    });
  }

  disconnectFromServer() {
    this.client.stop((err) => {
      console.log(err || `Instance on Port ${this.port} stopped.`);
    })
  }

  getClient() {
    return this.client;
  }
}
