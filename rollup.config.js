import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy'
import { getBabelOutputPlugin } from '@rollup/plugin-babel';

export default [
    {
        input: 'src/parent.ts',
        output: [
            {
                file: 'dist/parent.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
            copy({
                targets: [
                    { src: 'src/index.html', dest: 'dist' }
                ]
            })
        ]
    },
    {
        input: 'src/child.ts',
        output: [
            {
                file: 'dist/child.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
            copy({
                targets: [
                    { src: 'src/child.html', dest: 'dist' }
                ]
            })
        ]
    },
    {
        input: 'src/worker.ts',
        output: [
            {
                file: 'dist/worker.js'
            }
        ],
        plugins: [
            resolve(),
            typescript({ target: 'esnext', declaration: false }),
            getBabelOutputPlugin({ presets: ['@babel/preset-env'] }),
        ]
    }
]
