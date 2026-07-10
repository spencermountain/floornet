// a word and all of its senses
import Sense from './sense.js'

class Word {
  constructor(title, rows, db) {
    this.title = title
    this.db = db
    this.rows = rows // null until fetched
  }

  get found() {
    return this.rows !== null && this.rows.length > 0
  }

  // hydrate a lazy word - from synonyms(), antonyms(), etc
  async fetch() {
    if (this.rows === null) {
      this.rows = await this.db.getSenses(this.title)
    }
    return this
  }

  senses(pos) {
    if (this.rows === null) {
      throw new Error(`word '${this.title}' is not loaded yet - do \`await word.fetch()\` first`)
    }
    let list = this.rows.map(row => new Sense(row, this.db))
    if (pos !== undefined) {
      list = list.filter(s => s.pos === pos)
    }
    return list
  }

  // unique parts-of-speech, like ['noun', 'verb']
  pos() {
    return [...new Set(this.senses().map(s => s.pos))]
  }

  definitions(pos) {
    return this.senses(pos).map(s => s.definition)
  }

  // flat + unique, across all senses
  gather(method, pos) {
    const all = this.senses(pos).map(s => s[method]()).flat()
    const seen = new Set()
    return all.filter(w => {
      if (seen.has(w.title) === true || w.title === this.title) {
        return false
      }
      seen.add(w.title)
      return true
    })
  }

  synonyms(pos) {
    return this.gather('synonyms', pos)
  }

  antonyms(pos) {
    return this.gather('antonyms', pos)
  }

  json() {
    return { word: this.title, senses: this.senses().map(s => s.json()) }
  }
}
export default Word
