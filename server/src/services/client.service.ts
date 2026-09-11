import { prisma } from '../config/database.js';
import { CreateClientInput, UpdateClientInput } from '../utils/validation.js';

export class ClientService {
  public static async createClient(data: CreateClientInput) {
    return prisma.client.create({
      data,
    });
  }

  public static async getClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  public static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    return client;
  }

  public static async updateClient(id: string, data: UpdateClientInput) {
    await this.getClientById(id);

    return prisma.client.update({
      where: { id },
      data,
    });
  }

  public static async deleteClient(id: string) {
    await this.getClientById(id);

    return prisma.client.delete({
      where: { id },
    });
  }
}
