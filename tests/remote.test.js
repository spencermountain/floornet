import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { once } from 'node:events'
import floornet from '../src/index.js'

const path = new URL('../data/wordnet.parquet', import.meta.url).pathname

test('remote lookups use range requests and share metadata', async (t) => {
  const data = readFileSync(path)
  let heads = 0
  let bytes = 0
  let ranges = 0
  const server = createServer((req, res) => {
    res.setHeader('Accept-Ranges', 'bytes')
    if (req.method === 'HEAD') {
      heads += 1
      res.setHeader('Content-Length', data.length)
      res.end()
      return
    }
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '')
    if (match === null) {
      res.writeHead(400)
      res.end()
      return
    }
    ranges += 1
    const start = Number(match[1])
    let end = data.length - 1
    if (match[2] !== '') {
      end = Number(match[2])
    }
    const chunk = data.subarray(start, end + 1)
    bytes += chunk.length
    res.writeHead(206, {
      'Content-Length': chunk.length,
      'Content-Range': `bytes ${start}-${end}/${data.length}`
    })
    res.end(chunk)
  })
  t.after(() => new Promise((resolve, reject) => {
    server.close(err => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  }))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const remote = floornet(`http://127.0.0.1:${server.address().port}/wordnet.parquet`)
  const local = floornet(path)
  t.after(() => Promise.all([remote.close(), local.close()]))
  const [dog, car] = await Promise.all([remote.getWord('DOG'), remote.getWord('car')])
  assert.deepEqual(dog.json(), (await local.getWord('DOG')).json())
  assert.deepEqual(car.json(), (await local.getWord('car')).json())
  assert.equal(heads, 1)
  assert.ok(ranges > 0)
  assert.ok(bytes < data.length, `read ${bytes} of ${data.length} bytes`)
})
