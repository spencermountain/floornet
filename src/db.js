// lazy parquet reader shared by words and senses
import { asyncBufferFromUrl, parquetMetadataAsync, parquetQuery } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'

class Db {
  constructor(path) {
    this.path = path
    this.connection = null
  }

  async open() {
    let file
    if (/^https?:\/\//.test(this.path)) {
      file = await asyncBufferFromUrl({ url: this.path })
    } else {
      const { asyncBufferFromFile } = await import('hyparquet/src/node.js')
      file = await asyncBufferFromFile(this.path)
    }
    const metadata = await parquetMetadataAsync(file)
    return { file, metadata }
  }

  async connect() {
    if (this.connection === null) {
      this.connection = this.open()
    }
    const connection = this.connection
    try {
      return await connection
    } catch (err) {
      if (this.connection === connection) {
        this.connection = null
      }
      throw err
    }
  }

  async getSenses(word) {
    const rows = await this.query({ filter: { word_low: { $eq: String(word).toLowerCase() } } })
    return rows.sort((a, b) => {
      if (a.pos < b.pos) {
        return -1
      }
      if (a.pos > b.pos) {
        return 1
      }
      return a.sense_num - b.sense_num
    })
  }

  async query({ filter, columns, rowStart, rowEnd, orderBy } = {}) {
    const { file, metadata } = await this.connect()
    return parquetQuery({ file, metadata, compressors, filter, columns, rowStart, rowEnd, orderBy })
  }

  async close() {
    this.connection = null
  }
}
export default Db
