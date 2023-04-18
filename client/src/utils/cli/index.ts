// tslint:disable-next-line:no-var-requires
const yargs = require("yargs");

class CLI {
  private argv;

  constructor() {
    this.argv = yargs.options({
      port: {
        alias: "p",
        describe: "Port number",
        type: "number",
        demandOption: true,
      },
      host: {
        alias: "h",
        describe: "Host name",
        type: "string",
        demandOption: true,
      },
    }).argv;
  }

  getPortNumber() {
    return Number(this.argv.port);
  }

  getHostName() {
    return this.argv.host;
  }
}

export default new CLI();
