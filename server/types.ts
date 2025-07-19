import { Request, Response } from 'express';

export interface SecurityRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "manager" | "user";
    email?: string;
  };
  securityContext?: {
    userId: string;
    isAdmin: boolean;
  };
}

export type SecurityResponse = Response;