import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: Array<'OWNER' | 'MANAGER' | 'BILLING' | 'ADMIN' | 'FULFILLMENT'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User session not found.',
      });
    }

    // OWNER has global override
    if (req.user.role === 'OWNER' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      data: null,
      message: `Forbidden: Access requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
    });
  };
}
