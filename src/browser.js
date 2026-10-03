import { asyncBufferFromUrl } from 'hyparquet'
import Floornet, { Word, Sense } from './floornet.js'

const openFile = url => asyncBufferFromUrl({ url })
const floornet = url => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new TypeError('floornet requires an HTTP(S) URL in browsers')
  }
  return new Floornet(url, openFile)
}

export default floornet
export { Word, Sense }
