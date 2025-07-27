import webpush from 'web-push'

class PushService {
  constructor() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:' + (process.env.SENDER_EMAIL || 'support@bau-structura.de'),
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      )
    }
  }

  async sendPush(subscription: any, payload: { title: string; body: string }) {
    if (!subscription) return
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      console.log('Push notification sent')
    } catch (err) {
      console.error('Push notification error:', err)
    }
  }
}

export const pushService = new PushService()

