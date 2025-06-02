var map;
var zoom = 12;
function onLoad() {
    map = new T.Map('mapDiv');
    map.centerAndZoom(new T.LngLat(116.40769, 39.89945), zoom);
}