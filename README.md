<div align="center">
  <div><b>floornet</b></div>
  <img src="https://user-images.githubusercontent.com/399657/68222691-6597f180-ffb9-11e9-8a32-a7f38aa8bded.png"/>
  <div>wordnet as a parquet file</div>
  <div><code>npm install floornet</code></div>
  <div align="center">
    <sub>
      by
      <a href="https://github.com/spencermountain">Spencer Kelly</a>
    </sub>
  </div>
  <img height="25px" src="https://user-images.githubusercontent.com/399657/68221824-09809d80-ffb8-11e9-9ef0-6ed3574b0ce8.png"/>
</div>

<div align="center">
  <div>
    <a href="https://npmjs.org/package/floornet">
    <img src="https://img.shields.io/npm/v/floornet.svg?style=flat-square" />
  </a>
  <a href="https://bundlephobia.com/result?p=floornet">
    <img src="https://badgen.net/bundlejs/min/floornet" />
  </a>
  </div>
</div>

<!-- spacer -->
<img height="20px" src="https://user-images.githubusercontent.com/399657/68221862-17ceb980-ffb8-11e9-87d4-7b30b6488f16.png"/>

WordNet compressed as a single Parquet file, with a small [hyparquet](https://github.com/hyparam/hyparquet) wrapper for querying it.

- the whole English dictionary in one **19mb file** — no server, no install-step data
- pure JavaScript runtime, with no native database dependency
- works on **remote files** too, via HTTP range-requests

The data is [Open English WordNet](https://github.com/globalwordnet/english-wordnet) — 185k senses, flattened to one row each, sorted by word, and compressed with gzip.

## setup

Requires Node.js 20 or newer. The dataset is built with hyparquet-writer and Node’s built-in gzip compression. The runtime uses hyparquet and hyparquet-compressors.

```bash
pnpm install
pnpm build        # separate Node and browser bundles
pnpm build:data   # downloads english-wordnet (11mb) → data/wordnet.parquet
```

The npm package includes `data/wordnet.parquet`. `pnpm pack` rebuilds the dataset and bundles before packaging; no data download or build is needed when installing the package.

Node uses `builds/floornet.mjs` (ESM) or `builds/floornet.cjs` (CommonJS). Browser bundlers select `builds/floornet.browser.mjs`; `floornet/browser` also selects it explicitly. The browser builds contain no Node filesystem reader or bundled dataset. Hyparquet and the decompressors are bundled in both builds.

## usage

```js
import floornet from 'floornet'

// Node: use the packaged dictionary, independent of the working directory
const wn = floornet()

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

Node also accepts a custom local path or HTTP(S) URL: `floornet('./data/wordnet.parquet')` or `floornet('https://mywebsite.com/wordnet.parquet')`. With CommonJS, use `const { default: floornet } = require('floornet')`.

### browser

Browsers require an explicit HTTP(S) URL. Host `data/wordnet.parquet` on a server that supports HTTP range requests and permits cross-origin requests when needed.

```js
import floornet from 'floornet/browser'

const wn = floornet('https://mywebsite.com/wordnet.parquet')
const word = await wn.getWord('strike')
```

For a script tag, use `builds/floornet.js` or `builds/floornet.min.js`, then call `window.floornet.default(url)`. Calling the browser build without a URL throws an error.

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

`floornet(path?)` returns a db object on Node; browsers require `floornet(url)`:

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

MIT - PRs welcome
