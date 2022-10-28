/* ###################################################################### */
let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: '3000',
    path: '/'
});

/* ---------------------------------------- */
let myname;
let myid;
let userid_arr = [];
let username_arr = [];

let cameraStatus = false;
let micStatus = false;
let screenStatus = false;
let firstVoice = false;  // for autoplay
let mutedState = true;  // for autoplay
let video_arr = [];  // for mute viode
let audio_arr = []; // for mute audio

/* ---------------------------------------- */
let myVideoStream = null;
let myVideoBox = document.createElement('span');
let myVideo = document.createElement('video');
let myVideoName = document.createElement('span');
let myAudioStream = null;
let myAudioBox = document.createElement('span');
let myAudio = document.createElement('audio');
let myAudioName = document.createElement('span');
let myScreenStream = null;
let myScreenBox = document.createElement('span');
let myScreen = document.createElement('video');
let myScreenName = document.createElement('span');

/* ###################################################################### */
/* p2p send stream:
   send stream pakage to client which is in the list */
function brocastStreaming(stream) {
    userid_arr.map( (userid) => {
        if (userid != myid) {
            let call = myPeer.call(userid, stream);
        }
    });
}

/* p2p receive stream:
   receive stream pakage and control <video>/<audio> obj in DOM if somebody start/stop a stream */
function listenStreaming() {
    myPeer.on('call', (call) => {
        call.answer(null);
        let span = document.createElement('span');
        let video = document.createElement('video');
        let audio = document.createElement('audio');
        let span2 = document.createElement('span');
        video.muted = mutedState;
        audio.muted = mutedState;
        /* ---------------------------------------- */
        call.on('stream', (remoteStream) => {
            if (remoteStream) {
                let type;
                let username = username_arr[userid_arr.indexOf(call.peer)];
                try {
                    type = remoteStream.getTracks()[1]['kind'];
                } catch {
                    type = remoteStream.getTracks()[0]['kind'];
                }
                if (type == 'video') {
                    add_newVideo(span, video, remoteStream, span2, username+'/ ');
                    video_arr = [video, ...video_arr];
                } else if (type == 'audio') {
                    add_newAudio(span, audio, remoteStream, span2, username+'的聲音/ ');
                    audio_arr = [audio, ...audio_arr];
                }
            } 
        });
        /* ---------------------------------------- */
        socket.on('close-video', (userid) => {
            if (call.peer == userid) {
                video.srcObject = null;
                video.remove();
                span2.remove();
                span.remove();
            }
        });
        socket.on('close-audio', (userid) => {
            if (call.peer == userid) {
                audio.srcObject = null;
                audio.remove();
                span2.remove();
                span.remove();
            }
        });
        socket.on('close-screen', (userid) => {
            if (call.peer == userid) {
                video.srcObject = null;
                video.remove();
                span2.remove();
                span.remove();
            }
        });
    });
}

/* ###################################################################### */
/* creat <video> tag in DOM */
function add_newVideo(span, video, videoStream, span2, tag) {
    let videoBox = document.getElementById("videoBox");
    span2.innerHTML = tag;
    video.srcObject = videoStream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    span.append(video);
    span.append(span2);
    videoBox.append(span);
}

/* creat <audio> tag in DOM */
function add_newAudio(span, audio, audioStream, span2, tag) {
    let audioBox = document.getElementById("audioBox");
    span2.innerHTML = tag;
    audio.srcObject = audioStream;
    audio.addEventListener('loadedmetadata', () => {
        if (firstVoice) {
            audio.play();
        } else {
            audio.pause();
            document.addEventListener('click', () => {
                if (firstVoice) audio.play();
            });
            document.addEventListener('mousemove', () => {
                if (firstVoice) audio.play();
            });
        }
    });
    span.append(audio);
    span.append(span2);
    audioBox.append(span);
}

/* ###################################################################### */
/* button onclick event:
   open/close camera and control streaming... */
async function toggleCamera() {
    if (cameraStatus == false) {
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {width: 200, height: 200}
        }).catch( (error) => {alert(error.message);} );
        if (myVideoStream) {
            add_newVideo(myVideoBox, myVideo, myVideoStream, myVideoName, '您/ ');
            brocastStreaming(myVideoStream);
            cameraStatus = true;
            document.getElementById("camera-toggle").innerText = "關閉相機";
        }
    } else {
        if (myVideoStream) {
            /* stop fetch media */
            myVideoStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myVideo.srcObject = null;
            myVideo.remove();
            myVideoName.remove();
            myVideoBox.remove();
            myVideoStream = null;
        }
        socket.emit('stop-videoStream', myid);
        cameraStatus = false;
        document.getElementById("camera-toggle").innerText = "開啟相機";
    }
}

