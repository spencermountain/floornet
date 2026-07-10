// download english wordnet + convert it to a single parquet file
//   usage: node scripts/build-parquet.js [outFile]
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { DuckDBInstance } from '@duckdb/node-api'
import parse from './parse-wn-lmf.js'
import buildRows from './build-rows.js'

const URL = process.env.WORDNET_URL || 'https://en-word.net/static/english-wordnet-2025.xml.gz'
const dataDir = path.join(import.meta.dirname, '../data')
const gzPath = path.join(dataDir, 'english-wordnet.xml.gz')
const jsonlPath = path.join(dataDir, 'rows.jsonl')
const outPath = process.argv[2] || path.join(dataDir, 'wordnet.parquet')

const download = async function () {
  if (fs.existsSync(gzPath) === true) {
    console.log(`using cached ${gzPath}`)
    return
  }
  console.log(`downloading ${URL}`)
  const res = await fetch(URL)
  if (res.ok === false) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(gzPath, buf)
  console.log(`  saved ${(buf.length / 1e6).toFixed(1)}mb`)
}

const writeJsonl = function (rows) {
  const fd = fs.openSync(jsonlPath, 'w')
  const batch = 10000
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch).map(r => JSON.stringify(r)).join('\n') + '\n'
    fs.writeSync(fd, chunk)
  }
  fs.closeSync(fd)
}

// small row-groups keep http range-request reads cheap later on
const toParquet = async function () {
  const db = await DuckDBInstance.create(':memory:')
  const conn = await db.connect()
  const columns = [
    "word_low: 'VARCHAR'",
    "word: 'VARCHAR'",
    "pos: 'VARCHAR'",
    "sense_num: 'INTEGER'",
    "sense_id: 'VARCHAR'",
    "wn_sense: 'VARCHAR'",
    "synset: 'VARCHAR'",
    "ili: 'VARCHAR'",
    "lexfile: 'VARCHAR'",
    "definition: 'VARCHAR'",
    "examples: 'VARCHAR[]'",
    "synonyms: 'VARCHAR[]'",
    "forms: 'VARCHAR[]'",
    "pronunciations: 'STRUCT(variety VARCHAR, text VARCHAR)[]'",
    "sense_rels: 'STRUCT(rel VARCHAR, word VARCHAR)[]'",
    "synset_rels: 'STRUCT(rel VARCHAR, synset VARCHAR, words VARCHAR[])[]'"
  ].join(', ')
  const sql = `COPY (
    SELECT * FROM read_json('${jsonlPath}', format='newline_delimited', columns={${columns}})
    ORDER BY word_low, pos, sense_num
  ) TO '${outPath}' (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 10000)`
  await conn.run(sql)
  conn.closeSync()
  db.closeSync()
}

const main = async function () {
  await download()
  console.log('parsing xml...')
  const xml = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8')
  const parsed = parse(xml)
  console.log(`  ${parsed.entries.length} entries, ${parsed.synsets.size} synsets`)
  const rows = buildRows(parsed)
  console.log(`  ${rows.length} sense rows`)
  writeJsonl(rows)
  console.log('writing parquet...')
  await toParquet()
  fs.unlinkSync(jsonlPath)
  const mb = (fs.statSync(outPath).size / 1e6).toFixed(1)
  console.log(`done: ${outPath} (${mb}mb)`)
}
main()
