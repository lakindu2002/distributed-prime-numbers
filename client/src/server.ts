import express from "express";
import routes from "@distributed/routes";
import { Logger } from "@distributed/utils/helpers";

export class Server {
  private server: express.Express;

  constructor() {
    this.server = express();
    this.addMiddleware();
    this.addRoutes();
  }

  addMiddleware() {
    this.server.use(express.json());
  }

  addRoutes() {
    this.server.use(routes);
  }

  getServer() {
    return this.server;
  }

  startServer(port: number) {
    // start the Express server
    this.server.listen(port, () => {
      Logger.log(`server started at http://localhost:${port}`);
    });
  }
}

export default new Server();
