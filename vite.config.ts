import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function singleHtmlPlugin(): Plugin {
  return {
    name: 'single-html-output',
    apply: 'build',
    writeBundle(options, bundle) {
      const script = Object.values(bundle).find((file) => file.type === 'chunk' && file.isEntry)
      const styles = Object.values(bundle).find((file) => file.type === 'asset' && file.fileName.endsWith('.css'))

      if (!script || script.type !== 'chunk' || !styles || styles.type !== 'asset' || !options.dir) {
        this.error(`Could not generate the standalone HTML file. Bundle files: ${Object.keys(bundle).join(', ')}`)
      }

      const inlineScript = `<script type="module">${script.code.replace(/<\/script/gi, '<\\/script')}</script>`
      const inlineStyles = `<style>${String(styles.source).replace(/<\/style/gi, '<\\/style')}</style>`
      const template = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
      const source = template.replace('<script type="module" src="/src/main.tsx"></script>', () => `${inlineStyles}${inlineScript}`)
      const shell = source.replace(inlineScript, '').replace(inlineStyles, '')

      if (shell.includes('/assets/') || shell.includes('src/main.tsx')) {
        this.error('The standalone HTML still contains an external asset reference.')
      }

      const outputDirectory = resolve(process.cwd(), options.dir)
      writeFileSync(resolve(outputDirectory, 'index.html'), source, 'utf8')
      writeFileSync(resolve(process.cwd(), 'neondrop.html'), source, 'utf8')
      unlinkSync(resolve(outputDirectory, script.fileName))
      unlinkSync(resolve(outputDirectory, styles.fileName))
      rmdirSync(resolve(outputDirectory, 'assets'))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), singleHtmlPlugin()],
})
