import { append, chainSummary, create, merge, TeamAction, TeamSignatureChain } from '@/chain'
import { ADMIN } from '@/role'
import { redactUser } from '@/user'
import { clone } from '@/util'
import { setup as userSetup } from '@/util/testing'

describe('chains', () => {
  const setup = () => {
    // ðĐðū Alice creates a chain
    let aChain = create<TeamAction>(
      { teamName: 'Spies ÐŊ Us', rootMember: redactUser(alice.user) },
      alice.localContext
    )
    // ðĐðū Alice adds ðĻðŧâðĶē Bob as admin
    aChain = append(aChain, ADD_BOB_AS_ADMIN, alice.localContext)

    // ðĐðū ðĄ ðĻðŧâðĶē Alice shares the chain with Bob
    let bChain = clone(aChain)
    return { aChain, bChain }
  }

  describe('membershipResolver', () => {
    it('resolves two chains with no conflicting membership changes', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and shares it with Bob
      let { aChain, bChain } = setup()

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob makes a change
      bChain = append(bChain, ADD_ROLE_MANAGERS, bob.localContext)
      expect(sequence(bChain)).toEqual('ROOT, ADD:bob, ADD:managers')

      // ðĐðū Concurrently, Alice makes a change
      aChain = append(aChain, ADD_CHARLIE, alice.localContext)
      expect(sequence(aChain)).toEqual('ROOT, ADD:bob, ADD:charlie')

      // ðâ Alice and Bob reconnect and synchronize chains

      // â the result will be one of these two (could be either because timestamps change with each test run)
      expectMergedResult(aChain, bChain, [
        'ROOT, ADD:bob, ADD:charlie, ADD:managers',
        'ROOT, ADD:bob, ADD:managers, ADD:charlie',
      ])
    })

    it('discards changes made by a member who is concurrently removed', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and shares it with Bob
      let { aChain, bChain } = setup()

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob adds Charlie to the group
      bChain = append(bChain, ADD_CHARLIE, bob.localContext)
      expect(sequence(bChain)).toEqual('ROOT, ADD:bob, ADD:charlie')

      // ðĐðū but concurrently, Alice removes Bob from the group
      aChain = append(aChain, REMOVE_BOB, alice.localContext)
      expect(sequence(aChain)).toEqual('ROOT, ADD:bob, REMOVE:bob')

      // ðâ Alice and Bob reconnect and synchronize chains

      // â Bob's change is discarded - Charlie is not added
      expectMergedResult(aChain, bChain, 'ROOT, ADD:bob, REMOVE:bob')
    })

    it('discards changes made by a member who is concurrently demoted', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and shares it with Bob
      let { aChain, bChain } = setup()

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob adds Charlie to the group
      bChain = append(bChain, ADD_CHARLIE, bob.localContext)
      expect(sequence(bChain)).toEqual('ROOT, ADD:bob, ADD:charlie')

      // ðĐðū but concurrently, Alice removes Bob from the admin role
      aChain = append(aChain, DEMOTE_BOB, alice.localContext)
      expect(sequence(aChain)).toEqual('ROOT, ADD:bob, REMOVE:admin:bob')

      // ðâ Alice and Bob reconnect and synchronize chains

      // â Bob's change is discarded
      expectMergedResult(aChain, bChain, 'ROOT, ADD:bob, REMOVE:admin:bob')
    })

    it(`doesn't allow a member who is removed to be concurrently added back`, () => {
      // ðĐðū Alice creates a chain and adds Charlie
      let { aChain } = setup()
      aChain = append(aChain, ADD_CHARLIE, alice.localContext)

      // ðĐðū ðĄ ðĻðŧâðĶē Alice shares the chain with Bob
      let bChain = clone(aChain)

      // ðâ Now Alice and Bob are disconnected

      // ðĐðū Alice removes Charlie
      aChain = append(aChain, REMOVE_CHARLIE, alice.localContext)
      expect(sequence(aChain)).toEqual('ROOT, ADD:bob, ADD:charlie, REMOVE:charlie')

      // ðĻðŧâðĶē Bob removes Charlie then adds him back
      bChain = append(bChain, REMOVE_CHARLIE, bob.localContext)
      bChain = append(bChain, ADD_CHARLIE, bob.localContext)
      expect(sequence(bChain)).toEqual('ROOT, ADD:bob, ADD:charlie, REMOVE:charlie, ADD:charlie')

      // ðâ Alice and Bob reconnect and synchronize chains

      // â Charlie isn't added back
      expectMergedResult(aChain, bChain, 'ROOT, ADD:bob, ADD:charlie, REMOVE:charlie')
    })

    it('resolves mutual concurrent removals in favor of the team founder', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and shares it with Bob
      let { aChain, bChain } = setup()

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob removes Alice
      bChain = append(bChain, REMOVE_ALICE, bob.localContext)

      // ðĐðū Alice removes Bob
      aChain = append(aChain, REMOVE_BOB, alice.localContext)

      // ðâ Alice and Bob reconnect and synchronize chains

      // â Alice created the team; Bob's change is discarded, Alice stays
      expectMergedResult(aChain, bChain, ['ROOT, ADD:bob, REMOVE:bob'])
    })

    it('resolves mutual concurrent removals in favor of the senior member', () => {
      // ðĐðū Alice creates a chain and adds Charlie
      let { aChain } = setup()
      aChain = append(aChain, ADD_CHARLIE_AS_ADMIN, alice.localContext)

      // ðĐðū ðĄ ðĻðŧâðĶē ðģð―ââïļ Alice shares the chain with Bob and Charlie
      let bChain = clone(aChain)
      let cChain = clone(aChain)

      // ðâ Now Bob and Charlie are disconnected

      // ðĻðŧâðĶē Bob removes Charlie
      bChain = append(bChain, REMOVE_CHARLIE, bob.localContext)

      // ðģð―ââïļ Charlie removes Bob
      cChain = append(cChain, REMOVE_BOB, charlie.localContext)

      // ðâ Bob and Charlie reconnect and synchronize chains

      // â Bob was added first; Charlie's change is discarded, Bob stays
      expectMergedResult(bChain, cChain, 'ROOT, ADD:bob, ADD:charlie, REMOVE:charlie')
    })

    it('resolves mutual concurrent demotions in favor of the team founder', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and shares it with Bob
      let { aChain, bChain } = setup()

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob demotes Alice
      bChain = append(bChain, DEMOTE_ALICE, bob.localContext)

      // ðĐðū Alice demotes Bob
      aChain = append(aChain, DEMOTE_BOB, alice.localContext)

      // ðâ Alice and Bob reconnect and synchronize chains

      // â Alice created the team; Bob's change is discarded, Alice is still an admin
      expectMergedResult(aChain, bChain, 'ROOT, ADD:bob, REMOVE:admin:bob')
    })

    it('resolves circular mutual concurrent demotions in favor of the team founder', () => {
      // ðĐðū ðĄ ðĻðŧâðĶē Alice creates a chain and adds Charlie as admin
      let { aChain } = setup()
      aChain = append(aChain, ADD_CHARLIE_AS_ADMIN, alice.localContext)

      // ðĐðū ðĄ ðĻðŧâðĶē Alice shares the chain with Bob and Charlie
      let bChain = clone(aChain)
      let cChain = clone(aChain)

      // ðâ Now Alice and Bob are disconnected

      // ðĻðŧâðĶē Bob demotes Charlie
      bChain = append(bChain, DEMOTE_CHARLIE, bob.localContext)

      // ðģð―ââïļ Charlie demotes Alice
      cChain = append(cChain, DEMOTE_ALICE, charlie.localContext)

      // ðĐðū Alice demotes Bob
      aChain = append(aChain, DEMOTE_BOB, alice.localContext)

      // ðâ All reconnect and synchronize chains
      // This could happen three different ways - make sure the result is the same in all cases
      const mergedChains = [
        merge(aChain, merge(cChain, bChain)),
        merge(bChain, merge(cChain, aChain)),
        merge(cChain, merge(aChain, bChain)),
      ]

      // â Alice created the team; Bob's change is discarded, Alice is still an admin
      const expected = 'ROOT, ADD:bob, ADD:charlie, REMOVE:admin:bob'
      for (const chain of mergedChains) expect(sequence(chain)).toBe(expected)
    })
  })
})

