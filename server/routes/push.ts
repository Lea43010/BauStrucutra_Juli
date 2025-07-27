import type { Express } from 'express';
import { isAuthenticated } from '../localAuth';
import { storage } from '../storage';
import { pushService } from '../pushService';

export function registerPushRoutes(app: Express) {
  // register subscription for current user
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { subscription } = req.body;
      if (!subscription) return res.status(400).json({ message: 'Missing subscription' });
      const userId = req.user.id;
      await storage.createPushSubscription({ userId, subscription });
      res.json({ success: true });
    } catch (err) {
      console.error('Subscribe error', err);
      res.status(500).json({ message: 'Failed to save subscription' });
    }
  });

  // send push notification (admin only)
  app.post('/api/admin/send-push', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin required' });
      }
      const { userId, title, body } = req.body;
      if (!userId || !title || !body) {
        return res.status(400).json({ message: 'Missing fields' });
      }
      await pushService.sendToUser(userId, { title, body });
      res.json({ success: true });
    } catch (err) {
      console.error('Send push error', err);
      res.status(500).json({ message: 'Failed to send push' });
    }
  });
}
