// WebRTC Call Logic — with full debug logging
console.log('📞 [CALL.JS] ============ call.js loaded ============');

function playRingtone(isOutgoing = false) {
  console.log('📞 [RINGTONE] Playing ringtone, isOutgoing:', isOutgoing);
  if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
  
  const playTone = () => {
    if (!window.audioCtx) return;
    const osc = window.audioCtx.createOscillator();
    const gain = window.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    
    if (isOutgoing) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, window.audioCtx.currentTime);
      osc.frequency.setValueAtTime(480, window.audioCtx.currentTime);
      gain.gain.setValueAtTime(0, window.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, window.audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, window.audioCtx.currentTime + 1.5);
      gain.gain.linearRampToValueAtTime(0, window.audioCtx.currentTime + 1.6);
      osc.start(window.audioCtx.currentTime);
      osc.stop(window.audioCtx.currentTime + 1.6);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, window.audioCtx.currentTime);
      osc.frequency.setValueAtTime(800, window.audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, window.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, window.audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, window.audioCtx.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, window.audioCtx.currentTime + 0.45);
      osc.start(window.audioCtx.currentTime);
      osc.stop(window.audioCtx.currentTime + 0.5);
      
      const osc2 = window.audioCtx.createOscillator();
      const gain2 = window.audioCtx.createGain();
      osc2.type = 'square';
      osc2.connect(gain2);
      gain2.connect(window.audioCtx.destination);
      osc2.frequency.setValueAtTime(600, window.audioCtx.currentTime + 0.6);
      osc2.frequency.setValueAtTime(800, window.audioCtx.currentTime + 0.7);
      gain2.gain.setValueAtTime(0, window.audioCtx.currentTime + 0.6);
      gain2.gain.linearRampToValueAtTime(0.1, window.audioCtx.currentTime + 0.65);
      gain2.gain.setValueAtTime(0.1, window.audioCtx.currentTime + 1.0);
      gain2.gain.linearRampToValueAtTime(0, window.audioCtx.currentTime + 1.05);
      osc2.start(window.audioCtx.currentTime + 0.6);
      osc2.stop(window.audioCtx.currentTime + 1.05);
    }
  };

  playTone();
  window.ringInterval = setInterval(playTone, isOutgoing ? 3000 : 2000);
}

function stopRingtone() {
  console.log('📞 [RINGTONE] Stopping ringtone');
  if (window.ringInterval) {
    clearInterval(window.ringInterval);
    window.ringInterval = null;
  }
}

// ==================== STEP 1: GET LOCAL MEDIA ====================
async function setupLocalStream(isVideoCall) {
  console.log('📞 [STEP-1] ====== setupLocalStream START ====== isVideoCall:', isVideoCall);
  try {
    const constraints = { 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }, 
      video: isVideoCall ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false 
    };
    console.log('📞 [STEP-1] getUserMedia constraints:', JSON.stringify(constraints));
    window.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    const audioTracks = window.localStream.getAudioTracks();
    const videoTracks = window.localStream.getVideoTracks();
    console.log('📞 [STEP-1] ✅ Local stream obtained!');
    console.log('📞 [STEP-1]   Audio tracks:', audioTracks.length, audioTracks.map(t => `${t.label} (${t.readyState})`));
    console.log('📞 [STEP-1]   Video tracks:', videoTracks.length, videoTracks.map(t => `${t.label} (${t.readyState})`));
    
    const localVideoEl = document.getElementById('localVideo');
    if (localVideoEl) {
      localVideoEl.srcObject = window.localStream;
      console.log('📞 [STEP-1]   Local video element srcObject set');
    } else {
      console.error('📞 [STEP-1] ❌ localVideo element NOT FOUND!');
    }
  } catch (err) {
    console.error('📞 [STEP-1] ❌ getUserMedia FAILED:', err.name, err.message);
    alert('Could not access Camera/Microphone: ' + err.message);
    throw err;
  }
}

