import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const source = resolve('frontend/dist')
const target = resolve('backend/public')

if (!existsSync(source)) {
  throw new Error(`前端构建目录不存在：${source}`)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(source, target, { recursive: true })
console.log(`前端静态文件已复制到 ${target}`)
