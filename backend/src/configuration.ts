export function validateEnvironment(values: Record<string, unknown>): Record<string, unknown> {
  const port = Number(values.PORT || 3000)
  const dbPort = Number(values.DB_PORT || 3306)
  const poolSize = Number(values.DB_POOL_SIZE || 10)
  if (![port, dbPort, poolSize].every(Number.isInteger)) throw new Error('端口和连接池配置必须为整数')

  return { ...values, PORT: port, DB_PORT: dbPort, DB_POOL_SIZE: poolSize }
}
