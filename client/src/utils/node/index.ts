import { Role } from "@distributed/types/common";
import { Logger, broadcastMessage, getRandomTimeDuration, startElection } from "@distributed/utils/helpers";
import { Agent } from "../agent";

export const createNodeId = (): number => {
  const MAX_BOUND = 500000;
  const MIN_BOUND = 400000;
  const currentTimeInMs = Date.now();
  const randomNum = Math.floor(Math.random() * (MAX_BOUND - MIN_BOUND + 1)) + MIN_BOUND;
  return randomNum + currentTimeInMs;
};

/**
 * Class created to store meta information about running Node, and perform ops on it
 */
export class Node {
  private nodeId: number;
  private leaderId: number | undefined;
  private role: Role
  private _isLeader: boolean;
  private _isLeaderAvailable: boolean;
  private _isElectionOnGoing: boolean;
  private pingInterval: NodeJS.Timer;

  constructor() {
    this.nodeId = createNodeId();
    this.leaderId = undefined;
    this._isLeader = false;
    this._isLeaderAvailable = false;
    this._isElectionOnGoing = false;
  }

  getNodeId() {
    return this.nodeId;
  }

  getLeaderId() {
    return this.leaderId;
  }

  isLeader() {
    return this._isLeader;
  }

  isLeaderAvailable() {
    return this._isLeaderAvailable;
  }

  isElectionOnGoing() {
    return this._isElectionOnGoing;
  }

  /**
   * sets the leader for the node.
   * when the leader is set the values `_isLeader`, `_isLeaderAvailable` gets updated
   * when leader ID is set, the election is turned off.
   * @param value The leader id
   * @param announce Boolean to determine if the leader should be announced @default false
   */
  async setLeaderId(value: number, announce: boolean = false) {
    this.leaderId = value;
    this._isLeader = value === this.getNodeId()
    this._isLeaderAvailable = !!value;
    if (announce) {
      await broadcastMessage({
        action: 'leader_elected',
        payload: {
          leaderId: value,
        }
      });
    }
    this.setElectionOnGoing(false);
  }

  async pingLeader() {
    const duration = getRandomTimeDuration(60, 40)
    Logger.log(`CREATING A PING FOR THE LEADER OF ${duration} SECONDS`)
    this.pingInterval = setInterval(async () => {
      if (!this.leaderId) {
        Logger.log('NO LEADER YET, EXITING FROM PING')
        return;
      }
      Logger.log(`CHECKING LEADER HEALTH - ${this.leaderId}`)
      const health = await Agent.getSingleton().getInstanceHealth(this.leaderId.toString());
      if (health === 'critical') {
        Logger.log(`LEADER DEAD - ${this.leaderId}`)
        // health is bad, need a new leader, lets check from current one and see.
        startElection(this.nodeId);
        return;
      }
      Logger.log('LEADER ALIVE')
    }, duration);
  }

  async removePing() {
    clearInterval(this.pingInterval);
  }

  setElectionOnGoing(value: boolean) {
    this._isElectionOnGoing = value;
  }

  setRole(role: Role) {
    this.role = role;
  }

  getRole() {
    return this.role;
  }

  isElectionReady() {
    return !this.isElectionOnGoing() && !this.isLeader();
  }
}

const node = new Node();
export default node;
