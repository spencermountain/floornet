/* eslint-disable no-console */
// download english wordnet + convert it to a single parquet file
//   usage: node scripts/build-parquet.js [outFile]
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import writeParquet from './parquet_lib.js'
import parse from './parse-wn-lmf.js'
import buildRows from './build-rows.js'

const wordnetUrl = process.env.WORDNET_URL || 'https://en-word.net/static/english-wordnet-2025.xml.gz'
const dataDir = fileURLToPath(new URL('../data/', import.meta.url))
const gzPath = path.join(dataDir, 'english-wordnet.xml.gz')
const outPath = process.argv[2] || path.join(dataDir, 'wordnet.parquet')

const download = async function () {
  if (fs.existsSync(gzPath) === true) {
    console.log(`using cached ${gzPath}`)
    return
  }
  console.log(`downloading ${wordnetUrl}`)
  const res = await fetch(wordnetUrl)
  if (res.ok === false) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(gzPath, buf)
  console.log(`  saved ${(buf.length / 1e6).toFixed(1)}mb`)
}

const main = async function () {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  await download()
  console.log('parsing xml...')
  const xml = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8')
  const parsed = parse(xml)
  console.log(`  ${parsed.entries.length} entries, ${parsed.synsets.size} synsets`)
  const rows = buildRows(parsed)
  console.log(`  ${rows.length} sense rows`)
  console.log('writing parquet...')
  writeParquet(rows, outPath)
  const mb = (fs.statSync(outPath).size / 1e6).toFixed(1)
  console.log(`done: ${outPath} (${mb}mb)`)
}
main()
