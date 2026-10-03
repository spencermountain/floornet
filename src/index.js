import { fileURLToPath } from 'node:url'
import { asyncBufferFromUrl } from 'hyparquet'
import Floornet, { Word, Sense } from './floornet.js'

const defaultPath = fileURLToPath(new URL('../data/wordnet.parquet', import.meta.url))
const openFile = async path => {
  if (/^https?:\/\//i.test(path)) {
    return asyncBufferFromUrl({ url: path })
  }
  const { asyncBufferFromFile } = await import('hyparquet/src/node.js')
  return asyncBufferFromFile(path)
}
const floornet = (path = defaultPath) => new Floornet(path, openFile)

export default floornet
export { Word, Sense }