// ==================== STEP 2: CREATE PEER CONNECTION ====================
function setupPeerConnection() {
  console.log('📞 [STEP-2] ====== setupPeerConnection START ======');
  
  // Close existing connection if any
  if (window.peerConnection) {
    console.log('📞 [STEP-2] Closing existing peerConnection, state was:', window.peerConnection.connectionState);
    window.peerConnection.close();
    window.peerConnection = null;
  }

  console.log('📞 [STEP-2] ICE servers config:', JSON.stringify(window.iceServers));
  window.peerConnection = new RTCPeerConnection(window.iceServers);
  console.log('📞 [STEP-2] ✅ RTCPeerConnection created');
  
  // Add local stream tracks to connection
  if (window.localStream) {
    const tracks = window.localStream.getTracks();
    console.log('📞 [STEP-2] Adding', tracks.length, 'local tracks to peer connection:');
    tracks.forEach((track, i) => {
      console.log(`📞 [STEP-2]   Track ${i}: kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, readyState=${track.readyState}`);
      window.peerConnection.addTrack(track, window.localStream);
    });
    console.log('📞 [STEP-2] ✅ All local tracks added');
  } else {
    console.error('📞 [STEP-2] ❌ NO LOCAL STREAM! Tracks cannot be added!');
  }

  // Handle incoming remote stream
  window.peerConnection.ontrack = (event) => {
    console.log('📞 [REMOTE-TRACK] ====== Remote track received ======');
    console.log('📞 [REMOTE-TRACK]   kind:', event.track.kind);
    console.log('📞 [REMOTE-TRACK]   readyState:', event.track.readyState);
    console.log('📞 [REMOTE-TRACK]   enabled:', event.track.enabled);
    console.log('📞 [REMOTE-TRACK]   muted:', event.track.muted);
    console.log('📞 [REMOTE-TRACK]   streams count:', event.streams ? event.streams.length : 0);
    
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    console.log('📞 [REMOTE-TRACK]   Using stream with', stream.getTracks().length, 'tracks');
    
    if (event.track.kind === 'video') {
      const videoElement = document.getElementById('remoteVideo');
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play().catch(e => console.warn('📞 [REMOTE-TRACK] ⚠️ Remote video autoplay blocked:', e.message));
        console.log('📞 [REMOTE-TRACK] ✅ Remote VIDEO set to remoteVideo element');
      } else {
        console.error('📞 [REMOTE-TRACK] ❌ remoteVideo element NOT FOUND!');
      }
    }
    
    if (event.track.kind === 'audio') {
      const audioElement = document.getElementById('remoteAudio');
      if (audioElement) {
        audioElement.srcObject = stream;
        audioElement.play().catch(e => console.warn('📞 [REMOTE-TRACK] ⚠️ Remote audio autoplay blocked:', e.message));
        console.log('📞 [REMOTE-TRACK] ✅ Remote AUDIO set to remoteAudio element');
      } else {
        console.error('📞 [REMOTE-TRACK] ❌ remoteAudio element NOT FOUND!');
      }
    }
    
    if (!window.remoteStream) {
      window.remoteStream = stream;
    } else {
      if (!window.remoteStream.getTracks().find(t => t.id === event.track.id)) {
        window.remoteStream.addTrack(event.track);
      }
    }

    if (window.peerConnection && window.peerConnection.connectionState === 'connected') {
      attemptStartCallRecording();
    }
  };

  // Send ICE candidates to peer
  window.peerConnection.onicecandidate = (event) => {
    if (event.candidate && window.socket) {
      const c = event.candidate;
      const type = c.type || 'unknown';
      const proto = c.protocol || '';
      const addr = c.address || '';
      const relayProto = c.relatedAddress ? ` (relayed via ${c.relatedAddress})` : '';
      console.log(`📞 [ICE-OUT] Sending ICE candidate: ${type} ${proto} ${addr}${relayProto}`);
      if (type === 'relay') {
        console.log('📞 [ICE-OUT] 🎉 TURN/RELAY candidate generated! TURN server is working!');
      }
      window.socket.emit('webrtc_ice_candidate', { receiverId: window.callReceiverId, candidate: event.candidate });
    } else if (!event.candidate) {
      console.log('📞 [ICE-OUT] ✅ ICE gathering complete (null candidate)');
    }
  };

  // Monitor ICE connection state
  window.peerConnection.oniceconnectionstatechange = () => {
    const state = window.peerConnection ? window.peerConnection.iceConnectionState : 'null';
    console.log('📞 [ICE-STATE] ICE connection state changed to:', state);
    
    if (state === 'checking') {
      console.log('📞 [ICE-STATE]   ⏳ Checking connectivity...');
    } else if (state === 'connected') {
      console.log('📞 [ICE-STATE]   ✅ ICE connected! Media should be flowing.');
    } else if (state === 'completed') {
      console.log('📞 [ICE-STATE]   ✅ ICE completed! Best candidate pair selected.');
    } else if (state === 'failed') {
      console.error('📞 [ICE-STATE]   ❌ ICE FAILED! Cannot establish connection. This usually means:');
      console.error('📞 [ICE-STATE]      - Both peers are behind symmetric NAT (need TURN server)');
      console.error('📞 [ICE-STATE]      - Firewall is blocking UDP traffic');
      console.error('📞 [ICE-STATE]      - STUN server is unreachable');
      // Try ICE restart
      if (window.peerConnection && window.callReceiverId) {
        console.log('📞 [ICE-STATE]   🔄 Attempting ICE restart...');
        window.peerConnection.restartIce();
      }
    } else if (state === 'disconnected') {
      console.warn('📞 [ICE-STATE]   ⚠️ ICE disconnected, waiting for recovery...');
      setTimeout(() => {
        if (window.peerConnection && window.peerConnection.iceConnectionState === 'disconnected') {
          console.error('📞 [ICE-STATE]   ❌ ICE still disconnected after 5s timeout');
        }
      }, 5000);
    } else if (state === 'closed') {
      console.log('📞 [ICE-STATE]   Connection closed');
    }
  };

  // Monitor overall connection state
  window.peerConnection.onconnectionstatechange = () => {
    const state = window.peerConnection ? window.peerConnection.connectionState : 'null';
    console.log('📞 [CONN-STATE] Connection state changed to:', state);
    
    if (state === 'connected') {
      console.log('📞 [CONN-STATE] ✅✅✅ PEER CONNECTION ESTABLISHED SUCCESSFULLY! ✅✅✅');
      attemptStartCallRecording();
    } else if (state === 'failed') {
      console.error('📞 [CONN-STATE] ❌❌❌ CONNECTION FAILED ❌❌❌');
      document.getElementById('callStatusText').innerText = 'Connection failed...';
    } else if (state === 'connecting') {
      console.log('📞 [CONN-STATE] ⏳ Connecting...');
    }
  };

  // Monitor ICE gathering state
  window.peerConnection.onicegatheringstatechange = () => {
    const state = window.peerConnection ? window.peerConnection.iceGatheringState : 'null';
    console.log('📞 [ICE-GATHER] Gathering state:', state);
  };

  // Monitor signaling state
  window.peerConnection.onsignalingstatechange = () => {
    const state = window.peerConnection ? window.peerConnection.signalingState : 'null';
    console.log('📞 [SIGNAL] Signaling state:', state);
  };
  
  console.log('📞 [STEP-2] ====== setupPeerConnection DONE ======');
}