const expectMergedResult = (
  aChain: TeamSignatureChain,
  bChain: TeamSignatureChain,
  expected: string[] | string
) => {
  if (!Array.isArray(expected)) expected = [expected] as string[] // coerce to array

  // ðĐðū â ðĻðŧâðĶē They synchronize chains
  const mergedChain = merge(aChain, bChain)

  // The resolved sequence should match one of the provided options
  expect(expected).toContain(sequence(mergedChain))
}

const sequence = (chain: TeamSignatureChain) =>
  chainSummary(chain)
    .replace(/_MEMBER/g, '')
    .replace(/_ROLE/g, '')

const { alice, bob, charlie } = userSetup('alice', 'bob', 'charlie')

// constant actions

const REMOVE_ALICE = {
  type: 'REMOVE_MEMBER',
  payload: { userName: 'alice' },
} as TeamAction

const DEMOTE_ALICE = {
  type: 'REMOVE_MEMBER_ROLE',
  payload: { userName: 'alice', roleName: ADMIN },
} as TeamAction

const ADD_BOB_AS_ADMIN = {
  type: 'ADD_MEMBER',
  payload: { member: redactUser(bob.user), roles: [ADMIN] },
} as TeamAction

const REMOVE_BOB = {
  type: 'REMOVE_MEMBER',
  payload: { userName: 'bob' },
} as TeamAction

const DEMOTE_BOB = {
  type: 'REMOVE_MEMBER_ROLE',
  payload: { userName: 'bob', roleName: ADMIN },
} as TeamAction

const ADD_CHARLIE = {
  type: 'ADD_MEMBER',
  payload: { member: redactUser(charlie.user) },
} as TeamAction

const ADD_CHARLIE_AS_ADMIN = {
  type: 'ADD_MEMBER',
  payload: { member: redactUser(charlie.user), roles: [ADMIN] },
} as TeamAction

const REMOVE_CHARLIE = {
  type: 'REMOVE_MEMBER',
  payload: { userName: 'charlie' },
} as TeamAction

const DEMOTE_CHARLIE = {
  type: 'REMOVE_MEMBER_ROLE',
  payload: { userName: 'charlie', roleName: ADMIN },
} as TeamAction

const ADD_ROLE_MANAGERS = {
  type: 'ADD_ROLE',
  payload: { roleName: 'managers' },
} as TeamAction
