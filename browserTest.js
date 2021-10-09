console.log("Loading browser sdk");

const homeserver = document.currentScript.getAttribute('homeserver') || "https://matrix.org"
const alias = document.currentScript.getAttribute('roomAlias');
var gallery = ( document.currentScript.getAttribute('gallery') === 'true' );
var userFilteredOut = document.currentScript.getAttribute('userFilteredOut');
var room = "";
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

// to check if page is scrollable
function hasScrollBar() {
 return window.innerWidth > document.documentElement.clientWidth
}

function populateWithScroll(client, room) {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        client.scrollback(room).then(function(res) {
            addEventsToPage(client, res.timeline);
        });
    }
}

// to extract content from an event and add to the DOM
function getContentFromEvent(client, message) {
    let result = "";
    if ( message.event.sender === userFilteredOut ) return result;
    if ( message.event.type === "m.room.message" ) {
        result += "<div class='matrixEvent'>";
        if ( message.event.content.msgtype === "m.image" ) {
            result += "<img class='matrixImg' src='"+ client.mxcUrlToHttp( message.event.content.url, 800, 600, "scale", false )  +"'>"

        } else {
            if ( !gallery ) result += "<p class='matrixText'>" + ( message.event.content.formatted_body || message.event.content.body ) + "</p>";
        }
        result += "</div>";
    }
    return result;

}

function getRoomInSpace(client, room) {
    let result = "";
    if ( room.room_type === "m.space" ) return result;
    result += "<a href='"+ urlForRooms + room.canonical_alias +"'><div class='roomSummary'>";
    result += "<img class='matrixImg' src='" + client.mxcUrlToHttp( room.avatar_url, 800, 600, "scale", false ) + "'>";
    result += "<h3 class='matrixTitle'>" + room.name + "<h3>"
    if ( room.topic ) result += "<p class='matrixText'>" + room.topic + "<p>"
    result += "</div>";
    return result;

}

function addEventsToPage(client, timeline) {
    var matrixBody = document.getElementById("matrixBody");
    timeline.slice( 0, timeline.length - oldTimelineLength ).reverse().forEach( (message) => {
            matrixBody.innerHTML += getContentFromEvent(client, message);
    });
    //  //Pour récupérer plus de messages si la page n'est pas défilable.
    if ( oldTimelineLength == timeline.length ) cancelRefresh();
    if ( ( oldTimelineLength < timeline.length ) && !hasScrollBar() ) {
        populateWithScroll( client, room );
    }
    // ------------- -------------------- //
    oldTimelineLength = timeline.length;

}

function getSpaceContent(client, hierarchy){
    hierarchy.rooms.forEach( (room) => {
        matrixBody.innerHTML += getRoomInSpace(client, room);
    });
    console.log(hierarchy);
    cancelRefresh();

}

async function fetchMessagesInRoom() {

    const tmpClient = await matrixcs.createClient(homeserver);


    const { user_id, device_id, access_token } = await tmpClient.registerGuest();

    console.log(user_id);

    const client = await matrixcs.createClient({ baseUrl: homeserver, accessToken: access_token, userId: user_id, deviceId: device_id });

    await client.startClient({initialSyncLimit: 100});
    client.setGuest(true);
//    client.storeClientOptions({"lazy_load_members": true});
    function getRoomContent ( roomId, hierarchy ) {

        client.peekInRoom(roomId).then(function(res) {
            console.log( res );
            room = res;
            let matrixBody = document.getElementById("matrixBody");
            matrixBody.innerHTML += "<h1>" + room.name + "</h1>";
            if ( hierarchy.rooms.length == 1 ) addEventsToPage(client, res.timeline);
            else getSpaceContent(client, hierarchy);
            client.stopClient();

        })
    }

    client.getRoomIdForAlias(alias).then(function(res) {
        client.getRoomHierarchy(res.room_id).then(function(hierarchy) {
            getRoomContent( res.room_id, hierarchy ) ;
        });

    });



    window.addEventListener('scroll', () => {
        if ( keepRefresh ) populateWithScroll(client, room);
    })

}

fetchMessagesInRoom();
