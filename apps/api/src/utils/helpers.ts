export const generateInvoiceNo = (branchCode: string): string => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `INV-${branchCode.toUpperCase()}-${dateStr}-${random}`
}

export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 10)
}

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}