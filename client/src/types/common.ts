export interface ConnectedNode {
  instanceId: number;
  ip: string;
  port: number;
}

export interface NodeCheck {
  instanceId: number,
  isElectionReady: boolean
  isLeader: boolean,
}

type LeaderElectedMessage = {
  action: 'leader_elected',
  payload: {
    leaderId: number
  }
}

export type Message = LeaderElectedMessage;