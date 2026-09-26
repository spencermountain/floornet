# floornet

WordNet as a single Parquet file, with a small [hyparquet](https://github.com/hyparam/hyparquet) wrapper for querying it.

- the whole English dictionary in one **19mb file** — no server, no install-step data
- pure JavaScript runtime, with no native database dependency
- works on **remote files** too, via HTTP range-requests

The data is [Open English WordNet 2025](https://github.com/globalwordnet/english-wordnet) — 185k senses, flattened to one row each, sorted by word, and compressed with zstd.

## setup

Requires Node.js 20 or newer. DuckDB is a development dependency used only to build the dataset. The runtime uses hyparquet and hyparquet-compressors to read existing zstd files.

```bash
pnpm install
pnpm build        # Rollup → builds/floornet.{mjs,cjs,js,min.js}
pnpm build:data   # downloads english-wordnet (11mb) → data/wordnet.parquet
```

The ESM (`.mjs`) and CommonJS (`.cjs`) bundles export `default`, `Word`, and `Sense`. The browser bundles expose these on `window.floornet`; use `window.floornet.default(url)` with an HTTP(S) URL. Hyparquet and the decompressors are bundled. Local paths load hyparquet's Node filesystem reader on demand and require the installed `hyparquet` dependency.

## usage

```js
import floornet from 'floornet'

// either local:
const wn = floornet('./data/wordnet.parquet')
// or remote:
const wn = floornet('https://mywebsite.com/wordnet.parquet')

let word = await wn.getWord('strike')
word.title //'strike'
word.pos() //['noun', 'verb']

word.senses('verb').forEach(s => {
  s.id //'strike.verb.2'
  s.description //'have an emotional or cognitive impact upon'
  s.synonyms().map(w => w.title) //['affect', 'impress', 'move']
  s.antonyms().map(w => w.title) //[]
})
```

hop around the graph — word → sense → word → sense...

```js
let dog = await wn.getWord('dog')
let sense = dog.senses('noun')[0]
sense.hypernyms().map(w => w.title) //['canine', 'canid', ...]
sense.hyponyms().map(w => w.title) //['puppy', 'pooch', 'cur', ...]

// words from synonyms() etc are lazy - fetch to keep going
let puppy = sense.hyponyms()[0]
await puppy.fetch()
puppy.senses()[0].definition //'a young dog'
```

one-shot helpers:

```js
await wn.define('serendipity')
//[{ pos: 'noun', definition: 'good luck in making unexpected...' }]
await wn.synonyms('happy') //['felicitous', 'glad', 'well-chosen']
await wn.antonyms('happy') //['unhappy']
```

query rows with hyparquet filters and column selection:

```js
await wn.query({
  filter: { lexfile: { $eq: 'noun.food' } },
  columns: ['word', 'definition'],
  rowEnd: 3
})
```

`query()` replaces `sql()`; SQL is no longer supported. Options are `filter`, `columns`, `rowStart`, `rowEnd`, and `orderBy` (an ascending column name). Row offsets are zero-based, `rowEnd` is exclusive, and pagination applies after filtering and sorting. Omitting options returns all rows; selecting columns and filtering keeps reads smaller. Sorting may require reading all matching rows.

remote files just work — hyparquet uses HTTP range requests and skips row groups using column statistics:

```js
const wn = floornet('https://somewhere.com/wordnet.parquet')
```

## api

`floornet(path)` returns a db object:

| method | returns |
| --- | --- |
| `await wn.getWord(str)` | `Word` (check `.found` for misses) |
| `await wn.define(str)` | `[{pos, definition}]` |
| `await wn.synonyms(str)` / `.antonyms(str)` | `[String]` |
| `await wn.query(options?)` | `[Object]` |
| `await wn.close()` | - |

**Word** — `.title`, `.found`, `.senses(pos?)`, `.pos()`, `.definitions(pos?)`, `.synonyms(pos?)`, `.antonyms(pos?)`, `.json()`, `await .fetch()`

**Sense** — `.id`, `.word`, `.pos`, `.definition`, `.examples`, `.lexfile`, `.synonyms()`, `.antonyms()`, `.hypernyms()`, `.hyponyms()`, `.meronyms()`, `.holonyms()`, `.similar()`, `.related(rel)`, `.json()`

Word and sense traversal is synchronous because each row already embeds the words it points to. Lookups, lazy `fetch()`, and `query()` read Parquet asynchronously. Metadata is shared across lookups; `close()` clears it, and a subsequent lookup reopens the file.

## the file

One row per sense, sorted by `word_low`, in 10k-row groups — so lookups can skip unrelated row groups, locally or over HTTP. Words that span group boundaries include senses from every matching group.

| column | type | |
| --- | --- | --- |
| `word_low` | `VARCHAR` | lowercased word - the sort/lookup key |
| `word` | `VARCHAR` | display form, like *'Earth'* |
| `pos` | `VARCHAR` | noun, verb, adjective, adverb |
| `sense_num` | `INTEGER` | 1-based, per word+pos |
| `sense_id` | `VARCHAR` | *'strike.verb.1'* |
| `wn_sense` | `VARCHAR` | original oewn sense id |
| `synset` | `VARCHAR` | synset id |
| `ili` | `VARCHAR` | interlingual index id |
| `lexfile` | `VARCHAR` | domain, like *'verb.contact'* |
| `definition` | `VARCHAR` | |
| `examples` | `VARCHAR[]` | |
| `synonyms` | `VARCHAR[]` | other members of the synset |
| `forms` | `VARCHAR[]` | inflections, like *'struck'* |
| `pronunciations` | `STRUCT(variety, text)[]` | ipa |
| `sense_rels` | `STRUCT(rel, word)[]` | antonym, derivation, ... |
| `synset_rels` | `STRUCT(rel, synset, words)[]` | hypernym, hyponym, ... |

Both directions of every relation are materialized, so `hyponyms()` never depends on which side the source data recorded.

## license

Code is MIT. The data is [Open English WordNet](https://en-word.net/), released under CC BY 4.0, itself derived from Princeton WordNet.
