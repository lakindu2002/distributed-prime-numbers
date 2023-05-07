import { createClient } from "redis";

export class Cache {
  private client;

  constructor() {
    this.client = createClient();
  }

  async connectToCache() {
    await this.client.connect();
  }

  async saveItemToCache(key: string, value: string, ttl: number = 20) {
    await this.client.set(key, value, { EX: ttl });
  }

  async getItemFromCache(key: string) {
    const resp = await this.client.get(key);
    return resp;
  }

  async disconnectFromCache() {
    await this.client.disconnect();
  }
}

export default new Cache();