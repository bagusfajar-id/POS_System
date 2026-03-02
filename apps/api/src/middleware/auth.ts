import { FastifyRequest, FastifyReply } from 'fastify'

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }
}

export const authorizeRoles = (...roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      const user = request.user as { role: string }
      if (!roles.includes(user.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource'
        })
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }
  }
}