// ==================== CALLER: INITIATE CALL ====================
async function initiateCall(isVideoCall) {
  console.log('📞 [CALLER] ====== initiateCall START ====== isVideoCall:', isVideoCall);
  window.callReceiverId = document.getElementById('targetId').value;
  if (!window.callReceiverId) {
    console.error('📞 [CALLER] ❌ No target selected!');
    return alert('Select a contact to call!');
  }
  
  const receiver = window.allUsers.find(u => u._id === window.callReceiverId);
  const receiverName = receiver ? receiver.name : window.callReceiverId;
  console.log('📞 [CALLER] Calling:', receiverName, '(ID:', window.callReceiverId, ')');
  
  window.myIsVideoCall = isVideoCall;
  
  // Update UI for video/audio mode
  if (isVideoCall) {
    document.getElementById('videoContainer').classList.remove('hidden');
    document.getElementById('audioContainer').classList.add('hidden');
    document.getElementById('screenShareBtn').classList.remove('hidden');
  } else {
    document.getElementById('videoContainer').classList.add('hidden');
    document.getElementById('audioAvatar').innerText = (receiverName || 'U').charAt(0);
    document.getElementById('audioContainer').classList.remove('hidden');
    document.getElementById('screenShareBtn').classList.add('hidden');
  }
  
  document.getElementById('activeCallOverlay').classList.remove('hidden');
  document.getElementById('callStatusText').innerText = `Calling ${receiverName}...`;
  
  try {
    // STEP 1: Get local media
    await setupLocalStream(isVideoCall);
    
    // STEP: Emit call signal
    if (window.socket) {
      console.log('📞 [CALLER] Socket connected:', window.socket.connected, 'ID:', window.socket.id);
      console.log('📞 [CALLER] Emitting call_user -> receiverId:', window.callReceiverId, 'isVideo:', isVideoCall);
      window.socket.emit('call_user', { receiverId: window.callReceiverId, isVideoCall });
      console.log('📞 [CALLER] ✅ call_user emitted! Waiting for call_answered...');
    } else {
      console.error('📞 [CALLER] ❌ SOCKET IS NULL! Cannot emit call_user!');
    }
    playRingtone(true);
  } catch (e) {
    console.error('📞 [CALLER] ❌ initiateCall FAILED:', e);
    document.getElementById('activeCallOverlay').classList.add('hidden');
  }
}

