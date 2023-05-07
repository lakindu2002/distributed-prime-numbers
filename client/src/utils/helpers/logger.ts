import { appendToFile } from "@distributed/utils/helpers/file-util";

export class Logger {
  static log(message: string) {
    console.log(`*********** LOG: ${message.toUpperCase()} ***********`);
  }

  static logToFile(message: string) {
    this.log(message);
    appendToFile(
      `${require.main.filename.split("src")[0]}/files/logs.txt`,
      message
    );
  }
}
