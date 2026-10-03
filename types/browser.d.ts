import type { Floornet } from './index.js'

export * from './index.js'

/** open an HTTP(S) URL; browsers require an explicit URL */
declare const floornet: (url: string) => Floornet

export default floornet