// ==================== RECEIVER: ACCEPT CALL ====================
async function acceptCall() {
  console.log('📞 [RECEIVER] ====== acceptCall START ======');
  if (window.activeCallNotification) {
    window.activeCallNotification.close();
    window.activeCallNotification = null;
  }
  if (!window.incomingCallData) {
    console.error('📞 [RECEIVER] ❌ No incomingCallData!');
    return;
  }
  window.callReceiverId = window.incomingCallData.senderId;
  window.myIsVideoCall = window.incomingCallData.isVideoCall;
  
  console.log('📞 [RECEIVER] Accepting call from:', window.callReceiverId, 'isVideo:', window.myIsVideoCall);
  
  // Update UI for video/audio mode
  if (window.myIsVideoCall) {
    document.getElementById('videoContainer').classList.remove('hidden');
    document.getElementById('audioContainer').classList.add('hidden');
    document.getElementById('screenShareBtn').classList.remove('hidden');
  } else {
    document.getElementById('videoContainer').classList.add('hidden');
    document.getElementById('audioAvatar').innerText = document.getElementById('incomingAvatar').innerText;
    document.getElementById('audioContainer').classList.remove('hidden');
    document.getElementById('screenShareBtn').classList.add('hidden');
  }

  document.getElementById('incomingCallOverlay').classList.add('hidden');
  document.getElementById('activeCallOverlay').classList.remove('hidden');
  document.getElementById('callStatusText').innerText = 'Connecting...';
  
  stopRingtone();
  try {
    // STEP 1: Get local media
    await setupLocalStream(window.incomingCallData.isVideoCall);
    
    // STEP 2: Create peer connection
    setupPeerConnection();
    
    // STEP: Emit answer signal (this tells caller to createOffer)
    if (window.socket) {
      console.log('📞 [RECEIVER] Socket connected:', window.socket.connected, 'ID:', window.socket.id);
      console.log('📞 [RECEIVER] Emitting answer_call -> receiverId:', window.callReceiverId);
      window.socket.emit('answer_call', { receiverId: window.callReceiverId });
      console.log('📞 [RECEIVER] ✅ answer_call emitted! Waiting for webrtc_offer...');
    } else {
      console.error('📞 [RECEIVER] ❌ SOCKET IS NULL! Cannot emit answer_call!');
    }
  } catch (e) {
    console.error('📞 [RECEIVER] ❌ acceptCall FAILED:', e);
    rejectCall();
  }
}

