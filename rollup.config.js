import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy'

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
            typescript({ target: 'es5', declaration: false }),
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
            typescript({ target: 'es5', declaration: false }),
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
            typescript({ target: 'es5', declaration: false }),
        ]
    }
]
