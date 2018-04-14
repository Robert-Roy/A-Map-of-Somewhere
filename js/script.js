/* 
 * All rights reserved. Copyright Robert Roy 2017.
 */


//////////////////
//////////////////
// LOADING SECTION
//////////////////
//////////////////
//TODO: This really shouldn't display for the first second or so.

var viewmodelLoading = {
    ellipsesText: ko.observable('...'),
    incrementEllipses: showLoading,
    loadWorker: new Worker(null)
};
viewmodelLoading.startLoading = function () {
    viewmodelLoading.loadWorker = new Worker(viewmodelLoading.incrementEllipses(viewmodelLoading.ellipsesText));
};
viewmodelLoading.stopLoading = function () {
    viewmodelLoading.loadWorker.terminate();
}
//viewmodelLoading.stopLoading();
ko.applyBindings(viewmodelLoading);
viewmodelLoading.startLoading();
function showLoading(observableEllipses) {
    // Accepts a KO observable input and increments it every half-second from "."
    // to ".." to "..."
    switch (observableEllipses()) {
        case "...":
            observableEllipses(".");
            break;
        case ".":
            observableEllipses("..");
            break;
        case "..":
            observableEllipses("...");
            break;
        default:
            console.log("Error in showLoading().");
            break;
    }
    var showLoadingWithParameter = function () {
        showLoading(observableEllipses);
    };
    setTimeout(showLoadingWithParameter, 500);
}

//////////////////
//////////////////
// MAP SECTION
//////////////////
//////////////////
//TODO Generate map based on url
//IF no URL, generate map based on user's location

var modelMap = {
    map: null,
    mapsAPIActive: false
}

var map;
// uses the ipify API. For API usage, https://www.ipify.org/.
//TODO needs a timeout failsafe, on badURL will not get a success or failure
$.get("http://ip-api.com/json", function (data) {
    console.log(data.status);
    if (data.status === "success") {
        drawMap(data.lat, data.lon);
    }
});

//jQuery.getJSON("http://ip-api.com/json/$IP");
//loadWorker.terminate();

function activateMaps() {
    modelMap.mapsAPIActive = true;
}
;
function readyToDrawMaps() {
    return modelMap.mapsAPIActive;
}

function drawMap(latitude, longitude) {
    //TODO: What if we're not ready to draw maps yet? What if we don't become ready?
    //TODO: What if Lat/Long doesn't work? How would we know? What if city is no good?
    if (!readyToDrawMaps()) {
        // TODO should recurse with timeout.
        return null;
    }
    if (validLatLng(latitude, longitude)) {
        console.log("trying to draw map");
        divLoadingText = document.getElementById("loading-text");
        divLoadingText.outerHTML = "";
        viewmodelLoading.stopLoading();
        modelMap.map = new google.maps.Map(document.getElementById('map'), {
            center: {lat: latitude, lng: longitude},
            zoom: 13
        });
    }
    else{
        
    }
}

function validLatLng(latitude, longitude) {
    // verify that lat long are numbers
    if (typeof latitude === "number" && typeof longitude === "number") {
        // verify that numbers are within the bounds of latitude and longitude
        if (latitude >= -90 && latitude <= 90 && longitude <= 180 && longitude >= -180) {
            //is valid
            return true;
        }
    }
    return false;
}

function initMap() {
    // Constructor creates a new map - only center and zoom are required.
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.7413549, lng: -73.9980244},
        zoom: 13
    });
}