function rejectCall() {
  console.log('📞 [RECEIVER] Rejecting call');
  if (window.activeCallNotification) {
    window.activeCallNotification.close();
    window.activeCallNotification = null;
  }
  stopRingtone();
  if (window.incomingCallData) {
    if (window.socket) {
      window.socket.emit('end_call', { receiverId: window.incomingCallData.senderId });
    }
    sendCallSystemMessage(window.incomingCallData.senderId, `📞 Missed ${window.incomingCallData.isVideoCall ? 'Video' : 'Audio'} Call`);
    window.incomingCallData = null;
  }
  document.getElementById('incomingCallOverlay').classList.add('hidden');
}

// ==================== STEP 3 (CALLER): CREATE OFFER ====================
async function createOffer() {
  console.log('📞 [STEP-3 CALLER] ====== createOffer START ======');
  try {
    // STEP 2: Create peer connection (caller side)
    setupPeerConnection();
    
    console.log('📞 [STEP-3 CALLER] Creating offer with offerToReceiveAudio:true, offerToReceiveVideo:', window.myIsVideoCall);
    const offer = await window.peerConnection.createOffer({ 
      offerToReceiveAudio: true, 
      offerToReceiveVideo: window.myIsVideoCall 
    });
    console.log('📞 [STEP-3 CALLER] ✅ Offer created, type:', offer.type);
    console.log('📞 [STEP-3 CALLER] SDP preview (first 200 chars):', offer.sdp.substring(0, 200));
    
    console.log('📞 [STEP-3 CALLER] Setting local description...');
    await window.peerConnection.setLocalDescription(offer);
    console.log('📞 [STEP-3 CALLER] ✅ Local description set, signaling state:', window.peerConnection.signalingState);
    
    if (window.socket) {
      console.log('📞 [STEP-3 CALLER] Sending offer to:', window.callReceiverId);
      window.socket.emit('webrtc_offer', { receiverId: window.callReceiverId, offer });
      console.log('📞 [STEP-3 CALLER] ✅ Offer sent! Waiting for webrtc_answer...');
    } else {
      console.error('📞 [STEP-3 CALLER] ❌ SOCKET IS NULL!');
    }
  } catch (e) {
    console.error('📞 [STEP-3 CALLER] ❌ createOffer FAILED:', e);
  }
}

// ==================== STEP 4 (RECEIVER): HANDLE OFFER ====================
async function handleOffer(offer) {
  console.log('📞 [STEP-4 RECEIVER] ====== handleOffer START ======');
  try {
    if (!window.peerConnection) {
      console.warn('📞 [STEP-4 RECEIVER] ⚠️ No peer connection exists, creating one...');
      setupPeerConnection();
    }
    
    console.log('📞 [STEP-4 RECEIVER] Current signaling state:', window.peerConnection.signalingState);
    console.log('📞 [STEP-4 RECEIVER] Offer type:', offer.type);
    console.log('📞 [STEP-4 RECEIVER] Offer SDP preview (first 200 chars):', offer.sdp ? offer.sdp.substring(0, 200) : 'NO SDP!');
    
    console.log('📞 [STEP-4 RECEIVER] Setting remote description (offer)...');
    await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('📞 [STEP-4 RECEIVER] ✅ Remote description set, signaling state:', window.peerConnection.signalingState);
    
    console.log('📞 [STEP-4 RECEIVER] Creating answer...');
    const answer = await window.peerConnection.createAnswer();
    console.log('📞 [STEP-4 RECEIVER] ✅ Answer created, type:', answer.type);
    
    console.log('📞 [STEP-4 RECEIVER] Setting local description (answer)...');
    await window.peerConnection.setLocalDescription(answer);
    console.log('📞 [STEP-4 RECEIVER] ✅ Local description set, signaling state:', window.peerConnection.signalingState);
    
    if (window.socket) {
      console.log('📞 [STEP-4 RECEIVER] Sending answer to:', window.callReceiverId);
      window.socket.emit('webrtc_answer', { receiverId: window.callReceiverId, answer });
      console.log('📞 [STEP-4 RECEIVER] ✅ Answer sent!');
    } else {
      console.error('📞 [STEP-4 RECEIVER] ❌ SOCKET IS NULL!');
    }
    
    // Process queued ICE candidates now that remote description is set
    await processIceQueue();
    
    document.getElementById('callStatusText').innerText = '00:00'; 
    window.callStartTime = Date.now();
    window.isCallConnected = true;
    console.log('📞 [STEP-4 RECEIVER] ✅ Call marked as connected! Timer started.');
    
    if (window.callTimer) clearInterval(window.callTimer);
    window.callTimer = setInterval(() => {
      const durationSecs = Math.floor((Date.now() - window.callStartTime) / 1000);
      const mins = Math.floor(durationSecs / 60).toString().padStart(2, '0');
      const secs = (durationSecs % 60).toString().padStart(2, '0');
      document.getElementById('callStatusText').innerText = `${mins}:${secs}`;
    }, 1000);
  } catch (e) {
    console.error('📞 [STEP-4 RECEIVER] ❌ handleOffer FAILED:', e);
    console.error('📞 [STEP-4 RECEIVER] Error name:', e.name, 'message:', e.message);
  }
}

