import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { DefaultIcon, RedPulseIcon, NIGERIA_BOUNDS } from './mapConfig';
import { MapController, ManualRecenterBtn } from './MapControls';

const MapLayer = ({ location, alerts, currentUser, isAlerting, isMapLocked, setIsMapLocked }) => {
    return (
        <MapContainer 
            center={[9.0820, 8.6753]} 
            zoom={6} 
            minZoom={5} 
            maxBounds={NIGERIA_BOUNDS} 
            maxBoundsViscosity={1.0}
            className="h-full w-full z-0"
        >
            <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
            
            {/* CONTROLS */}
            <MapController location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />
            <ManualRecenterBtn location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />

            {/* MY LOCATION */}
            {location && (
                <Marker 
                    position={[location.lat, location.lng]} 
                    icon={isAlerting ? RedPulseIcon : DefaultIcon} 
                >
                    <Popup>{isAlerting ? "SIGNAL ACTIVE!" : "You are here"}</Popup>
                </Marker>
            )}

            {/* OTHER ALERTS */}
            {alerts.map((alert) => (
                alert.user !== currentUser?.email && (
                    <Marker 
                        key={alert.id} 
                        position={[alert.lat, alert.lng]}
                        icon={RedPulseIcon} 
                    >
                        <Popup><strong className="text-red-600">ALERT!</strong><br/>{alert.user}</Popup>
                    </Marker>
                )
            ))}
        </MapContainer>
    );
};

export default MapLayer;