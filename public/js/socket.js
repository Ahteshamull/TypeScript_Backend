// Init Socket — with full debug logging
console.log('🔌 [SOCKET.JS] ============ socket.js loaded ============');

function initSocket() {
  console.log('🔌 [SOCKET] ====== initSocket START ======');
  if (window.socket) {
    console.log('🔌 [SOCKET] Disconnecting existing socket');
    window.socket.disconnect();
  }
  
  console.log('🔌 [SOCKET] Connecting to:', window.location.origin);
  console.log('🔌 [SOCKET] Token present:', !!window.token, 'Token length:', window.token ? window.token.length : 0);
  
  window.socket = io(window.location.origin, {
    auth: { token: window.token }
  });

  window.socket.on('connect_error', (err) => {
    console.error('🔌 [SOCKET] ❌ Connection error:', err.message);
    if (err.message.includes('Authentication error')) {
      alert('Session expired. Please login again.');
      if (typeof window.logout === 'function') {
        window.logout();
      }
    }
  });

  window.socket.on('connect', () => {
    console.log('🔌 [SOCKET] ✅ Socket connected! ID:', window.socket.id);
  });

  window.socket.on('disconnect', (reason) => {
    console.log('🔌 [SOCKET] ⚠️ Socket disconnected! Reason:', reason);
  });

  window.socket.on('receive_message', (msg) => {
    if (typeof window.appendMessage === 'function') {
      window.appendMessage(msg, false);
    }
    
    const currentTargetId = document.getElementById('targetId').value;
    if (msg.sender === currentTargetId) {
      window.socket.emit('mark_seen', { messageId: msg._id, receiverId: msg.sender });
    }
  });

  window.socket.on('typing', ({ senderId }) => {
    if (senderId === document.getElementById('targetId').value) {
      document.getElementById('typingIndicator').innerText = 'User is typing...';
    }
  });

  window.socket.on('stop_typing', ({ senderId }) => {
    if (senderId === document.getElementById('targetId').value) {
      document.getElementById('typingIndicator').innerText = '';
    }
  });

  window.socket.on('message_seen', ({ messageId }) => {
    const tick = document.getElementById(`tick-${messageId}`);
    if (tick) {
      tick.className = 'seen-tick';
      tick.innerText = '✓✓';
    }
  });
  
  // ==================== WebRTC Socket Listeners ====================
  
  window.socket.on('incoming_call', (data) => {
    console.log('📞🔌 [INCOMING_CALL] ====================================');
    console.log('📞🔌 [INCOMING_CALL] Call from:', data.senderId, 'isVideo:', data.isVideoCall);
    console.log('📞🔌 [INCOMING_CALL] ====================================');
    
    window.incomingCallData = data;
    const caller = window.allUsers.find(u => u._id === data.senderId);
    const callerName = caller ? caller.name : data.senderId;
    console.log('📞🔌 [INCOMING_CALL] Caller name:', callerName);
    
    document.getElementById('incomingCallText').innerText = callerName;
    document.getElementById('incomingCallType').innerText = data.isVideoCall ? 'Incoming Video Call...' : 'Incoming Audio Call...';
    document.getElementById('incomingAvatar').innerText = (callerName || 'U').charAt(0);
    document.getElementById('incomingCallOverlay').classList.remove('hidden');
    
    console.log('📞🔌 [INCOMING_CALL] Emitting call_ringing back to:', data.senderId);
    window.socket.emit('call_ringing', { receiverId: data.senderId });
    
    if (typeof window.playRingtone === 'function') {
      window.playRingtone(false);
    } else {
      console.error('📞🔌 [INCOMING_CALL] ❌ playRingtone function NOT AVAILABLE!');
    }
    if (typeof window.showCallNotification === 'function') {
      window.showCallNotification(callerName, data.isVideoCall);
    }
  });

  window.socket.on('call_answered', async (data) => {
    console.log('📞🔌 [CALL_ANSWERED] ====================================');
    console.log('📞🔌 [CALL_ANSWERED] Call answered by:', data.senderId);
    console.log('📞🔌 [CALL_ANSWERED] Now caller should createOffer');
    console.log('📞🔌 [CALL_ANSWERED] ====================================');
    
    if (typeof window.stopRingtone === 'function') {
      window.stopRingtone();
    }
    document.getElementById('callStatusText').innerText = 'Connected... Establishing connection';
    
    if (typeof window.createOffer === 'function') {
      console.log('📞🔌 [CALL_ANSWERED] Calling createOffer()...');
      await window.createOffer();
      console.log('📞🔌 [CALL_ANSWERED] ✅ createOffer() completed');
    } else {
      console.error('📞🔌 [CALL_ANSWERED] ❌ createOffer function NOT AVAILABLE! This is a critical error.');
      console.error('📞🔌 [CALL_ANSWERED] Available window call functions:', 
        ['createOffer', 'handleOffer', 'handleAnswer', 'initiateCall', 'acceptCall', 'endCall']
          .map(fn => `${fn}: ${typeof window[fn]}`)
          .join(', ')
      );
    }
  });

  window.socket.on('call_ringing', (data) => {
    console.log('📞🔌 [CALL_RINGING] Receiver is ringing');
    document.getElementById('callStatusText').innerText = 'Ringing...';
  });

  window.socket.on('webrtc_offer', async (data) => {
    console.log('📞🔌 [WEBRTC_OFFER] ====================================');
    console.log('📞🔌 [WEBRTC_OFFER] Received offer from:', data.senderId);
    console.log('📞🔌 [WEBRTC_OFFER] Offer type:', data.offer?.type);
    console.log('📞🔌 [WEBRTC_OFFER] peerConnection exists:', !!window.peerConnection);
    console.log('📞🔌 [WEBRTC_OFFER] ====================================');
    
    if (typeof window.handleOffer === 'function') {
      console.log('📞🔌 [WEBRTC_OFFER] Calling handleOffer()...');
      await window.handleOffer(data.offer);
      console.log('📞🔌 [WEBRTC_OFFER] ✅ handleOffer() completed');
    } else {
      console.error('📞🔌 [WEBRTC_OFFER] ❌ handleOffer function NOT AVAILABLE!');
    }
  });

  window.socket.on('webrtc_answer', async (data) => {
    console.log('📞🔌 [WEBRTC_ANSWER] ====================================');
    console.log('📞🔌 [WEBRTC_ANSWER] Received answer from:', data.senderId);
    console.log('📞🔌 [WEBRTC_ANSWER] Answer type:', data.answer?.type);
    console.log('📞🔌 [WEBRTC_ANSWER] peerConnection exists:', !!window.peerConnection);
    if (window.peerConnection) {
      console.log('📞🔌 [WEBRTC_ANSWER] peerConnection signaling state:', window.peerConnection.signalingState);
    }
    console.log('📞🔌 [WEBRTC_ANSWER] ====================================');
    
    if (typeof window.handleAnswer === 'function') {
      console.log('📞🔌 [WEBRTC_ANSWER] Calling handleAnswer()...');
      await window.handleAnswer(data.answer);
      console.log('📞🔌 [WEBRTC_ANSWER] ✅ handleAnswer() completed');
    } else {
      console.error('📞🔌 [WEBRTC_ANSWER] ❌ handleAnswer function NOT AVAILABLE!');
    }
  });

  window.socket.on('webrtc_ice_candidate', async (data) => {
    const hasPc = !!window.peerConnection;
    const hasRemoteDesc = hasPc && window.peerConnection.remoteDescription && window.peerConnection.remoteDescription.type;
    console.log('📞🔌 [ICE-IN] Received ICE candidate | peerConnection:', hasPc, '| remoteDescription:', !!hasRemoteDesc);
    
    if (hasPc && hasRemoteDesc) {
      try { 
        await window.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('📞🔌 [ICE-IN] ✅ ICE candidate added directly');
      } catch (e) {
        console.error('📞🔌 [ICE-IN] ❌ Failed to add ICE candidate:', e.message);
      }
    } else {
      console.log('📞🔌 [ICE-IN] ⏳ Queuing ICE candidate (queue size:', window.iceCandidateQueue.length + 1, ')');
      window.iceCandidateQueue.push(data.candidate);
    }
  });

  window.socket.on('end_call', () => {
    console.log('📞🔌 [END_CALL] Remote end_call received');
    if (typeof window.stopRingtone === 'function') {
      window.stopRingtone();
    }
    if (window.activeCallNotification) {
      window.activeCallNotification.close();
      window.activeCallNotification = null;
    }
    if (typeof window.endCall === 'function') {
      window.endCall(false);
    }
  });
  
  console.log('🔌 [SOCKET] ✅ All socket listeners registered');
}

// Expose to window
window.initSocket = initSocket;
console.log('🔌 [SOCKET.JS] ✅ initSocket exposed to window');
