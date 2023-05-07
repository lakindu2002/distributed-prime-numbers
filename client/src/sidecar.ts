import express from "express";
import httpProxy from "http-proxy";
import { Logger } from "./utils/helpers";
import { IncomingMessage, ServerResponse } from "http";

export class Sidecar {
  private server: express.Express;

  private sidecarInstance: any;

  private proxy: httpProxy<IncomingMessage, ServerResponse<IncomingMessage>>

  constructor() {
    this.server = express();
    this.proxy = httpProxy.createProxyServer({});
    this.addMiddleware();
  }

  addMiddleware() {
    this.server.all('/*', (req, res) => {
      Logger.logToFile(`[${new Date().toISOString()}] ${req.method} ${req.url} ${req.hostname} ${req.headers.destination}`);
      this.proxy.web(req, res, {
        target: `http://${req.headers.destination}`,
      })
    });
  }

  getSidecar() {
    return this.server;
  }

  startSidecar(port: number) {
    this.sidecarInstance = this.server.listen(port, () => {
      Logger.log(`SIDECAR STARTED AT http://localhost:${port}`);
    })
  };

  stopSidecar() {
    this.sidecarInstance.close();
  }
}

export default new Sidecar();