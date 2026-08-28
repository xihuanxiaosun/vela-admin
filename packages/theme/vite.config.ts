import { createLibraryConfig } from '../../tooling/vite/create-library-config.ts'

export default createLibraryConfig({
  entries: {
    index: 'src/index.ts',
    styles: 'src/styles-entry.ts',
  },
  vue: true,
})
