import { Request, Response } from 'express';
import { ClientService } from '../services/client.service.js';
import { createClientSchema, updateClientSchema } from '../utils/validation.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid client data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const client = await ClientService.createClient(parseResult.data);
    sendSuccess(res, client, 'Client created successfully', 201);
  } catch (error: unknown) {
    sendError(res, 'Failed to create client', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getClients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const clients = await ClientService.getClients();
    sendSuccess(res, clients, 'Clients retrieved successfully');
  } catch (error: unknown) {
    sendError(res, 'Failed to retrieve clients', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const getClientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await ClientService.getClientById(req.params.id);
    sendSuccess(res, client, 'Client retrieved successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      sendError(res, 'Client not found', 404, 'NOT_FOUND');
      return;
    }
    sendError(res, 'Failed to retrieve client', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = updateClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      sendError(res, 'Invalid client update data', 400, 'VALIDATION_ERROR', parseResult.error.issues);
      return;
    }

    const client = await ClientService.updateClient(req.params.id, parseResult.data);
    sendSuccess(res, client, 'Client updated successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      sendError(res, 'Client not found', 404, 'NOT_FOUND');
      return;
    }
    sendError(res, 'Failed to update client', 500, 'INTERNAL_SERVER_ERROR');
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    await ClientService.deleteClient(req.params.id);
    sendSuccess(res, null, 'Client deleted successfully');
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
      sendError(res, 'Client not found', 404, 'NOT_FOUND');
      return;
    }
    sendError(res, 'Failed to delete client', 500, 'INTERNAL_SERVER_ERROR');
  }
};