// ==================== STEP 5 (CALLER): HANDLE ANSWER ====================
async function handleAnswer(answer) {
  console.log('📞 [STEP-5 CALLER] ====== handleAnswer START ======');
  try {
    if (!window.peerConnection) {
      console.error('📞 [STEP-5 CALLER] ❌ NO PEER CONNECTION! Cannot set answer.');
      return;
    }
    console.log('📞 [STEP-5 CALLER] Current signaling state:', window.peerConnection.signalingState);
    console.log('📞 [STEP-5 CALLER] Answer type:', answer.type);
    
    console.log('📞 [STEP-5 CALLER] Setting remote description (answer)...');
    await window.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('📞 [STEP-5 CALLER] ✅ Remote description set, signaling state:', window.peerConnection.signalingState);
    
    // Process queued ICE candidates
    await processIceQueue();
    
    document.getElementById('callStatusText').innerText = '00:00'; 
    window.callStartTime = Date.now();
    window.isCallConnected = true;
    console.log('📞 [STEP-5 CALLER] ✅ Call marked as connected! Timer started.');
    
    if (window.callTimer) clearInterval(window.callTimer);
    window.callTimer = setInterval(() => {
      const durationSecs = Math.floor((Date.now() - window.callStartTime) / 1000);
      const mins = Math.floor(durationSecs / 60).toString().padStart(2, '0');
      const secs = (durationSecs % 60).toString().padStart(2, '0');
      document.getElementById('callStatusText').innerText = `${mins}:${secs}`;
    }, 1000);
  } catch (e) {
    console.error('📞 [STEP-5 CALLER] ❌ handleAnswer FAILED:', e);
    console.error('📞 [STEP-5 CALLER] Error name:', e.name, 'message:', e.message);
  }
}

// ==================== ICE CANDIDATE QUEUE ====================
async function processIceQueue() {
  const count = window.iceCandidateQueue.length;
  console.log('📞 [ICE-QUEUE] Processing queued ICE candidates, count:', count);
  
  if (count === 0) {
    console.log('📞 [ICE-QUEUE] No queued candidates to process');
    return;
  }
  
  const queue = [...window.iceCandidateQueue];
  window.iceCandidateQueue = [];
  
  let success = 0, failed = 0;
  for (const candidate of queue) {
    try { 
      await window.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      success++;
    } catch (e) { 
      failed++;
      console.error('📞 [ICE-QUEUE] ❌ Failed to add queued candidate:', e.message); 
    }
  }
  console.log(`📞 [ICE-QUEUE] Done. Added: ${success}, Failed: ${failed}`);
}

