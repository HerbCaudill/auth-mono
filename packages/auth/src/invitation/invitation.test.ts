import { generateProof, randomSeed, create, validate } from '@/invitation'
import * as keyset from '@/keyset'

const { TEAM_SCOPE } = keyset
const { MEMBER } = keyset.KeyType

describe('invitations', () => {
  const teamKeys = keyset.create(TEAM_SCOPE)

  test('create invitation', () => {
    const seed = randomSeed()
    const invitation = create({ teamKeys, invitee: { type: MEMBER, name: 'bob' }, seed })

    // looks like an invitation
    expect(seed).toHaveLength(16)
    expect(invitation).toHaveProperty('id')
    expect(invitation.id).toHaveLength(15)
    expect(invitation).toHaveProperty('encryptedBody')
  })

  test('validate member invitation', () => {
    // ๐ฉ๐พ Alice generates a secret key and sends it to ๐จ๐ปโ๐ฆฒ Bob via a trusted side channel.
    const seed = randomSeed()

    // ๐ฉ๐พ Alice generates an invitation with this key. Normally the invitation would be stored on the
    // team's signature chain; here we're just keeping it around in a variable.
    const invitation = create({ teamKeys, invitee: { type: MEMBER, name: 'bob' }, seed })

    // ๐จ๐ปโ๐ฆฒ Bob accepts invitation and obtains a credential proving that he was invited.
    const proofOfInvitation = generateProof(seed, 'bob')

    // ๐จ๐ปโ๐ฆฒ Bob shows up to join the team & sees ๐ณ๐ฝโโ๏ธ Charlie. Bob shows Charlie his proof of invitation, and
    // ๐ณ๐ฝโโ๏ธ Charlie checks it against the invitation that Alice posted on the signature chain.
    const validationResult = validate(proofOfInvitation, invitation, teamKeys)

    // โ
    expect(validationResult.isValid).toBe(true)
  })

  test(`you have to have the secret key to accept an invitation`, () => {
    // ๐ฉ๐พ Alice uses a secret key to create an invitation; she sends it to Bob via a trusted side channel
    const seed = 'passw0rd'
    // and uses it to create an invitation for him
    const invitation = create({ teamKeys, invitee: { type: MEMBER, name: 'bob' }, seed })

    // ๐ฆนโโ๏ธ Eve tries to accept the invitation in Bob's place, but she doesn't have the correct invitation key
    const proofOfInvitation = generateProof('horsebatterycorrectstaple', 'bob')

    // โ Nice try, Eve!!!
    const validationResult = validate(proofOfInvitation, invitation, teamKeys)
    expect(validationResult.isValid).toBe(false)
  })

  test(`even if you know the key, you can't accept someone else's invitation under your own name`, () => {
    // ๐ฉ๐พ Alice generates a secret key and sends it to Bob via a trusted side channel.
    const seed = randomSeed()
    const invitation = create({ teamKeys, invitee: { type: MEMBER, name: 'bob' }, seed })

    // ๐ฆนโโ๏ธ Eve has the secret key, so she tries to use it to get herself accepted into the group
    const proofOfInvitation = generateProof(seed, 'eve')

    // โ No dice, Eve!!! foiled again!!
    const validationResult = validate(proofOfInvitation, invitation, teamKeys)
    expect(validationResult.isValid).toBe(false)
  })
})
