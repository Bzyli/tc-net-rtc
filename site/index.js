const sallesContainer = document.getElementById('salles');
const localVideo = document.getElementById('localVideo');
const serverUrl = window.location.host;


//--------------  WEBSOCKET CONNECTION ---------------
const signaling = new WebSocket('wss://ws.'+ serverUrl); // Serveur de signalement
signaling.onmessage = e => {
    if (!localStream) {
        console.log('Not ready yet'); // On a pas encore pu obtenir le flux vidéo de l'utilisateur qui veut diffuser 
        return;
    }
    const message = JSON.parse(e.data);  // Le type de message qui a été reçu
    switch (message.type) {
    case 'answer':                       // Le vidéoprojecteur/raspberry pi a répondu à l'offre de diffusion
      handleAnswer(message);
      break;
    case 'candidate':                    // Candidat ICE reçu
      handleCandidate(message);
      break;
    case 'ready':                        // Le raspbery pi/device est prêt à recevoir un flux
      if (peerConnection) {
        console.log('already in call, ignoring'); // on était déjà dans un appel donc on peut ignorer
        return;
      }
      console.log('Remote device ready');
      break;
    default:
      console.log('unhandled', e);      // Message inconnu
      break;
  }
};
//--------------  END OF WEBSOCKET CONNECTION ---------------


//--------------  HOMEPAGE LOGIC  --------------
function generateRoomCard(name) {
    return `<button class="rooms" id="${name}"> ${name} </button>`;
}

async function getRooms() {
  const url = "https://api." + serverUrl + "/api/rooms";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    let newRooms = new Set(result);
    console.log(newRooms);
    sallesContainer.innerHTML = '';
    newRooms.forEach(element => {
        if (element) {
          sallesContainer.innerHTML += generateRoomCard(element);
        }
      });
  } catch (error) {
    console.error(error.message);
  }
}

let getRoomsInterval = setInterval(getRooms, 5000);

function redrawHomepageAfterStartCall() {
    clearInterval(getRoomsInterval);
    sallesContainer.innerHTML = '<button onclick="hangup()"> Arrêter la diffusion </button>';   
}

//--------------  END OF HOMEPAGE LOGIC  --------------

//--------------  WEBRTC LOGIC ------------------
function createPeerConnection(roomID) {
    peerConnection = new RTCPeerConnection({iceServers: [{ urls: 'stun:stun.' + serverUrl + ':3478'}, {urls: 'turn:turn.' + serverUrl +':3478', username : 'tc-net', credential :'tc-net'}]});
    // API de WebRTC, on instancie l'object RTCPeerConnection avec éventuellement des serveurs stun et turn (pas forcément nécessaire sur Eduroam ?)
    peerConnection.oniceconnectionstatechange = () => console.log('ICE state:', peerConnection.iceConnectionState); // On affiche l'état de la découverte des pairs dans la console
    peerConnection.onicecandidate = e => { // On découvre un candidat ICE
        const message = {
            type : 'candidate',
            candidate : null,
            roomID : roomID,
             // Le candidat null correspond à la fin de la découverte des pairs en WebRTC
        };
        if (e.candidate) {
            message.candidate = e.candidate.candidate;
            message.sdpMid = e.candidate.sdpMid;
            message.sdpMLineIndex = e.candidate.sdpMLineIndex;
        }
        console.log(message);
        signaling.send(JSON.stringify(message)); // On partage ce candidat au Websocket (donc aux autres pairs)
    };
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream)); // On partage le flux vidéo en local vers la connection WebRTC
};