// ==================== SCREEN SHARE ====================
async function toggleScreenShare() {
  if (!window.isScreenSharing) {
    try {
      window.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = window.screenStream.getVideoTracks()[0];
      
      const sender = window.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      }
      
      document.getElementById('localVideo').srcObject = window.screenStream;
      window.isScreenSharing = true;
      document.getElementById('screenShareBtn').style.background = '#28a745';

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  } else {
    stopScreenShare();
  }
}

function stopScreenShare() {
  if (!window.isScreenSharing) return;
  
  const videoTrack = window.localStream.getVideoTracks()[0];
  const sender = window.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
  if (sender && videoTrack) {
    sender.replaceTrack(videoTrack);
  }
  
  if (window.screenStream) {
    window.screenStream.getTracks().forEach(track => track.stop());
    window.screenStream = null;
  }
  
  document.getElementById('localVideo').srcObject = window.localStream;
  window.isScreenSharing = false;
  document.getElementById('screenShareBtn').style.background = '#0084ff';
}

// ==================== END CALL ====================
function endCall(isInitiator = true) {
  console.log('📞 [END] ====== endCall ====== isInitiator:', isInitiator);
  if (window.activeCallNotification) {
    window.activeCallNotification.close();
    window.activeCallNotification = null;
  }
  stopRingtone();
  if (isInitiator && window.callReceiverId) {
    if (window.socket) {
      window.socket.emit('end_call', { receiverId: window.callReceiverId });
    }
    
    if (!window.isCallConnected) {
      sendCallSystemMessage(window.callReceiverId, `📞 Canceled ${window.myIsVideoCall ? 'Video' : 'Audio'} Call`);
    } else if (window.callStartTime) {
      const durationSecs = Math.floor((Date.now() - window.callStartTime) / 1000);
      const mins = Math.floor(durationSecs / 60);
      const secs = durationSecs % 60;
      sendCallSystemMessage(window.callReceiverId, `📞 ${window.myIsVideoCall ? 'Video' : 'Audio'} Call Ended (${mins}m ${secs}s)`);
    }
  }
  if (window.callTimer) {
    clearInterval(window.callTimer);
    window.callTimer = null;
  }
  stopRecording();
  
  if (window.screenStream) {
    window.screenStream.getTracks().forEach(track => track.stop());
    window.screenStream = null;
  }
  window.isScreenSharing = false;
  const screenShareBtn = document.getElementById('screenShareBtn');
  if (screenShareBtn) screenShareBtn.style.background = '#0084ff';

  if (window.peerConnection) {
    console.log('📞 [END] Closing peer connection, last states - connection:', window.peerConnection.connectionState, 'ICE:', window.peerConnection.iceConnectionState, 'signaling:', window.peerConnection.signalingState);
    window.peerConnection.ontrack = null;
    window.peerConnection.onicecandidate = null;
    window.peerConnection.oniceconnectionstatechange = null;
    window.peerConnection.onconnectionstatechange = null;
    window.peerConnection.onsignalingstatechange = null;
    window.peerConnection.onicegatheringstatechange = null;
    window.peerConnection.close();
    window.peerConnection = null;
  }
  if (window.localStream) {
    window.localStream.getTracks().forEach(track => track.stop());
    window.localStream = null;
  }
  if (window.remoteStream) {
    window.remoteStream = null;
  }
  window.callReceiverId = null;
  window.incomingCallData = null;
  window.callStartTime = null;
  window.isCallConnected = false;
  window.isRecordingCall = false;
  window.iceCandidateQueue = [];
  document.getElementById('incomingCallOverlay').classList.add('hidden');
  document.getElementById('activeCallOverlay').classList.add('hidden');
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('localVideo').srcObject = null;
  const audioEl = document.getElementById('remoteAudio');
  if (audioEl) audioEl.srcObject = null;
  console.log('📞 [END] ✅ Call ended, all cleaned up');
}

