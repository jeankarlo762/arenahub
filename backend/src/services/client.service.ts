import { prisma } from '../config/database'
import { CreateClientInput, UpdateClientInput } from '../schemas/client.schema'

export async function listClients(search?: string) {
  return prisma.client.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) throw Object.assign(new Error('Cliente não encontrado'), { statusCode: 404 })
  return client
}

export async function createClient(input: CreateClientInput) {
  return prisma.client.create({ data: input })
}

export async function updateClient(id: string, input: UpdateClientInput) {
  await getClient(id)
  return prisma.client.update({ where: { id }, data: input })
}

export async function deleteClient(id: string) {
  await getClient(id)
  return prisma.client.delete({ where: { id } })
}
