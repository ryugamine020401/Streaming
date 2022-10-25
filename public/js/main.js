/* ###################################################################### */
let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: '3000',
    path: '/'
});

let myname;
let myid;
let userid_arr = [];
let username_arr = [];

let cameraStatus = false;
// let micStatus = false;
let firstVoice = false;
let mutedState = true; 
let video_arr = [];


let localStream = null;
let videoBox = document.getElementById("videoBox");
let myVideoBox = document.createElement('span');
let myVideo = document.createElement('video');
let myVideoName = document.createElement('span');

/* ###################################################################### */
/* creat <video> tag in DOM */
function add_newVideo(span, video, span2, stream, username) {
    span2.innerHTML = username;
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    span.append(video);
    span.append(span2);
    videoBox.append(span);
}

/* close local media device and remove <video> tag in DOM */
function stopCapture() {
    if (localStream) {
        /* stop fetch media */
        localStream.getTracks().forEach((track) => {track.stop();});
        /* release source */
        myVideo.srcObject = null;
        myVideo.remove();
        myVideoName.remove();
        myVideoBox.remove();
        localStream = null;
    }
}

/* open local media device and do streaming to other client */
function capture_and_brocast() {
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {width: 200, height: 200}
    })
    .then( (stream) => {
        localStream = stream;
        add_newVideo(myVideoBox, myVideo, myVideoName, stream, 'YOU');
        brocastStreaming(stream);
    })
    .catch( (error) => {
        console.error(error.message);
    });
}

/* ###################################################################### */
/* p2p send video:
   send stream pakage to client which is in list */
function brocastStreaming(stream) {
    userid_arr.map( (userid) => {
        if (userid != myid) {
            let call = myPeer.call(userid, stream);
        }
    });
}

/* p2p receive video:
   receive stream pakage and control <video> obj in DOM if somebody stop/start streaming */
function listenStreaming() {
    myPeer.on('call', (call) => {
        call.answer(null);
        let span = document.createElement('span');
        let video = document.createElement('video');
        let span2 = document.createElement('span');
        video.muted = mutedState;
        call.on('stream', (remoteStream) => {
            if (remoteStream) {
                let username = username_arr[userid_arr.indexOf(call.peer)];
                add_newVideo(span, video, span2, remoteStream, username);
                video_arr = [video, ...video_arr];
            }
        });
        socket.on('close-video', (userid) => {
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
/* button onclick event:
   open or close camera and control streaming... */
function toggleCamera() {
    cameraStatus = (cameraStatus == true)? false: true;
    document.getElementById("camera-toggle").innerText = (cameraStatus == true)? "關閉相機": "開啟相機";
    if (cameraStatus == true) {
        capture_and_brocast();
    } else {
        stopCapture();
        socket.emit('stop-stream', myid);
    }
}

/* button onclick event:
   send message to chatroom */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': myname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    // ----------------------------------------
    /* add event in DOM */
    myname = prompt('輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = myname;
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    /* we dont want to listen voice from ourself */
    myVideo.muted = true;
    /* bind video sounds to checkbox */
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
        video_arr.map( (video) => {
            video.muted = mutedState;
        });
    });

    // ----------------------------------------
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

    /* somebody join or leave */
    socket.on('member-refresh', (member) => {
        document.getElementById("number-of-people").innerText = `線上人數 : ${member}`;
    });

    /* just do it */
    socket.on('send-your-id', () => {
        socket.emit('send-id', myid, myname);
    });

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid, myname);
    });

    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr, name_arr) => {
        userid_arr = id_arr;
        username_arr = name_arr;
    });

    /* p2p send video:
       when new client join the room, also send stream pakage.
    show the username on chatroom when somebody join the toom. */
    socket.on('new-user-id', (userid, username) => {
        if (userid != myid) {
            let call = myPeer.call(userid, localStream);
        }
        username = (userid == myid)? '您': username;
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已加入 *</span>
        </div>`;
    });

    /* show the username on chatroom when somebody left the toom */
    socket.on('someone-left', (username) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已離開 *</span>
        </div>`;
    });

    // ----------------------------------------
}
/* ###################################################################### */

Init();
listenStreaming();