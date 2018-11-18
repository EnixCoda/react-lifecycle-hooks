import buble from 'rollup-plugin-buble'

export default {
  input: 'src/index.jsx',
  external: ['react-lifecycle-hooks'],
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true,
  },
  plugins: [
    buble(),
  ]
}