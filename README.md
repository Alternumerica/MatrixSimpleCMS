# MatrixSimpleCMS

The file cors_python_server.py has for single purpose testing while avoiding CORS error.
Run with `python cors_python_server.py 8080` or the port number of your choice.

Allow adding the content of a Matrix room to a web page.

Just add a div with id "matrix-body" to add the content of a Matrix room or space

`<div id="matrix-body" data-homeserver="https://matrix.org" data-roomAlias="#community:matrix.org"></div>`

attributes possible are following :

- data-homeserver: to choose the homeserver from which peeking into rooms
- data-roomAlias: the alias of the room you want to display, the room history needs to be set as world_visible.
- data-gallery: **boolean**, to activate the display of a gallery, to use a Matrix room as a photo gallery.
- data-userFilteredOut: to prevent display of messages from a certain user.
- data-giveRoomAddress: set to "false" to not display the address of the room beneath the title.
