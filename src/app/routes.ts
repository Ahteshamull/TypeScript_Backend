import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { UserRoutes } from '../modules/users/user.route';
import { MessageRoutes } from '../modules/messages/message.route';
import { UploadRoutes } from '../modules/uploads/upload.route';
import config from '../config';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/uploads',
    route: UploadRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

// TURN credentials endpoint for WebRTC
router.get('/turn-credentials', async (req, res) => {
  try {
    const { apiKey, appName } = config.metered;
    
    if (apiKey && appName) {
      // Fetch fresh TURN credentials from metered.ca API
      const response = await fetch(
        `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
      );
      
      if (response.ok) {
        const iceServers = await response.json();
        console.log('[TURN] Fetched metered.ca credentials, servers count:', iceServers.length);
        return res.json({ success: true, iceServers });
      } else {
        console.error('[TURN] Metered API error:', response.status, response.statusText);
      }
    }
    
    // Fallback: return standard Google STUN servers only as requested
    res.json({
      success: true,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });
  } catch (error) {
    console.error('[TURN] Error fetching credentials:', error);
    res.json({
      success: true,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });
  }
});

export default router;
