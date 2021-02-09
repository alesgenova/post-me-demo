import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy'
import { getBabelOutputPlugin } from '@rollup/plugin-babel';

export default [
    {
        input: 'src/parent.ts',
        output: [
            {
                file: '../../dist/mpi/parent.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
            copy({
                targets: [
                    { src: 'src/index.html', dest: '../../dist/mpi' }
                ]
            })
        ]
    },
    {
        input: 'src/worker.ts',
        output: [
            {
                file: '../../dist/mpi/worker.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
        ]
    }
]