/* button onclick event:
   open/close mic and control streaming... */
async function toggleMic() {
    if (micStatus == false) {
        myAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        }).catch( (error) => {alert(error.message);} );
        if (myAudioStream) {
            add_newAudio(myAudioBox, myAudio, myAudioStream, myAudioName, '您的聲音/ ');
            brocastStreaming(myAudioStream);
            micStatus = true;
            document.getElementById("mic-toggle").innerText = "關閉麥克風";
        }
    } else {
        if (myAudioStream) {
            /* stop fetch media */
            myAudioStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myAudio.srcObject = null;
            myAudio.remove();
            myAudioName.remove();
            myAudioBox.remove();
            myAudioStream = null;
        }
        socket.emit('stop-audioStream', myid);
        micStatus = false;
        document.getElementById("mic-toggle").innerText = "開啟麥克風";
    }
}

/* button onclick event:
   open/close screen sharing and control streaming... */
async function toggleScreen() {
    if (screenStatus == false) {
        myScreenStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {MediaSource: 'screen', width: 500, height: 500}
        }).catch( (error) => {console.log(error.message);} );
        if (myScreenStream) {
            add_newVideo(myScreenBox, myScreen, myScreenStream, myScreenName, '您/ ');
            brocastStreaming(myScreenStream);
            screenStatus = true;
            document.getElementById("screen-toggle").innerText = "關閉畫面分享";
        }
    } else {
        if (myScreenStream) {
            /* stop fetch media */
            myScreenStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myScreen.srcObject = null;
            myScreen.remove();
            myScreenName.remove();
            myScreenBox.remove();
            myScreenStream = null;
        }
        socket.emit('stop-screenStream', myid);
        screenStatus = false;
        document.getElementById("screen-toggle").innerText = "開啟畫面分享";
    }
}

/* button onclick event:
   send a message to chatroom */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': myname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    /* add event in DOM */
    myname = prompt('請輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = myname;
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    document.getElementById("mic-toggle").addEventListener('click', toggleMic);
    document.getElementById("screen-toggle").addEventListener('click', toggleScreen);

    /* we dont want to listen voice from ourself */
    myVideo.muted = true;
    myAudio.muted = true;
    myScreen.muted = true;

    /* bind audio sounds ctrl to checkbox */
    let muted_toggle = document.getElementById("muted-toggle");
    muted_toggle.addEventListener('click', () => {
        if (muted_toggle.checked == false) {
            mutedState = true;
        } else {
            if (firstVoice == false) {
                let audio = document.createElement("audio");
                audio.src = "sound/join.mp3";
                audio.play();
                firstVoice = true;
            }
            mutedState = false;
        }
        audio_arr.map( (audio) => {
            audio.muted = mutedState;
        });
        video_arr.map( (video) => {
            video.muted = mutedState;
        });
    });

    /* ---------------------------------------- */
    /* connect to server */
    socket = io.connect();

    /* somebody sent a message, receive it and show on the chatroom */
    socket.on('chatroom-refresh', (message) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>${message.username}</span>
            <span> : </span>
            <span>${message.content}</span>
        </div>`;
    });

    /* just do it */
    socket.on('send-your-id', () => {
        socket.emit('send-id', myid, myname);
    });

    /* ---------------------------------------- */
    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr, name_arr) => {
        userid_arr = id_arr;
        username_arr = name_arr;
        console.log(username_arr);
        console.log(userid_arr.length)
        document.getElementById("number-of-people").innerText = `線上人數 : ${userid_arr.length}`;
    });

    /* p2p send stream:
       when new client join the room, also send stream pakage.
    show the username on chatroom when somebody join the room. */
    socket.on('new-user-id', (userid, username) => {
        if (userid != myid) {
            if (myVideoStream) myPeer.call(userid, myVideoStream);
            if (myAudioStream) myPeer.call(userid, myAudioStream);
            if (myScreenStream) myPeer.call(userid, myScreenStream);
        }
        username = (userid == myid)? '您': username;
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已加入 *</span>
        </div>`;
    });

    /* show the username on chatroom when somebody left the room */
    socket.on('someone-left', (username) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已離開 *</span>
        </div>`;
    });

    /* ---------------------------------------- */
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid, myname);
    });

}

/* ###################################################################### */
Init();
listenStreaming();