// ==================== CALL RECORDING ====================
function attemptStartCallRecording() {
  if (window.callRecorder || window.isRecordingCall) return;
  if (!window.remoteStream) return;
  
  const remoteAudioOk = window.remoteStream.getAudioTracks().length > 0;
  const remoteVideoOk = !window.myIsVideoCall || window.remoteStream.getVideoTracks().length > 0;
  
  if (!remoteAudioOk || !remoteVideoOk) return;
  
  if (!window.localStream) return;
  const localAudioOk = window.localStream.getAudioTracks().length > 0;
  const localVideoOk = !window.myIsVideoCall || window.localStream.getVideoTracks().length > 0;
  
  if (!localAudioOk || !localVideoOk) return;
  
  window.isRecordingCall = true;
  startRecording();
}

function startRecording() {
  if (!window.remoteStream || window.remoteStream.getTracks().length === 0) return;
  window.recordedChunks = [];
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();

    if (window.localStream && window.localStream.getAudioTracks().length > 0) {
      const localSource = audioContext.createMediaStreamSource(new MediaStream([window.localStream.getAudioTracks()[0]]));
      localSource.connect(destination);
    }
    if (window.remoteStream && window.remoteStream.getAudioTracks().length > 0) {
      const remoteSource = audioContext.createMediaStreamSource(new MediaStream([window.remoteStream.getAudioTracks()[0]]));
      remoteSource.connect(destination);
    }

    const combinedTracks = [...destination.stream.getAudioTracks()];
    if (window.remoteStream.getVideoTracks().length > 0) {
      combinedTracks.push(window.remoteStream.getVideoTracks()[0]);
    }
    const finalStream = new MediaStream(combinedTracks);
    
    let options = {};
    if (window.remoteStream.getVideoTracks().length > 0) {
      options = { mimeType: 'video/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
      }
    } else {
      options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg' };
      }
    }
    
    window.callRecorder = new MediaRecorder(finalStream, options);
    window.callRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) window.recordedChunks.push(e.data);
    };
    window.callRecorder.onstop = () => {
      if (window.recordedChunks.length === 0) return;
      const blob = new Blob(window.recordedChunks, { type: window.callRecorder.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Call_Recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${window.callRecorder.mimeType.split('/')[1].split(';')[0]}`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      window.recordedChunks = [];
    };
    window.callRecorder.start();
  } catch (err) {
    console.error("Recording setup failed", err);
  }
}

function stopRecording() {
  if (window.callRecorder && window.callRecorder.state !== 'inactive') {
    window.callRecorder.stop();
    window.callRecorder = null;
  }
}

async function sendCallSystemMessage(receiverId, content) {
  try {
    const res = await fetch(`${window.API_URL}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.token}`
      },
      body: JSON.stringify({
        receiver: receiverId,
        content: content,
        isGroupMessage: false
      })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof window.appendMessage === 'function') {
        window.appendMessage(data.data, true);
      }
    }
  } catch (err) {
    console.error('Failed to send call system message', err);
  }
}

window.showCallNotification = function(callerName, isVideoCall) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const callType = isVideoCall ? 'Video Call' : 'Audio Call';
    const notification = new Notification(`Incoming ${callType}`, {
      body: `${callerName} is calling you...`,
      tag: 'incoming-call',
      requireInteraction: true
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    window.activeCallNotification = notification;
  }
};

// ==================== EXPOSE ALL FUNCTIONS TO WINDOW ====================
window.playRingtone = playRingtone;
window.stopRingtone = stopRingtone;
window.setupLocalStream = setupLocalStream;
window.setupPeerConnection = setupPeerConnection;
window.initiateCall = initiateCall;
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.createOffer = createOffer;
window.handleOffer = handleOffer;
window.handleAnswer = handleAnswer;
window.processIceQueue = processIceQueue;
window.endCall = endCall;
window.toggleScreenShare = toggleScreenShare;
window.stopScreenShare = stopScreenShare;
window.attemptStartCallRecording = attemptStartCallRecording;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.sendCallSystemMessage = sendCallSystemMessage;

console.log('📞 [CALL.JS] ✅ All call functions exposed to window:', 
  ['playRingtone', 'stopRingtone', 'initiateCall', 'acceptCall', 'createOffer', 'handleOffer', 'handleAnswer', 'endCall']
    .map(fn => `${fn}: ${typeof window[fn]}`)
    .join(', ')
);
