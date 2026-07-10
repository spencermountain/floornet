// one meaning of a word - one row of the parquet file
import Word from './word.js'

class Sense {
  constructor(row, db) {
    this.row = row
    this.db = db
  }

  get id() {
    return this.row.sense_id
  }

  get word() {
    return this.row.word
  }

  get pos() {
    return this.row.pos
  }

  get definition() {
    return this.row.definition
  }

  // alias
  get description() {
    return this.row.definition
  }

  get examples() {
    return this.row.examples
  }

  get synset() {
    return this.row.synset
  }

  // topical domain, like 'verb.contact'
  get lexfile() {
    return this.row.lexfile
  }

  // unfetched Word objects - do `await word.fetch()` to keep hopping
  makeWords(titles) {
    const uniq = [...new Set(titles)].filter(str => str !== this.row.word)
    return uniq.map(str => new Word(str, null, this.db))
  }

  // words from sense-level relations
  senseRel(rels) {
    return this.row.sense_rels.filter(r => rels.includes(r.rel)).map(r => r.word)
  }

  // words from synset-level relations
  synsetRel(rels) {
    return this.row.synset_rels.filter(r => rels.includes(r.rel)).map(r => r.words).flat()
  }

  synonyms() {
    return this.makeWords(this.row.synonyms)
  }

  antonyms() {
    return this.makeWords(this.senseRel(['antonym']))
  }

  hypernyms() {
    return this.makeWords(this.synsetRel(['hypernym', 'instance_hypernym']))
  }

  hyponyms() {
    return this.makeWords(this.synsetRel(['hyponym', 'instance_hyponym']))
  }

  meronyms() {
    return this.makeWords(this.synsetRel(['mero_member', 'mero_part', 'mero_substance']))
  }

  holonyms() {
    return this.makeWords(this.synsetRel(['holo_member', 'holo_part', 'holo_substance']))
  }

  similar() {
    return this.makeWords(this.synsetRel(['similar']))
  }

  // any relation by name, like 'derivation' or 'causes'
  related(rel) {
    return this.makeWords(this.senseRel([rel]).concat(this.synsetRel([rel])))
  }

  json() {
    return { id: this.id, ...this.row }
  }
}
export default Sense
