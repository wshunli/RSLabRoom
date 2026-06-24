// 极简的管理员会话：登录成功后签发一个内存 token，管理端接口校验 Bearer token。
// 进程重启后 token 失效（历史库无会话表，不持久化）。

import { randomBytes } from 'node:crypto'

const tokens = new Map() // token -> { username, createdAt }

export function issueToken(username) {
  const token = randomBytes(24).toString('hex')
  tokens.set(token, { username, createdAt: Date.now() })
  return token
}

export function revokeToken(token) {
  tokens.delete(token)
}

export function getSession(token) {
  return token ? tokens.get(token) : undefined
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const session = getSession(token)
  if (!session) {
    return res.status(401).json({ error: '未登录或登录已失效' })
  }
  req.admin = session
  next()
}
