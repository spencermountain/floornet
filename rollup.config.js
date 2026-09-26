import terser from '@rollup/plugin-terser'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import sizeCheck from 'rollup-plugin-filesize-check'
import fs from 'node:fs'

const pkg = JSON.parse(fs.readFileSync('./package.json').toString())

const name = 'floornet'
const banner = `/* spencermountain/${name} ${pkg.version} ${pkg.license} */`
// Keep Node's filesystem reader out of browser bundles.
const external = ['hyparquet/src/node.js']
const resolve = () => nodeResolve({ browser: true })

export default [
  {
    input: 'src/index.js',
    external,
    output: [
      {
        file: `builds/${name}.mjs`,
        format: 'esm',
        banner: banner
      }
    ],
    plugins: [resolve()]
  },
  {
    input: 'src/index.js',
    external,
    output: [
      {
        // the package is "type": "module", so the commonjs build needs a .cjs extension
        file: `builds/${name}.cjs`,
        format: 'cjs',
        exports: 'named',
        banner: banner
      }
    ],
    plugins: [resolve()]
  },
  {
    input: 'src/index.js',
    external,
    output: [
      {
        file: `builds/${name}.js`,
        format: 'umd',
        exports: 'named',
        sourcemap: false,
        name: 'floornet',
        banner: banner
      }
    ],
    plugins: [resolve()]
  },
  {
    input: 'src/index.js',
    external,
    output: [
      {
        file: `builds/${name}.min.js`,
        format: 'umd',
        exports: 'named',
        name: 'floornet'
      }
    ],
    plugins: [
      resolve(),
      terser(),
      sizeCheck({
        expect: 175, // includes hyparquet and decompressors, in KiB
        warn: 10, // acceptable change (+/-)
        throw: 20 // unacceptable change (+/-)
      })
    ]
  }
]
