const homeserver = document.currentScript.getAttribute('homeserver') || "https://matrix.org"
const roomAlias = document.currentScript.getAttribute('roomAlias');
var gallery = ( document.currentScript.getAttribute('gallery') === 'true' );
var userFilteredOut = document.currentScript.getAttribute('userFilteredOut');
var oldTimelineLength = 0;
var imgWidth = 800;
var imgHeight = 600;
var keepRefresh = 1;
var urlForRooms = "https://matrix.to/#/"

// function to stop refreshing page
function cancelRefresh() {
    keepRefresh = 0;
    document.getElementById("waitingspinner").style.visibility = "hidden";
}

function startRefresh() {
    oldTimelineLength = 0;
    keepRefresh = 1;
    document.getElementById("waitingspinner").style.visibility = "visible";
}

function switchDisplay(template) {
    let matrixContainer = document.getElementById("matrix-container");
    matrixContainer.classList.toggle("matrix-event-container");
    matrixContainer.classList.toggle("matrix-room-container");
    /*switch(template){
        case "space":
            matrixContainer.classList.remove("matrix-event-container")
            matrixContainer.classList.add("matrix-room-container")
            break;
        case "room":
            matrixContainer.classList.remove("matrix-event-container")
            matrixContainer.classList.add("matrix-room-container")
            break;
    }*/

}


// to check if page is scrollable
function hasScrollBar() {
 return window.innerWidth > document.documentElement.clientWidth
}

function populateWithScroll(client, room) {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        client.scrollback(room).then(function(newRoom) {
            addEventsToPage(client, newRoom);
        });
    }
}

// to extract content from an event and add to the DOM
function getContentFromEvent(client, message) {
    let result = "";
    if ( message.event.sender === userFilteredOut ) return result;
    if ( message.event.type === "m.room.message" ) {
        result += "<div class='matrix-event'>";
        if ( message.event.content.msgtype === "m.image" ) {
            result += "<img class='matrix-img' src='"+ client.mxcUrlToHttp( message.event.content.url, 800, 600, "scale", false )  +"'>"

        } else {
            if ( !gallery ) result += "<p class='matrix-text'>" + ( message.event.content.formatted_body || message.event.content.body ) + "</p>";
        }
        result += "</div>";
    }
    return result;

}

function getRoomInSpace(client, room) {
    let result = "";
    if ( room.room_type === "m.space" ) return result;
    //result += "<a href='"+ urlForRooms + room.canonical_alias +"'>";
    result += "<div class='matrix-room-summary' data-room-id='"+ room.room_id +"'>";
    result += "<img class='matrix-img' src='" + client.mxcUrlToHttp( room.avatar_url, 800, 600, "scale", false ) + "'>";
    result += "<h3 class='matrix-title'>" + room.name + "</h3>"
    if ( room.topic ) result += "<p class='matrix-text'>" + room.topic + "</p>"
    result += "</div>";
    return result;

}

function addEventsToPage(client, room) {
    console.log("oldTimeline: "+ oldTimelineLength + " ; new timeline: " + room.timeline.length);
    var matrixContainer = document.getElementById("matrix-container");
    matrixContainer.classList.add("matrix-event-container");
    room.timeline.slice( 0, room.timeline.length - oldTimelineLength ).reverse().forEach( (message) => {
            matrixContainer.innerHTML += getContentFromEvent(client, message);
    });

    //  //Pour récupérer plus de messages si la page n'est pas défilable.
    if ( room.timeline[0].event.type === "m.room.history_visibility" ) cancelRefresh();
    if ( ( oldTimelineLength < room.timeline.length ) && !hasScrollBar() ) {
        populateWithScroll( client, room );
    }
    // ------------- -------------------- //
    oldTimelineLength = room.timeline.length;

}

function getSpaceContent(client, hierarchy){
    var matrixContainer= document.getElementById("matrix-container");
        matrixContainer.classList.add("matrix-room-container");
        hierarchy.rooms.forEach( (room) => {
        matrixContainer.innerHTML += getRoomInSpace(client, room);
    });

    var roomsLinks = document.getElementsByClassName("matrix-room-summary");
    for (var i = 0; i < roomsLinks.length; i++) {
        roomsLinks[i].addEventListener('click', linkToRoomContent, false);
    }

    console.log(hierarchy);
    cancelRefresh();

}

function linkToRoomContent() {
    var matrixBody = document.getElementById("matrix-body");
    matrixBody.innerHTML = "";
    //switchDisplay();
    startRefresh();
    matrixBody.innerHTML += "<a id='space-root-link' href>Retour à la liste des salons</a>";
    fetchMessagesInRoom("", this.getAttribute("data-room-id"))
}

function linkToRootSpace() {
    var matrixBody = document.getElementById("matrix-body");
    matrixBody.innerHTML = "";
    //switchDisplay();
    startRefresh();
    fetchMessagesInRoom(roomAlias);
}

async function fetchMessagesInRoom(alias, idOfRoom) {
    const tmpClient = await matrixcs.createClient(homeserver);

    const { user_id, device_id, access_token } = await tmpClient.registerGuest();

    console.log(user_id);

    const client = await matrixcs.createClient({ baseUrl: homeserver, accessToken: access_token, userId: user_id, deviceId: device_id });

    await client.startClient({initialSyncLimit: 100});
    client.setGuest(true);

//    client.storeClientOptions({"lazy_load_members": true});
    function getRoomContent ( roomId ) {
        client.getRoomHierarchy(roomId).then(function(hierarchy) {
            client.peekInRoom(roomId).then(function(room) {
                console.log( room );
                var matrixBody = document.getElementById("matrix-body");
                matrixBody.innerHTML += "<h1>" + room.name + "</h1>";
                matrixBody.innerHTML += "<div id='matrix-container'></div>"
                if ( hierarchy.rooms.length == 1 ) {
                    addEventsToPage(client, room);
                    window.addEventListener('scroll', () => {
                        if ( keepRefresh ) populateWithScroll(client, room);
                    })
                }
                else getSpaceContent(client, hierarchy);
                client.stopClient();

            });
        });
    }

    if ( idOfRoom ) {
        getRoomContent(idOfRoom);
    } else {
        client.getRoomIdForAlias(alias).then(function(res) {
            getRoomContent( res.room_id ) ;
        });
    }

}


fetchMessagesInRoom(roomAlias);
