// floornet - wordnet-in-a-parquet-file
//   const wn = floornet('./data/wordnet.parquet')
//   const word = await wn.getWord('strike')
import Db from './db.js'
import Word from './word.js'
import Sense from './sense.js'

class Floornet {
  constructor(path) {
    this.db = new Db(path)
  }

  // always returns a Word - check `.found`
  async getWord(str) {
    const word = new Word(str, null, this.db)
    return word.fetch()
  }

  // one-shot dictionary helpers
  async define(str) {
    const word = await this.getWord(str)
    return word.senses().map(s => ({ pos: s.pos, definition: s.definition }))
  }

  async synonyms(str) {
    const word = await this.getWord(str)
    return word.synonyms().map(w => w.title)
  }

  async antonyms(str) {
    const word = await this.getWord(str)
    return word.antonyms().map(w => w.title)
  }

  // raw sql against the 'senses' view
  async sql(query) {
    return this.db.sql(query)
  }

  async close() {
    return this.db.close()
  }
}

const floornet = function (path) {
  return new Floornet(path)
}
export default floornet
export { Word, Sense }
