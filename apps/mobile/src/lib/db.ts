import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabaseSync('pos_offline.db')

export const initDB = () => {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS offline_transactions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS cached_products (
        id TEXT PRIMARY KEY,
        name TEXT,
        barcode TEXT,
        price REAL,
        stock INTEGER,
        categoryName TEXT,
        branchId TEXT,
        updatedAt TEXT
      );
    `)
  } catch (e) {
    console.error('initDB error:', e)
  }
}

export interface CachedProduct {
  id: string
  name: string
  barcode: string
  price: number
  stock: number
  categoryName: string
  branchId: string
}

export interface OfflineTrx {
  id: string
  data: string
  synced: number
  createdAt: string
}

export const cacheProducts = (products: CachedProduct[]) => {
  try {
    db.execSync('DELETE FROM cached_products')
    const stmt = db.prepareSync(
      'INSERT OR REPLACE INTO cached_products VALUES (?,?,?,?,?,?,?,?)'
    )
    for (const p of products) {
      stmt.executeSync([
        p.id, p.name, p.barcode || '',
        p.price, p.stock,
        p.categoryName || '',
        p.branchId || '',
        new Date().toISOString()
      ])
    }
    stmt.finalizeSync()
  } catch (e) {
    console.error('cacheProducts error:', e)
  }
}

export const getCachedProducts = (): CachedProduct[] => {
  try {
    return db.getAllSync('SELECT * FROM cached_products') as CachedProduct[]
  } catch {
    return []
  }
}

export const saveOfflineTransaction = (id: string, data: object) => {
  try {
    db.runSync(
      'INSERT INTO offline_transactions (id, data) VALUES (?,?)',
      [id, JSON.stringify(data)]
    )
  } catch (e) {
    console.error('saveOfflineTransaction error:', e)
  }
}

export const getUnsyncedTransactions = (): OfflineTrx[] => {
  try {
    return db.getAllSync(
      'SELECT * FROM offline_transactions WHERE synced = 0'
    ) as OfflineTrx[]
  } catch {
    return []
  }
}

export const markTransactionSynced = (id: string) => {
  try {
    db.runSync('UPDATE offline_transactions SET synced = 1 WHERE id = ?', [id])
  } catch (e) {
    console.error('markTransactionSynced error:', e)
  }
}