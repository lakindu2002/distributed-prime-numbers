import { Role } from "@distributed/types/common";
import { broadcastMessage } from "@distributed/utils/helpers";
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
