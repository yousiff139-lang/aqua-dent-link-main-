import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler.js';
import { adminService } from '../services/admin.service.js';

const patientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const adminController = {
  getAppointments: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.getAppointments();

    res.json({
      success: true,
      ...result,
    });
  }),

  getPatients: asyncHandler(async (req: Request, res: Response) => {
    const params = patientQuerySchema.parse(req.query);
    const result = await adminService.getPatients(params);

    res.json({
      success: true,
      ...result,
    });
  }),

  getDentists: asyncHandler(async (_req: Request, res: Response) => {
    const result = await adminService.getDentists();

    res.json({
      success: true,
      ...result,
    });
  }),

  createDentist: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.createDentist(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  deleteDentist: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await adminService.deleteDentist(id);

    res.json({
      success: true,
      data: result,
    });
  }),

  getDashboardStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  }),

  getAnalytics: asyncHandler(async (_req: Request, res: Response) => {
    const analytics = await adminService.getAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  }),

  exportAnalytics: asyncHandler(async (_req: Request, res: Response) => {
    const analytics = await adminService.getAnalytics();
    const pdfBuffer = await adminService.generateAnalyticsPdf(analytics);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="aqua-dent-analytics.pdf"');
    res.send(pdfBuffer);
  }),
};

