const { spawn } = require('child_process');
const WebSocket = require('ws');
const wrtc = require('wrtc');

const tc_net_signaling_ws = new WebSocket('ws://localhost:3000');

const pc = new wrtc.RTCPeerConnection({
  iceServers: [{urls : 'stun:stun.l.google.com:19302'}]
});

const gst = spawn('gest-launch-1.0', [
  'fdsrc', '!',
  'rtpvp8depay', '!',
  'vp8dec', '!',
  'videoconvert', '!',
  'autovideosink'
]);

gst.stderr.on('data', d => console.error(`GStreamer error : ${d.toString()}`));