// debug function
async function logVideoCodec(pc) {
  const stats = await pc.getStats();

  let codecMap = {};
  let activeVideoCodecId = null;

  stats.forEach(report => {
    // Collect codec definitions
    if (report.type === "codec") {
      codecMap[report.id] = report;
    }

    // Find the active video RTP stream
    if (
      (report.type === "inbound-rtp" || report.type === "outbound-rtp") &&
      report.kind === "video"
    ) {
      activeVideoCodecId = report.codecId;
    }
  });

  if (activeVideoCodecId && codecMap[activeVideoCodecId]) {
    const codec = codecMap[activeVideoCodecId];
    console.log(
      `Video codec: ${codec.mimeType} (${codec.clockRate} Hz)`
    );
  } else {
    console.log("Video codec not found");
  }
}

//--------------  END OF WEBRTC LOGIC ------------------

//--------------  START CALL ---------------
let globalRoomID;
sallesContainer.onclick = async (e) => {
  if (e.target.nodeName !== 'BUTTON') return;
  if (e.target.className !== 'rooms') return;
  let roomID = e.target.id;
  globalRoomID = roomID;
  localStream = await navigator.mediaDevices.getDisplayMedia({audio : false, video: {frameRate : {ideal : 30}, width : { max : 1920, ideal : 1280}, height : {max : 1080, ideal : 720}}}); // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
  localVideo.srcObject = localStream; // Affichage de la fenêtre capturé sur la page web
  redrawHomepageAfterStartCall();

  signaling.send(JSON.stringify({type : 'ready', roomID : roomID})); // On prévient le signaling server qu'on est prêt
  makeCall(roomID);
}

async function makeCall(roomID) {
    createPeerConnection(roomID);

    monitor(peerConnection);

    const offer = await peerConnection.createOffer();

    signaling.send(JSON.stringify({type: 'offer', sdp: offer.sdp, roomID : roomID})); // On envoi l'offre de diffusion vers le websocket
    await peerConnection.setLocalDescription(offer);                                  // On met a jour la LocalDescription (ce qu'on va recevoir, ...)

    const sender = peerConnection.getSenders().find(s => s.track && s.track.kind ==='video');

    if (sender) {
      const params = sender.getParameters();
      if (!params.encoding) { params.encoding = [{}];}

      params.encoding[0].maxBitrate = 3000000;
      params.encoding[0].minBitrate = 3000000;

      await sender.setParameters(params);
    }
  }

async function handleAnswer(answer) {
    if (!peerConnection) {
        console.error('no peerConnection');
        return;
    }
    await peerConnection.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
    if(!peerConnection) {
        console.error('no peerConnection');
        return;
    }
    if (candidate.candidate) { // Si il y a effectivement un candidat dans ce qui nous a été envoyé (en gros pas null, donc pas la fin de la découverte)
        console.log('adding new candidate');
        const iceCandidate = new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        });
        await peerConnection.addIceCandidate(iceCandidate); // On ajoute le candidat qui nous a été envoyé par un pair à notre liste de candidats.
    }
}
//--------------  END OF START CALL ---------------

//-------------- ENDING CALL --------------
window.onbeforeunload =  () => {
    signaling.send(JSON.stringify({type : 'bye', roomID : globalRoomID})); // On prévient le signaling server qu'on raccroche
}

async function hangup() {
    console.log('shutting down');
    if(peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localVideo.srcObject = null;
    signaling.send(JSON.stringify({type : 'bye', roomID : globalRoomID})); // On prévient le signaling server qu'on raccroche

    getRooms();
    getRoomsInterval = setInterval(getRooms, 5000);
}

//Mesure de la latence
const monitor = (pc) => {
    const el = document.body.appendChild(document.createElement('div'));
    el.style.cssText = "position:fixed;top:0;right:0;color:#0f0;background:#000;z-index:9";
    const id = setInterval(async () => {
        if (!pc || pc.connectionState === 'closed') { clearInterval(id); el.remove(); return; }
        (await pc.getStats())?.forEach(r => r.type === 'candidate-pair' && r.state === 'succeeded' && 
            (el.innerText = `RTT:${(r.currentRoundTripTime*1000)|0}ms | Lat:~${(r.currentRoundTripTime*500+90)|0}ms`));
    }, 1000);
};