// example usage - run `pnpm build` first, to create data/wordnet.parquet
import floornet from './src/index.js'
const green = str => '\x1b[32m' + str + '\x1b[0m'
const cyan = str => '\x1b[36m' + str + '\x1b[0m'
const b = str => '\x1b[1m' + str + '\x1b[0m'
const dim = str => '\x1b[2m' + str + '\x1b[0m'
const ul = str => '\x1b[4m' + str + '\x1b[0m'

// const wn = floornet('./data/wordnet.parquet')
const wn = floornet()
// const wn = floornet('https://snip.spencermountain.dev/2026/08/wordnet.parquet')

// dictionary lookup
const word = await wn.getWord('slouch')
console.log(cyan(`==${word.title}==`))
word.senses().forEach(s => {
  console.log(` • ${ul(b(s.id))} - ${dim(s.description)}`)
  console.log(`     ╰ ${green(s.synonyms().map(w => w.title).join(', '))}\n`)
})

// const tmp = await wn.getWord('spencer')
console.log(word.rows[0])
