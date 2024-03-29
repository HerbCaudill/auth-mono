﻿import { Challenge } from '@/connection/types'
import { TeamLink } from '@/chain'
import { ProofOfInvitation } from '@/invitation'
import { KeyScope } from '@/keyset'
import { Base64, Hash } from '@/util'

export type ReadyMessage = {
  type: 'READY'
}

export type HelloMessage = {
  type: 'HELLO'
  payload: {
    identityClaim: KeyScope
    proofOfInvitation?: ProofOfInvitation
  }
}

export type ErrorMessage = {
  type: 'ERROR'
  payload: {
    message: string
    details?: any
  }
}

export type DisconnectMessage = {
  type: 'DISCONNECT'
  payload?: {
    message: string
  }
}
export type ReconnectMessage = {
  type: 'RECONNECT'
}

// Invitations

export type AcceptInvitationMessage = {
  type: 'ACCEPT_INVITATION'
  payload: {
    chain: string
  }
}

// Identity

export type ChallengeIdentityMessage = {
  type: 'CHALLENGE_IDENTITY'
  payload: {
    challenge: Challenge
  }
}

export type ProveIdentityMessage = {
  type: 'PROVE_IDENTITY'
  payload: {
    challenge: Challenge
    proof: Base64 // this is a signature
  }
}

export type AcceptIdentityMessage = {
  type: 'ACCEPT_IDENTITY'
  payload: {}
}

export type RejectIdentityMessage = {
  type: 'REJECT_IDENTITY'
  payload: {
    message: string
  }
}

// Update (synchronization)

export type UpdateMessage = {
  type: 'UPDATE'
  payload: {
    root: Hash
    head: Hash
    hashes: Hash[]
  }
}

export type MissingLinksMessage = {
  type: 'MISSING_LINKS'
  payload: {
    head: Hash
    links: TeamLink[]
  }
}

// triggered locally when we detect that team has changed
export type LocalUpdateMessage = {
  type: 'LOCAL_UPDATE'
  payload: {
    head: Hash
  }
}

// Negotiation

export type SeedMessage = {
  type: 'SEED'
  payload: {
    encryptedSeed: Base64
  }
}

// Communication

export type EncryptedMessage = {
  type: 'ENCRYPTED_MESSAGE'
  payload: Base64
}

export type ConnectionMessage =
  | ReadyMessage
  | HelloMessage
  | AcceptInvitationMessage
  | ChallengeIdentityMessage
  | ProveIdentityMessage
  | AcceptIdentityMessage
  | ErrorMessage
  | DisconnectMessage
  | ReconnectMessage
  | UpdateMessage
  | LocalUpdateMessage
  | MissingLinksMessage
  | SeedMessage
  | EncryptedMessage

export type NumberedConnectionMessage = ConnectionMessage & {
  index: number
}
