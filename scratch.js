// example usage - run `pnpm build` first, to create data/wordnet.parquet
import floornet from './src/index.js'

// const wn = floornet('./data/wordnet.parquet')
const wn = floornet('https://snip.spencermountain.dev/2026/08/wordnet.parquet')

// dictionary lookup
const word = await wn.getWord('strike')
console.log(`\n== ${word.title} ==  ${word.pos().join(', ')}`)
word.senses('verb').slice(0, 4).forEach(s => {
  console.log(`\n  ${s.id}  (${s.lexfile})`)
  console.log(`    ${s.description}`)
  console.log(`    synonyms: [${s.synonyms().map(w => w.title).join(', ')}]`)
  console.log(`    antonyms: [${s.antonyms().map(w => w.title).join(', ')}]`)
})

// all known data for one sense
console.log('\n== sense.json() ==')
console.log(word.senses('verb')[0].json())

// hop word → sense → synonym Word → its senses
const hasSyn = word.senses().find(s => s.synonyms().length > 0)
const syn = hasSyn.synonyms()[0]
await syn.fetch()
console.log(`\n== hop to '${syn.title}' ==`)
console.log(syn.definitions().slice(0, 3))

// up + down the hierarchy
const dog = await wn.getWord('dog')
const sense = dog.senses('noun')[0]
console.log('\n== dog ==')
console.log(`  ${sense.definition}`)
console.log('  hypernyms:', sense.hypernyms().map(w => w.title))
console.log('  hyponyms:', sense.hyponyms().map(w => w.title).slice(0, 8))
console.log('  meronyms:', sense.meronyms().map(w => w.title))

// one-shot helpers
console.log('\n== one-shots ==')
console.log(await wn.define('serendipity'))
console.log('syn:', await wn.synonyms('happy'))
console.log('ant:', await wn.antonyms('happy'))

// misses are graceful
const nope = await wn.getWord('quixotrontic')
console.log('\nfound:', nope.found, '| senses:', nope.senses().length)

await wn.close()
