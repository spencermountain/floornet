// example usage - run `pnpm build` first, to create data/wordnet.parquet
import floornet from './src/index.js'
const green = str => '\x1b[32m' + str + '\x1b[0m'
const red = str => '\x1b[31m' + str + '\x1b[0m'
const blue = str => '\x1b[34m' + str + '\x1b[0m'
const magenta = str => '\x1b[35m' + str + '\x1b[0m'
const cyan = str => '\x1b[36m' + str + '\x1b[0m'
const yellow = str => '\x1b[33m' + str + '\x1b[0m'
const black = str => '\x1b[30m' + str + '\x1b[0m'
const b = str => '\x1b[1m' + str + '\x1b[0m'
const dim = str => '\x1b[2m' + str + '\x1b[0m'
const i = str => '\x1b[3m' + str + '\x1b[0m'
const ul = str => '\x1b[4m' + str + '\x1b[0m'
// const wn = floornet('./data/wordnet.parquet')
const wn = floornet('https://snip.spencermountain.dev/2026/08/wordnet.parquet')

// dictionary lookup
const word = await wn.getWord('strike')
console.log(cyan(`==${word.title}==`))
word.senses().forEach(s => {
  console.log(` • ${ul(b(s.id))} - ${dim(s.description)}`)
  console.log(`     ╰ ${green(s.synonyms().map(w => w.title).join(', '))}\n`)
})
// console.log(word)

// all known data for one sense
// console.log('\n== sense.json() ==')
// console.log(word.senses('verb')[0].json())
//
// // hop word → sense → synonym Word → its senses
// const hasSyn = word.senses().find(s => s.synonyms().length > 0)
// const syn = hasSyn.synonyms()[0]
// await syn.fetch()
// console.log(`\n== hop to '${syn.title}' ==`)
// console.log(syn.definitions().slice(0, 3))
//
// // up + down the hierarchy
// const dog = await wn.getWord('dog')
// const sense = dog.senses('noun')[0]
// console.log('\n== dog ==')
// console.log(`  ${sense.definition}`)
// console.log('  hypernyms:', sense.hypernyms().map(w => w.title))
// console.log('  hyponyms:', sense.hyponyms().map(w => w.title).slice(0, 8))
// console.log('  meronyms:', sense.meronyms().map(w => w.title))
//
// // one-shot helpers
// console.log('\n== one-shots ==')
// console.log(await wn.define('serendipity'))
// console.log('syn:', await wn.synonyms('happy'))
// console.log('ant:', await wn.antonyms('happy'))
//
// // misses are graceful
// const nope = await wn.getWord('quixotrontic')
// console.log('\nfound:', nope.found, '| senses:', nope.senses().length)
//
// await wn.close()
