#!/bin/bash

open() {
   gnome-terminal -t $1 -- /bin/sh -c "cd ${2}; node ${3}; exec bash"
}

open "start" "./client/" "start.js"
open "server" "./api/" "server.js"
open "tracker1" "./prueba_trackers/tracker1/" "tracker.js"
open "tracker2" "./prueba_trackers/tracker2/" "tracker.js"
open "tracker3" "./prueba_trackers/tracker3/" "tracker.js"
open "tracker4" "./prueba_trackers/tracker4/" "tracker.js"
open "peer 15000" "./prueba_peers/peer_15000" "peer.js"
open "peer 15001" "./prueba_peers/peer_15001" "peer.js"
