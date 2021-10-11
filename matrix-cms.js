document.addEventListener("DOMContentLoaded", (event) => {

const matrixBody = document.getElementById("matrix-body");
const userLang = navigator.language || navigator.userLanguage;
const homeserver = matrixBody.getAttribute('data-homeserver') || "https://matrix.org"
const roomAlias = matrixBody.getAttribute('data-roomAlias');
var gallery = ( matrixBody.getAttribute('data-gallery') === 'true' );
var userFilteredOut = matrixBody.getAttribute('data-userFilteredOut');
var giveRoomAddress = matrixBody.getAttribute('data-giveRoomAddress') === "false" ? false : true;
var displayDate = ( matrixBody.getAttribute('data-displayDate') === 'true');
var oldTimelineLength = 0;
var imgWidth = 800;
var imgHeight = 600;
var keepRefresh = 1;
var urlForRooms = "https://matrix.to/#/"
var spinner = document.createElement('div');
spinner.classList.add("centered")
spinner.innerHTML = '<i id="waitingspinner" class="fa fa-spinner fa-spin"></i>';
const siteLang = userLang === 'fr' ? 'fr' : 'en';
var string = {
    en:
        {
            join_on_matrix: "Join the room on matrix"
        },
    fr:
        {
            join_on_matrix: "Retrouver le salon sur Matrix"
        }

}
// function to stop refreshing page
function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function cancelRefresh() {
    keepRefresh = 0;
    document.getElementById("waitingspinner").style.visibility = "hidden";
}

function giveTheDate(time){
    let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    date = new Date(time);
    return date.toLocaleString(userLang, options);

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
        if ( displayDate ) result += "<span class='matrix-date'>" + giveTheDate(message.localTimestamp) + "</span>";
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
    result += "<div class='matrix-summary'>";
    result += "<h3 class='matrix-title'>" + room.name + "</h3>"
    if ( room.topic ) result += "<p class='matrix-text'>" + room.topic + "</p>"
    result += "</div>";
    result += "</div>"
    return result;

}

function addEventsToPage(client, room) {
    var matrixContainer = document.getElementById("matrix-container");
    matrixContainer.classList.add("matrix-event-container");
    if ( gallery ) matrixContainer.classList.add("matrix-gallery-container");
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
        hierarchy.rooms.slice().reverse().forEach( (room) => {
        matrixContainer.innerHTML += getRoomInSpace(client, room);
    });

    var roomsLinks = document.getElementsByClassName("matrix-room-summary");
    for (var i = 0; i < roomsLinks.length; i++) {
        roomsLinks[i].addEventListener('click', linkToRoomContent, false);
    }

    cancelRefresh();

}

function linkToRoomContent() {
    matrixBody.innerHTML = "";
    startRefresh();
    matrixBody.innerHTML += "<a id='space-root-link' href>Retour à la liste des salons</a></br>";
    fetchMessagesInRoom("", this.getAttribute("data-room-id"))
}

function linkToRootSpace() {
    matrixBody.innerHTML = "";
    startRefresh();
    fetchMessagesInRoom(roomAlias);
}

async function fetchMessagesInRoom(alias, idOfRoom) {
    insertAfter(spinner, matrixBody)

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
                matrixBody.innerHTML += "<h1 class='matrix-body-title'>" + room.name + "</h1>";
                if ( giveRoomAddress ) matrixBody.innerHTML += "<h2 class='matrix-body-title'><a class='room-link' href='https://matrix.to/#/"+ room.roomId +"'>" + string[siteLang]['join_on_matrix']+ "</a></h2>"
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

});
