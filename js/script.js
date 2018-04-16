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
    divLoadingText = document.getElementById("loading-text");
    divLoadingText.outerHTML = "";
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

var viewmodelMap = {
    map: null,
    mapsAPIActive: false,
    mapWorker: new Worker(null),
    pendingGeolocation: false,
    geolocationError: false,
    successFunction: function () {}, // function called when a map is drawn
    failureFunction: function () {}, // function called when an error or timeout occurs that prevents map drawing
    timeoutAfterMS: 10000,
    startTime: null
}
viewmodelMap.create = function () {
    // If asked to create itself without latitude and longitude set, it will attempt to use
    // geolocation to do so. If latitude and longitude are set, it will use those
    // 
    // so I can recurse with a timeout while keeping "this" intact.
    if(this.startTime === null){
        console.log("setting new startTime");
        this.startTime = new Date().getTime();
    }
    var that = this;
    var recurse = function () {
        that.create();
    }

    // verify that google maps api is active
    if (!this.mapsAPIActive) {
        //wait for google maps API to be active before proceeding
        console.log("Maps not active... Waiting.");
        setTimeout(recurse, 100);
        return;
    }

    // check if a valid latitude and longitude have been established
    if (validLatLng(this.latitude, this.longitude)) {
        // Draw the map
        console.log("trying to draw map");
        drawMap(this.latitude, this.longitude);
        this.successFunction();
        return;
    }
    // Check if we are currently waiting on geolocation
    if (!this.pendingGeolocation) {
        // if not, start getting location
        console.log("trying to get location");
        // Note that we are now waiting for geolocation
        this.pendingGeolocation = true;
        // Start trying to get user location
        this.mapWorker = new Worker(this.getUserLocation());
        // Recurse to wait for geolocation or time-out
        setTimeout(recurse, 100);
        return;
    } else {
        // we are waiting for geolocation
        if (this.geolocationError) {
            console.log("An error was encountered when attempting geolocation");
            // call set failure function
            this.failureFunction();
            // stop recursing
            return;
        }
        // Check if we have waited too long (timeoutAfterMS milliseconds). Throw error if we have.
        console.log(this.startTime + this.timeoutAfterMS - new Date().getTime());
        if(this.startTime + this.timeoutAfterMS < new Date().getTime()){
            console.log("It took too long to get the user's location.");
            this.errorGettingUserLocation();
            this.failureFunction();
        } 
        // wait 1/10th of a second and check again
        setTimeout(recurse, 100);
        return;
    }
}
viewmodelMap.getUserLocation = function () {
    var that = this;
    var callSetLocation = function (position) {
        that.setLocation(position);
    }
    var callError = function () {
        that.errorGettingUserLocation();
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(callSetLocation, callError);
    } else {
        //browser doesn't support geolocation
        viewmodelMap.errorGettingUserLocation();
    }

}
viewmodelMap.errorGettingUserLocation = function () {
    console.log("Couldn't find him, boss!");
    this.geolocationError = true;
}
viewmodelMap.setLocation = function (position) {
    this.latitude = position.coords.latitude;
    this.longitude = position.coords.longitude;
}

viewmodelMap.successFunction = viewmodelLoading.stopLoading;
//TODO: Failurefunction
viewmodelMap.create();

// uses the ipapi.co API. For API usage, https://ipapi.co/.
//TODO needs a timeout failsafe, on badURL will not get a success or failure

// IP api is a neat API, but it does not support https, so it is a security issue and
// this is blocked by every modern browser. As a result, I have had to abandon
// This utility

function activateMaps() {
    viewmodelMap.mapsAPIActive = true;
}
function drawMap(latitude, longitude) {
    viewmodelMap.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: latitude, lng: longitude},
        zoom: 13
    });
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