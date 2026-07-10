# floornet

WordNet as a single Parquet file, with a small DuckDB wrapper for querying it.

- the whole English dictionary in one **19mb file** — no server, no install-step data
- ad-hoc lookups in **~10ms**
- works on **remote files** too, via HTTP range-requests

The data is [Open English WordNet 2025](https://github.com/globalwordnet/english-wordnet) — 185k senses, flattened to one row each, sorted by word, and compressed with zstd.

## setup

```bash
pnpm install
pnpm build   # downloads english-wordnet (11mb) → data/wordnet.parquet
```

## usage

```js
import floornet from 'floornet'

const wn = floornet('./data/wordnet.parquet')

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

or raw sql, against a view called `senses`:

```js
await wn.sql(`SELECT word, definition FROM senses WHERE lexfile = 'noun.food' LIMIT 3`)
```

remote files just work — DuckDB fetches only the row-groups it needs:

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
| `await wn.sql(query)` | `[Object]` |
| `await wn.close()` | - |

**Word** — `.title`, `.found`, `.senses(pos?)`, `.pos()`, `.definitions(pos?)`, `.synonyms(pos?)`, `.antonyms(pos?)`, `.json()`, `await .fetch()`

**Sense** — `.id`, `.word`, `.pos`, `.definition`, `.examples`, `.lexfile`, `.synonyms()`, `.antonyms()`, `.hypernyms()`, `.hyponyms()`, `.meronyms()`, `.holonyms()`, `.similar()`, `.related(rel)`, `.json()`

Only `getWord()` and `fetch()` hit DuckDB — everything else is synchronous, because each row already embeds the words it points to.

## the file

One row per sense, sorted by `word_low`, in 10k-row groups — so a lookup prunes to one row-group, locally or over http.

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
