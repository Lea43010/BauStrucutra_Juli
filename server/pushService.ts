import { storage } from './storage';
import type { PushSubscriptionRecord } from '@shared/schema';

let webPush: any = null;

async function getWebPush() {
  if (!webPush) {
    try {
      webPush = await import('web-push');
      const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
      if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        webPush.setVapidDetails(
          'mailto:support@bau-structura.de',
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        );
      } else {
        console.warn('VAPID keys missing, push notifications disabled');
      }
    } catch (err) {
      console.error('web-push module not available', err);
      webPush = null;
    }
  }
  return webPush;
}

export class PushService {
  async sendToUser(userId: string, payload: Record<string, any>): Promise<void> {
    const subs = await storage.getPushSubscriptionsByUser(userId);
    const wp = await getWebPush();
    if (!wp) return;
    await Promise.all(
      subs.map(sub => this.send(sub, payload, wp))
    );
  }

  private async send(sub: PushSubscriptionRecord, payload: any, wp: any) {
    try {
      await wp.sendNotification(sub.subscription, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to send push', err);
    }
  }
}

export const pushService = new PushService();
