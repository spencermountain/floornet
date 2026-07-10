// thin duckdb wrapper around one parquet file
import { DuckDBInstance } from '@duckdb/node-api'

const esc = function (str) {
  return String(str).replace(/'/g, "''")
}

class Db {
  constructor(path) {
    this.path = path
    this.instance = null
    this.conn = null
  }

  async connect() {
    if (this.conn === null) {
      this.instance = await DuckDBInstance.create(':memory:')
      this.conn = await this.instance.connect()
      // remote parquet files work over http range-requests
      if (/^https?:\/\//.test(this.path) === true) {
        await this.conn.run('INSTALL httpfs')
        await this.conn.run('LOAD httpfs')
      }
      await this.conn.run(`CREATE VIEW senses AS SELECT * FROM read_parquet('${esc(this.path)}')`)
    }
    return this.conn
  }

  // all senses of a word, as plain json objects
  async getSenses(word) {
    const conn = await this.connect()
    const sql = 'SELECT to_json(t) AS j FROM senses t WHERE word_low = ? ORDER BY pos, sense_num'
    const reader = await conn.runAndReadAll(sql, [String(word).toLowerCase()])
    return reader.getRowObjects().map(row => JSON.parse(row.j))
  }

  // escape hatch for ad-hoc sql against the 'senses' view
  async sql(query) {
    const conn = await this.connect()
    const reader = await conn.runAndReadAll(query)
    return reader.getRowObjectsJson()
  }

  async close() {
    if (this.conn !== null) {
      this.conn.closeSync()
      this.instance.closeSync()
      this.conn = null
      this.instance = null
    }
  }
}
export default Db
