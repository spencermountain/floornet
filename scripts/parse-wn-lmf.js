// single-pass tag scanner for WN-LMF xml (the english-wordnet format)
// pulls out lexical entries + synsets, ignores everything else

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

const decode = function (str) {
  if (str.includes('&') === false) {
    return str
  }
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, code) => {
    if (code[0] === '#') {
      const isHex = code[1] === 'x' || code[1] === 'X'
      let num = 0
      if (isHex === true) {
        num = parseInt(code.slice(2), 16)
      } else {
        num = parseInt(code.slice(1), 10)
      }
      return String.fromCodePoint(num)
    }
    if (ENTITIES[code] !== undefined) {
      return ENTITIES[code]
    }
    return full
  })
}

const parseAttrs = function (str) {
  const attrs = {}
  const reg = /([\w:.-]+)="([^"]*)"/g
  let m = reg.exec(str)
  while (m !== null) {
    attrs[m[1]] = decode(m[2])
    m = reg.exec(str)
  }
  return attrs
}

// princeton glosses wrap examples in quotes - strip them
const unQuote = function (str) {
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1)
  }
  return str
}

const parse = function (xml) {
  const entries = []
  const synsets = new Map()
  let entry = null
  let sense = null
  let synset = null
  let textAt = -1
  let textAttrs = {}
  const tagReg = /<(\/?)([\w:]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/g
  let m = tagReg.exec(xml)
  while (m !== null) {
    const isClose = m[1] === '/'
    const tag = m[2]
    const selfClosed = m[4] === '/'
    if (isClose === true) {
      if (tag === 'LexicalEntry') {
        entries.push(entry)
        entry = null
      } else if (tag === 'Sense') {
        sense = null
      } else if (tag === 'Synset') {
        synsets.set(synset.id, synset)
        synset = null
      } else if (tag === 'Definition' && synset !== null && textAt >= 0) {
        synset.def = decode(xml.slice(textAt, m.index).trim())
      } else if (tag === 'Example' && textAt >= 0) {
        const txt = unQuote(decode(xml.slice(textAt, m.index).trim()))
        if (sense !== null) {
          sense.examples.push(txt)
        } else if (synset !== null) {
          synset.examples.push(txt)
        }
      } else if (tag === 'Pronunciation' && entry !== null && textAt >= 0) {
        entry.pronunciations.push({ variety: textAttrs.variety || null, text: decode(xml.slice(textAt, m.index).trim()) })
      }
      textAt = -1
    } else {
      const attrs = parseAttrs(m[3])
      if (tag === 'LexicalEntry') {
        entry = { id: attrs.id, word: '', pos: '', forms: [], pronunciations: [], senses: [] }
      } else if (tag === 'Lemma' && entry !== null) {
        entry.word = attrs.writtenForm
        entry.pos = attrs.partOfSpeech
      } else if (tag === 'Form' && entry !== null) {
        entry.forms.push(attrs.writtenForm)
      } else if (tag === 'Sense' && entry !== null) {
        const obj = { id: attrs.id, synset: attrs.synset, rels: [], examples: [] }
        entry.senses.push(obj)
        if (selfClosed === false) {
          sense = obj
        }
      } else if (tag === 'SenseRelation' && sense !== null) {
        sense.rels.push({ rel: attrs.relType, target: attrs.target })
      } else if (tag === 'Synset') {
        const members = (attrs.members || '').split(/\s+/).filter(str => str !== '')
        const obj = {
          id: attrs.id,
          pos: attrs.partOfSpeech,
          ili: attrs.ili || null,
          lexfile: attrs.lexfile || attrs['dc:subject'] || null,
          members,
          def: '',
          examples: [],
          rels: []
        }
        if (selfClosed === true) {
          synsets.set(obj.id, obj)
        } else {
          synset = obj
        }
      } else if (tag === 'SynsetRelation' && synset !== null) {
        synset.rels.push({ rel: attrs.relType, target: attrs.target })
      } else if (tag === 'Definition' || tag === 'Example' || tag === 'Pronunciation') {
        if (selfClosed === false) {
          textAt = tagReg.lastIndex
          textAttrs = attrs
        }
      }
    }
    m = tagReg.exec(xml)
  }
  return { entries, synsets }
}
export default parse
