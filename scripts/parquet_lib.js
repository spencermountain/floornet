import { gzipSync } from 'node:zlib'
import { parquetWriteFile } from 'hyparquet-writer'

const rowGroupSize = 10000
const sortKeys = ['word_low', 'pos']
const strings = ['word_low', 'word', 'pos', 'sense_id', 'wn_sense', 'synset', 'ili', 'lexfile', 'definition']
const lists = ['examples', 'synonyms', 'forms']
const columns = [...strings.slice(0, 3), 'sense_num', ...strings.slice(3), ...lists, 'pronunciations', 'sense_rels', 'synset_rels']

const string = name => ({ name, type: 'BYTE_ARRAY', converted_type: 'UTF8', repetition_type: 'OPTIONAL' })

// Standard three-level lists preserve empty arrays and nested relation structs.
const list = (name, fields) => [
  { name, num_children: 1, converted_type: 'LIST', repetition_type: 'OPTIONAL' },
  { name: 'list', num_children: 1, repetition_type: 'REPEATED' },
  ...fields
]
const struct = fields => [
  { name: 'element', num_children: fields.length, repetition_type: 'OPTIONAL' },
  ...fields.flat()
]
const schema = [
  { name: 'schema', num_children: columns.length },
  ...strings.slice(0, 3).map(string),
  { name: 'sense_num', type: 'INT32', repetition_type: 'OPTIONAL' },
  ...strings.slice(3).map(string),
  ...lists.flatMap(name => list(name, [string('element')])),
  ...list('pronunciations', struct([string('variety'), string('text')])),
  ...list('sense_rels', struct([string('rel'), string('word')])),
  ...list('synset_rels', struct([
    string('rel'), string('synset'), list('words', [string('element')])
  ]))
]

const compareRows = (a, b) => {
  for (let i = 0; i < sortKeys.length; i += 1) {
    const key = sortKeys[i]
    if (a[key] !== b[key]) {
      return a[key] < b[key] ? -1 : 1
    }
  }
  return a.sense_num - b.sense_num
}

const writeParquet = (rows, filename) => {
  rows.sort(compareRows)
  parquetWriteFile({
    filename,
    columnData: columns.map(name => ({ name, data: rows.map(row => row[name]) })),
    schema,
    rowGroupSize,
    statistics: true,
    codec: 'GZIP',
    compressors: { GZIP: gzipSync }
  })
}

export default writeParquet
