import { append, create, merge } from '@/chain'
import { clone } from '@/util'
import { setup } from '@/util/testing'
import '@/util/testing/expect/toBeValid'

const { alice, bob } = setup('alice', 'bob')
const defaultContext = alice.localContext
const __ = expect.objectContaining

describe('chains', () => {
  describe('merge', () => {
    test('no changes', () => {
      // π©πΎ Alice creates a chain and shares it with Bob
      const aliceChain = create('a', defaultContext)
      const bobChain = clone(aliceChain)

      // π©πΎπ¨π»βπ¦² after a while they sync back up
      const aliceMerged = merge(aliceChain, bobChain)
      const bobMerged = merge(bobChain, aliceChain)

      // nothing has changed
      expect(aliceMerged).toEqual(aliceChain)
      expect(aliceMerged).toEqual(bobMerged)
      expect(bobMerged).toEqual(bobChain)
    })

    test('edits on one side', () => {
      // π©πΎ Alice creates a chain and shares it with Bob
      const chain = create('a', defaultContext)
      const bobChain = clone(chain)

      // π©πΎ Alice makes edits
      const aliceChain = append(chain, { type: 'FOO', payload: 'doin stuff' }, alice.localContext)

      // π¨π»βπ¦² Bob doesn't make any changes

      // π©πΎπ¨π»βπ¦² They sync back up
      const aliceMerged = merge(aliceChain, bobChain)
      const bobMerged = merge(bobChain, aliceChain)

      // They now have the same chain again
      expect(aliceMerged).toEqual(bobMerged)

      // Alice's chain didn't change
      expect(aliceMerged).toEqual(aliceChain)

      // Bob's chain did change
      expect(bobMerged).not.toEqual(bobChain)
    })

    test('concurrent edits', () => {
      // π©πΎ Alice creates a chain and shares it with Bob
      const aliceChain = create('a', alice.localContext)
      const bobChain = { ...aliceChain }

      // π©πΎ Alice makes changes while disconnected
      const aliceBranch1 = append(
        aliceChain,
        { type: 'FOO', payload: 'alice 1' },
        alice.localContext
      )
      const aliceBranch2 = append(
        aliceBranch1,
        { type: 'FOO', payload: 'alice 2' },
        alice.localContext
      )

      // π¨π»βπ¦² Bob makes changes while disconnected
      const bobBranch = append(bobChain, { type: 'FOO', payload: 'bob' }, bob.localContext)

      // π©πΎπ¨π»βπ¦² They sync back up
      const aliceMerged = merge(aliceBranch2, bobBranch)
      const bobMerged = merge(bobBranch, aliceBranch2)

      // Both chains have changed
      expect(aliceMerged).not.toEqual(aliceBranch2)
      expect(bobMerged).not.toEqual(bobBranch)

      // but they're in sync with each other now
      expect(aliceMerged).toEqual(bobMerged)

      // The merged chains have five links: ROOT, bob's change, alice's two changes, and MERGE
      expect(Object.keys(aliceMerged.links)).toHaveLength(5)
    })

    test(`can't merge chains with different roots`, () => {
      const aliceChain = create('a', alice.localContext)
      const bobChain = create('b', bob.localContext)

      // nope
      const tryToMerge = () => merge(aliceChain, bobChain)
      expect(tryToMerge).toThrow()
    })
  })
})
