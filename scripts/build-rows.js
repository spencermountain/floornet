// flatten parsed wordnet into one denormalized row per sense
// target words are embedded in each row, so lookups never need a join

const POS = { n: 'noun', v: 'verb', a: 'adjective', s: 'adjective', r: 'adverb' }

// synset-level relation inverses
const INVERSE = {
  hypernym: 'hyponym',
  hyponym: 'hypernym',
  instance_hypernym: 'instance_hyponym',
  instance_hyponym: 'instance_hypernym',
  mero_member: 'holo_member',
  holo_member: 'mero_member',
  mero_part: 'holo_part',
  holo_part: 'mero_part',
  mero_substance: 'holo_substance',
  holo_substance: 'mero_substance',
  causes: 'is_caused_by',
  is_caused_by: 'causes',
  entails: 'is_entailed_by',
  is_entailed_by: 'entails',
  domain_topic: 'has_domain_topic',
  has_domain_topic: 'domain_topic',
  domain_region: 'has_domain_region',
  has_domain_region: 'domain_region',
  exemplifies: 'is_exemplified_by',
  is_exemplified_by: 'exemplifies',
  similar: 'similar',
  also: 'also',
  attribute: 'attribute'
}

// symmetric sense-level relations
const SYMMETRIC = { antonym: true, derivation: true }

// ensure both directions of every relation exist, so hyponyms() etc always work
const addInverses = function (synsets) {
  const seen = new Set()
  synsets.forEach(syn => {
    syn.rels.forEach(r => seen.add(`${syn.id}|${r.rel}|${r.target}`))
  })
  synsets.forEach(syn => {
    syn.rels.forEach(r => {
      const inv = INVERSE[r.rel]
      const target = synsets.get(r.target)
      if (inv !== undefined && target !== undefined && seen.has(`${r.target}|${inv}|${syn.id}`) === false) {
        target.rels.push({ rel: inv, target: syn.id })
        seen.add(`${r.target}|${inv}|${syn.id}`)
      }
    })
  })
}

const addSenseInverses = function (senseById) {
  const seen = new Set()
  senseById.forEach((obj, id) => {
    obj.sense.rels.forEach(r => seen.add(`${id}|${r.rel}|${r.target}`))
  })
  senseById.forEach((obj, id) => {
    obj.sense.rels.forEach(r => {
      const target = senseById.get(r.target)
      if (SYMMETRIC[r.rel] === true && target !== undefined && seen.has(`${r.target}|${r.rel}|${id}`) === false) {
        target.sense.rels.push({ rel: r.rel, target: id })
        seen.add(`${r.target}|${r.rel}|${id}`)
      }
    })
  })
}

const buildRows = function ({ entries, synsets }) {
  const entryById = new Map()
  entries.forEach(e => entryById.set(e.id, e))
  const senseById = new Map()
  entries.forEach(e => {
    e.senses.forEach(s => senseById.set(s.id, { entry: e, sense: s }))
  })
  addInverses(synsets)
  addSenseInverses(senseById)

  // member words of a synset, in canonical order
  const wordsOf = function (syn) {
    const words = syn.members.map(id => entryById.get(id)).filter(e => e !== undefined).map(e => e.word)
    return [...new Set(words)]
  }

  const rows = []
  const counters = new Map()
  entries.forEach(e => {
    const pos = POS[e.pos] || e.pos
    e.senses.forEach(s => {
      const syn = synsets.get(s.synset)
      if (syn === undefined) {
        return
      }
      const wordLow = e.word.toLowerCase()
      const key = `${wordLow}|${pos}`
      const num = (counters.get(key) || 0) + 1
      counters.set(key, num)
      const relSeen = new Set()
      const senseRels = s.rels
        .map(r => {
          const target = senseById.get(r.target)
          if (target === undefined) {
            return null
          }
          return { rel: r.rel, word: target.entry.word }
        })
        .filter(obj => {
          if (obj === null || relSeen.has(`${obj.rel}|${obj.word}`) === true) {
            return false
          }
          relSeen.add(`${obj.rel}|${obj.word}`)
          return true
        })
      const synsetRels = syn.rels
        .map(r => {
          const target = synsets.get(r.target)
          if (target === undefined) {
            return null
          }
          return { rel: r.rel, synset: r.target, words: wordsOf(target) }
        })
        .filter(obj => obj !== null)
      rows.push({
        word_low: wordLow,
        word: e.word,
        pos,
        sense_num: num,
        sense_id: `${wordLow.replace(/ /g, '_')}.${pos}.${num}`,
        wn_sense: s.id,
        synset: s.synset,
        ili: syn.ili,
        lexfile: syn.lexfile,
        definition: syn.def,
        examples: syn.examples.concat(s.examples),
        synonyms: wordsOf(syn).filter(w => w !== e.word),
        forms: e.forms,
        pronunciations: e.pronunciations,
        sense_rels: senseRels,
        synset_rels: synsetRels
      })
    })
  })
  return rows
}
export default buildRows
