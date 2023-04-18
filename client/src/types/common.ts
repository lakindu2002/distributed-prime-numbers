export interface ConnectedNode {
  instanceId: number;
  ip: string;
  port: number;
}

export interface ElectionCheck {
  instanceId: number,
  isElectionReady: boolean
}

type LeaderElectedMessage = {
  action: 'leader_elected',
  payload: {
    leaderId: number
  }
}

export type Message = LeaderElectedMessage;