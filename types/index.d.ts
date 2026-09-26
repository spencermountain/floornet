// type declarations for floornet (the library is plain js)
import type { ParquetQueryFilter } from 'hyparquet'

export interface QueryOptions {
  filter?: ParquetQueryFilter
  columns?: string[]
  rowStart?: number
  rowEnd?: number
  orderBy?: string
}

export type Pos = 'noun' | 'verb' | 'adjective' | 'adverb'

export interface Pronunciation {
  variety: string | null
  text: string
}

export interface SenseRel {
  rel: string
  word: string
}

export interface SynsetRel {
  rel: string
  synset: string
  words: string[]
}

// one row of the parquet file
export interface SenseData {
  id: string
  word_low: string
  word: string
  pos: Pos
  sense_num: number
  sense_id: string
  wn_sense: string
  synset: string
  ili: string | null
  lexfile: string | null
  definition: string
  examples: string[]
  synonyms: string[]
  forms: string[]
  pronunciations: Pronunciation[]
  sense_rels: SenseRel[]
  synset_rels: SynsetRel[]
}

export interface WordData {
  word: string
  senses: SenseData[]
}

export declare class Sense {
  readonly id: string
  readonly word: string
  readonly pos: Pos
  readonly definition: string
  /** alias of definition */
  readonly description: string
  readonly examples: string[]
  readonly synset: string
  /** topical domain, like 'verb.contact' */
  readonly lexfile: string | null
  /** other members of this synset, as lazy Words */
  synonyms(): Word[]
  antonyms(): Word[]
  hypernyms(): Word[]
  hyponyms(): Word[]
  meronyms(): Word[]
  holonyms(): Word[]
  similar(): Word[]
  /** any relation by name, like 'derivation' or 'causes' */
  related(rel: string): Word[]
  json(): SenseData
}

export declare class Word {
  title: string
  readonly found: boolean
  /** hydrate a lazy word - from synonyms(), antonyms(), etc */
  fetch(): Promise<this>
  senses(pos?: Pos): Sense[]
  /** unique parts-of-speech, like ['noun', 'verb'] */
  pos(): Pos[]
  definitions(pos?: Pos): string[]
  synonyms(pos?: Pos): Word[]
  antonyms(pos?: Pos): Word[]
  json(): WordData
}

declare class Floornet {
  /** always returns a Word - check `.found` */
  getWord(str: string): Promise<Word>
  define(str: string): Promise<Array<{ pos: Pos, definition: string }>>
  synonyms(str: string): Promise<string[]>
  antonyms(str: string): Promise<string[]>
  /** query parquet rows; rowEnd is exclusive, after filtering and sorting */
  query(options?: QueryOptions): Promise<Array<Record<string, unknown>>>
  close(): Promise<void>
}

/** open a local path, or a http(s) url to a parquet file */
declare function floornet(path: string): Floornet

export default floornet
export { Floornet }
