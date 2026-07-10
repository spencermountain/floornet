// runs against data/wordnet.parquet - `pnpm build` first
// asserts on decades-stable wordnet facts, never on counts or wording
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import floornet from '../src/index.js'

const path = new URL('../data/wordnet.parquet', import.meta.url).pathname
if (fs.existsSync(path) === false) {
  throw new Error('missing data/wordnet.parquet - run `pnpm build` first')
}
const wn = floornet(path)
after(() => wn.close())

const titles = function (words) {
  return words.map(w => w.title)
}

test('basic lookup', async () => {
  const dog = await wn.getWord('dog')
  assert.equal(dog.found, true)
  assert.equal(dog.title, 'dog')
  assert.ok(dog.pos().includes('noun'))
  assert.ok(dog.senses('noun').length > 0)
  dog.senses().forEach(s => {
    assert.ok(s.definition.length > 0)
    assert.match(s.id, /^dog\.(noun|verb)\.\d+$/)
  })
})

test('case-insensitive + multiword lookups', async () => {
  const loud = await wn.getWord('DOG')
  assert.equal(loud.found, true)
  const phrase = await wn.getWord('give up')
  assert.ok(phrase.senses('verb').length > 0)
  const earth = await wn.getWord('earth')
  assert.ok(earth.senses().some(s => s.word === 'Earth'))
})

test('synonyms', async () => {
  const car = await wn.getWord('car')
  assert.ok(titles(car.synonyms('noun')).includes('automobile'))
})

test('antonyms are symmetric', async () => {
  const happy = await wn.getWord('happy')
  assert.ok(titles(happy.antonyms()).includes('unhappy'))
  const unhappy = await wn.getWord('unhappy')
  assert.ok(titles(unhappy.antonyms()).includes('happy'))
})

test('hypernyms + hyponyms', async () => {
  const dog = await wn.getWord('dog')
  const sense = dog.senses('noun').find(s => titles(s.hypernyms()).includes('canine'))
  assert.ok(sense !== undefined)
  assert.ok(titles(sense.hyponyms()).includes('puppy'))
})

test('hop across lazy words', async () => {
  const dog = await wn.getWord('dog')
  const sense = dog.senses('noun').find(s => titles(s.hypernyms()).includes('canine'))
  const canine = sense.hypernyms().find(w => w.title === 'canine')
  assert.throws(() => canine.senses()) // not fetched yet
  await canine.fetch()
  assert.ok(canine.senses().some(s => titles(s.hyponyms()).includes('dog')))
})

test('meronyms + holonyms', async () => {
  const tree = await wn.getWord('tree')
  assert.ok(tree.senses('noun').some(s => titles(s.meronyms()).includes('trunk')))
  const trunk = await wn.getWord('trunk')
  assert.ok(trunk.senses('noun').some(s => titles(s.holonyms()).includes('tree')))
})

test('related, by relation name', async () => {
  const happy = await wn.getWord('happy')
  const derived = happy.senses().map(s => titles(s.related('derivation'))).flat()
  assert.ok(derived.includes('happiness'))
})

test('inflected forms', async () => {
  const strike = await wn.getWord('strike')
  assert.ok(strike.senses('verb')[0].json().forms.includes('struck'))
})

test('json shapes', async () => {
  const dog = await wn.getWord('dog')
  const data = dog.json()
  assert.equal(data.word, 'dog')
  assert.ok(Array.isArray(data.senses))
  const sense = data.senses[0]
  const keys = ['id', 'word', 'pos', 'sense_id', 'synset', 'definition', 'examples', 'synonyms', 'sense_rels', 'synset_rels']
  keys.forEach(k => assert.ok(k in sense, `missing key '${k}'`))
})

test('one-shot helpers', async () => {
  const defs = await wn.define('dog')
  assert.ok(defs.length > 0)
  assert.ok(defs.every(d => d.pos.length > 0 && d.definition.length > 0))
  assert.ok((await wn.synonyms('car')).includes('automobile'))
  assert.ok((await wn.antonyms('happy')).includes('unhappy'))
})

test('raw sql', async () => {
  const rows = await wn.sql('SELECT count(*) AS n, count(DISTINCT pos) AS pos FROM senses')
  assert.ok(Number(rows[0].n) > 150000)
  assert.equal(Number(rows[0].pos), 4)
})

test('misses are graceful', async () => {
  const nope = await wn.getWord('quixotrontic')
  assert.equal(nope.found, false)
  assert.deepEqual(nope.senses(), [])
  assert.deepEqual(await wn.define('quixotrontic'), [])
})
