import { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'

const displayClients = new Set<WebSocket>()

export default async function customerDisplayRoutes(app: FastifyInstance) {
  // WebSocket untuk Customer Display (browser web)
  app.get('/ws/display', { websocket: true }, (socket) => {
    console.log('✅ Customer display connected')
    displayClients.add(socket)

    socket.on('close', () => {
      displayClients.delete(socket)
      console.log('❌ Customer display disconnected')
    })
  })

  // WebSocket untuk Kasir (Flutter HP)
  app.get('/ws/kasir', { websocket: true }, (socket) => {
    console.log('✅ Kasir connected via WebSocket')

    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        const message = JSON.stringify(data)
        // Broadcast ke semua display client
        displayClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message)
          }
        })
      } catch (e) {
        console.error('WebSocket message error:', e)
      }
    })

    socket.on('close', () => {
      console.log('❌ Kasir disconnected')
    })
  })

  // REST fallback — Flutter bisa POST kalau WebSocket gagal
  app.post('/display/update', async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const message = JSON.stringify({ type: 'cart_update', ...body })
    displayClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
    return reply.send({ ok: true, clients: displayClients.size })
  })
}