// Global State & Config Variables
window.API_URL = window.location.origin + '/api/v1';
window.token = '';
window.myUserId = '';
window.socket = null;
window.typingTimeout = null;
window.selectedMediaFile = null;
window.selectedMediaType = null;
window.mediaRecorder = null;
window.audioChunks = [];
window.isRecording = false;

// WebRTC Variables
window.peerConnection = null;
window.localStream = null;
window.remoteStream = null;
window.callReceiverId = null;
window.incomingCallData = null; 
window.callStartTime = null;
window.isCallConnected = false;
window.myIsVideoCall = false; // To track if we initiated a video or audio call
window.callRecorder = null;
window.recordedChunks = [];
// Default ICE config (STUN only as requested)
window.iceServers = { 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ] 
    };
window.isScreenSharing = false;
window.screenStream = null;
window.iceCandidateQueue = [];
window.isRecordingCall = false;

window.audioCtx = null;
window.ringInterval = null;
window.activeCallNotification = null;

// Global click listener to resume AudioContext (helps bypass autoplay policies)
document.addEventListener('click', () => {
  if (window.audioCtx && window.audioCtx.state === 'suspended') {
    window.audioCtx.resume();
  }
});

// Request Notification Permission
window.requestNotificationPermission = function() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission status:', permission);
      });
    }
  }
};

// Auto-login check when page loads
window.addEventListener('DOMContentLoaded', () => {
  // Request notification permission immediately on load
  window.requestNotificationPermission();

  const savedToken = localStorage.getItem('token');
  const savedUserId = localStorage.getItem('myUserId');
  if (savedToken && savedUserId) {
    window.token = savedToken;
    window.myUserId = savedUserId;
    document.getElementById('loginBlock').classList.add('hidden');
    document.getElementById('contactsBlock').classList.remove('hidden');
    
    // Check and run socket / users fetch if other files are loaded
    if (typeof window.initSocket === 'function') {
      window.initSocket();
    }
    if (typeof window.fetchUsers === 'function') {
      window.fetchUsers();
    }
  }
});
