import Db from './db.js'
import Word from './word.js'
import Sense from './sense.js'

class Floornet {
  constructor(path, openFile) {
    this.db = new Db(path, openFile)
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

  // read rows with hyparquet filters and column selection
  async query(options) {
    return this.db.query(options)
  }

  async close() {
    return this.db.close()
  }
}

export default Floornet
export { Word, Sense }
