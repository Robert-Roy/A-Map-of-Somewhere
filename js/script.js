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
    active: false
};
viewmodelLoading.startLoading = function () {
    this.active = true;
    this.incrementEllipses(this.ellipsesText);
};
viewmodelLoading.stopLoading = function () {
    this.active = false;
}
//viewmodelLoading.stopLoading();
ko.applyBindings(viewmodelLoading);
viewmodelLoading.incrementEllipses = function (observableEllipses) {
    // Accepts a KO observable input and increments it every half-second from "."
    // to ".." to "..."

    // this will stop recursion if loading is no longer active.
    if (!this.active) {
        return;
    }
    console.log("still alive");
    that = this;
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
    var incrementEllipsesWithParameter = function () {
        that.incrementEllipses(observableEllipses);
    };
    setTimeout(incrementEllipsesWithParameter, 500);
};

//////////////////
//////////////////
// MAP SECTION
//////////////////
//////////////////
//TODO Generate map based on url
//TODO: Failurefunction
//IF no URL, generate map based on user's location

var viewmodelMap = {
    map: null,
    mapsAPIActive: false,
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
    if (this.startTime === null) {
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
        this.pendingGeolocation = false;
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
        this.getUserLocation();
        // Recurse to wait for geolocation or time-out
        setTimeout(recurse, 100);
        return;
    }
    if (this.geolocationError) {
        // if for some reason an error was encountered, stop looping.
        return;
    }
    // Check if we have waited too long (timeoutAfterMS milliseconds). Throw error if we have.
    console.log("Waiting for user location. " + (this.startTime + this.timeoutAfterMS - new Date().getTime()) + "ms remaining");
    if (this.startTime + this.timeoutAfterMS < new Date().getTime()) {
        console.log("It took too long to get the user's location.");
        this.errorGettingUserLocation();
        return;
    }
    // wait 1/10th of a second and check again
    setTimeout(recurse, 100);
    return;
}
viewmodelMap.getUserLocation = function () {
    var that = this;
    var callSetLocation = function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        that.setLocation(latitude, longitude);
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
    console.log("Unable to geolocate user.");
    this.geolocationError = true;
    this.failureFunction();
}
viewmodelMap.setLocation = function (latitude, longitude) {
    this.latitude = latitude;
    this.longitude = longitude;
}

var modelPlace = [];

function activateMaps() {
    //callback from google maps activation
    viewmodelMap.mapsAPIActive = true;
}
function drawMap(latitude, longitude) {
    viewmodelMap.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: latitude, lng: longitude},
        zoom: 13,
        mapTypeControl: false
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
function searchMap() {
    mapLocation = new google.maps.LatLng(viewmodelMap.latitude, viewmodelMap.longitude);
    var searchQuery = {
        location: mapLocation,
        radius: 6000,
        type: ['restaurant']
    }
    service = new google.maps.places.PlacesService(viewmodelMap.map);
    service.nearbySearch(searchQuery, handlePlacesSearch);
}
function handlePlacesSearch(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            modelPlace.push(results[i]);
            createMarker(results[i]);
        }
        sortPlaces();
        updatePlacesList();
    } else {
        // TODO: Something went wrong with the search, handle it.
    }
}
function createMarker(place) {
    var location = place.geometry.location;
    var marker = new google.maps.Marker({
        map: viewmodelMap.map,
        position: place.geometry.location
    });
    var infowindow = new google.maps.InfoWindow();
    google.maps.event.addListener(marker, 'click', function () {
        infowindow.setContent(place.name);
        infowindow.open(viewmodelMap.map, this);
    });
}

function sortPlaces(){
    modelPlace.sort(function(a, b){
        return a.name.localeCompare(b.name);
    });
}
function updatePlacesList(){
    var locationList = "";
    for(var i = 0; i < modelPlace.length; i++){
        locationList = locationList + "<li>" + modelPlace[i].name + "</li>";
    }
    document.getElementById("location-list").innerHTML = locationList;
}



//////////////////
//////////////////
// Active Section
//////////////////
//////////////////


function handleMapFailure() {
    divLoadingText = document.getElementById("loading-text");
    divLoadingText.innerHTML = "<h1>An error occurred while attempting to geolocate you.<br>Please <a href=index.html>try again</a>.</h1>";
}
function handleMapSuccess() {
    // remove loading text and set map to forefront
    viewmodelLoading.stopLoading();
    divLoadingText = document.getElementById("loading-text");
    divLoadingText.outerHTML = "";
    divMap = document.getElementById("map-column");
    divMap.classList.remove("no-display");
    divLeftColumn = document.getElementById("hidden-column-left");
    divLeftColumn.classList.remove("no-display");
    // draw locations on map
    setTimeout(searchMap, 2000);
}

viewmodelLoading.startLoading();
viewmodelMap.successFunction = function () {
    handleMapSuccess();
}
;
viewmodelMap.failureFunction = handleMapFailure;
viewmodelMap.create();



$(".hidden-column-left-hamburger").on('click touch', function(){
    console.log("I'm trying, here");
    $(this).parent().toggleClass("inactive");
});