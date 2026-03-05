import { FastifyInstance } from 'fastify'
import { authorizeRoles } from '../middleware/auth'
import { WebSocket } from 'ws'
// @ts-ignore
import midtransClient from 'midtrans-client'

export default async function midtransRoutes(fastify: FastifyInstance) {

  const coreApi = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  })

  const mtTrx = (coreApi as any).transaction

  function broadcastToDisplay(data: object) {
    const message = JSON.stringify(data)
    const wss = (fastify as any).websocketServer
    if (wss) {
      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    }
  }

  // POST /midtrans/qris
  fastify.post('/midtrans/qris', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  }, async (request, reply) => {
    const { orderId, amount, items } = request.body as {
      orderId: string
      amount: number
      items: { name: string; price: number; quantity: number }[]
    }

    if (!orderId || !amount || !items?.length) {
      return reply.status(400).send({ error: 'orderId, amount, dan items wajib diisi' })
    }

    try {
      const grossAmount = Math.round(amount)

      const itemDetails = items.map(i => ({
        id: i.name.toLowerCase().replace(/\s+/g, '-').substring(0, 50),
        price: Math.round(i.price),
        quantity: i.quantity,
        name: i.name.substring(0, 50),
      }))

      const itemTotal = itemDetails.reduce((s, i) => s + i.price * i.quantity, 0)

      if (itemTotal !== grossAmount) {
        itemDetails.push({
          id: 'tax-discount',
          price: grossAmount - itemTotal,
          quantity: 1,
          name: 'Pajak & Diskon',
        })
      }

      const parameter = {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        item_details: itemDetails,
        qris: { acquirer: 'gopay' },
      }

      const response = await coreApi.charge(parameter)

      const qrUrl = response.actions?.find((a: any) => a.name === 'generate-qr-code')?.url || null
      const qrString = response.qr_string || null

      // Log untuk debug
      fastify.log.info(`✅ QRIS Created: ${orderId}`)
      fastify.log.info(`🔗 QR URL: ${qrUrl}`)
      fastify.log.info(`📱 QR String: ${qrString}`)
      fastify.log.info(`📦 Full response: ${JSON.stringify(response)}`)

      broadcastToDisplay({
        type: 'qris_payment',
        orderId,
        amount: grossAmount,
        qrUrl,
        qrString,
      })

      return reply.send({
        orderId,
        qrUrl,
        qrString,
        transactionId: response.transaction_id,
        expiryTime: response.expiry_time,
      })
    } catch (err: any) {
      fastify.log.error('Midtrans error:', err)
      const msg = err?.ApiResponse?.status_message || err?.message || 'Gagal membuat QRIS'
      return reply.status(500).send({ error: msg })
    }
  })

  // POST /midtrans/webhook
  fastify.post('/midtrans/webhook', async (request, reply) => {
    const notification = request.body as any
    fastify.log.info('Midtrans webhook received:', notification)

    try {
      const statusResponse = await mtTrx.notification(notification)
      const { order_id, transaction_status, fraud_status } = statusResponse

      fastify.log.info(`Webhook: ${order_id} → ${transaction_status}`)

      const isSuccess = transaction_status === 'settlement' ||
        (transaction_status === 'capture' && fraud_status === 'accept')

      const isFailed = ['expire', 'cancel', 'deny'].includes(transaction_status)

      if (isSuccess) {
        broadcastToDisplay({
          type: 'qris_success',
          orderId: order_id,
        })

        try {
          await fastify.prisma.transaction.updateMany({
            where: { invoiceNo: order_id },
            data: { status: 'COMPLETED' }
          })
        } catch (_) {}
      }

      if (isFailed) {
        broadcastToDisplay({
          type: 'qris_failed',
          orderId: order_id,
          reason: transaction_status,
        })
      }

      return reply.send({ status: 'ok' })
    } catch (err: any) {
      fastify.log.error('Webhook error:', err)
      return reply.status(500).send({ error: err.message })
    }
  })

  // GET /midtrans/status/:orderId
  fastify.get('/midtrans/status/:orderId', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    try {
      const status = await mtTrx.status(orderId)
      return reply.send(status)
    } catch (err: any) {
      const code = err?.ApiResponse?.status_code
      if (code === '404') {
        return reply.status(404).send({ error: 'Order tidak ditemukan' })
      }
      return reply.status(500).send({ error: err.message })
    }
  })

  // DELETE /midtrans/cancel/:orderId
  fastify.delete('/midtrans/cancel/:orderId', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    try {
      await mtTrx.cancel(orderId)
      broadcastToDisplay({ type: 'qris_cancelled', orderId })
      return reply.send({ status: 'cancelled' })
    } catch (err: any) {
      return reply.status(500).send({ error: err.message })
    }
  })
}