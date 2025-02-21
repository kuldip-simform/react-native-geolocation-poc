import Geolocation from '@react-native-community/geolocation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import MapView, { LatLng, MapMarker, PROVIDER_GOOGLE, Polyline, Polygon } from 'react-native-maps';
import { Images } from './src/assets';

interface CircleRegion {
  center: LatLng;
  radius: number; // in meters
}

const App = () => {
  const mapRef = useRef<MapView | null>(null);

  const geoFenceRegion: CircleRegion = useMemo(() => {
    return {
      center: { latitude: 37.43311575, longitude: -122.24044723 },
      radius: 3000,
    };
  }, []);

  const [isInside, setIsInside] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [polylineCoordinates, setPolylineCoordinates] = useState<LatLng[]>([]);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);

  const startWatchPosition = () => {
    clearWatch();
    subscriptionId !== null && Geolocation.clearWatch(subscriptionId);
    try {
      const watchID = Geolocation.watchPosition(
        (posi) => {
          const coordinate = {
            latitude: posi.coords.latitude,
            longitude: posi.coords.longitude,
          };
          mapRef.current?.setCamera({ center: coordinate });
          setPosition(coordinate);
          setPolylineCoordinates((prev) => [
            ...prev,
            {
              latitude: posi.coords.latitude,
              longitude: posi.coords.longitude,
            },
          ]);
        },
        (error) => Alert.alert('WatchPosition Error', JSON.stringify(error)),
        { enableHighAccuracy: true, distanceFilter: 10, maximumAge: 1000 },
      );
      setSubscriptionId(watchID);
    } catch (error) {
      Alert.alert('WatchPosition Error', JSON.stringify(error));
    }
  };

  const clearWatch = () => {
    setPolylineCoordinates([]);
    setPosition(null);
    subscriptionId !== null && Geolocation.clearWatch(subscriptionId);
    setSubscriptionId(null);
  };

  useEffect(() => {
    startWatchPosition();
    return () => {
      clearWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDistance = useCallback((loc1: LatLng, loc2: LatLng) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(loc2.latitude - loc1.latitude);
    const dLon = deg2rad(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(loc1.latitude)) *
        Math.cos(deg2rad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d * 1000; // Distance in meters
  }, []);

  const isUserInRegion = useCallback(
    (userLocation: LatLng, circleRegion: CircleRegion) => {
      const { center, radius } = circleRegion;

      const distance = getDistance(userLocation, center);

      return distance <= radius;
    },
    [getDistance],
  );

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  useEffect(() => {
    if (position) {
      const nowInside = isUserInRegion(position, geoFenceRegion);

      console.log({ nowInside });

      if (nowInside !== isInside) {
        // Check for a change in state
        setIsInside(nowInside);
        if (nowInside) {
          console.log('User entered the region');
          // Do something when the user enters
        } else {
          console.log('User exited the region');
          // Do something when the user exits
        }
      }
    }
  }, [geoFenceRegion, isInside, isUserInRegion, position]);

  function createCircularPolygon(
    center: LatLng,
    radiusKm: number,
    numPoints: number = 60,
  ): LatLng[] {
    const { latitude, longitude } = center;
    const earthRadiusKm: number = 6371;

    const points: LatLng[] = [];

    for (let i = 0; i < numPoints; i++) {
      const angle: number = (i / numPoints) * 2 * Math.PI;

      const latOffset: number = (radiusKm / earthRadiusKm) * Math.cos(angle);
      const lngOffset: number =
        ((radiusKm / earthRadiusKm) * Math.sin(angle)) /
        Math.cos((latitude * Math.PI) / 180);

      const newLatitude: number = latitude + (latOffset * 180) / Math.PI;
      const newLongitude: number = longitude + (lngOffset * 180) / Math.PI;

      points.push({ latitude: newLatitude, longitude: newLongitude });
    }

    return points;
  }

  const circlePolygon = createCircularPolygon(
    { latitude: 37.78825, longitude: -122.4324 },
    1,
    100,
  );

  console.log({ circlePolygon });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        >
        <MapMarker coordinate={{ latitude: 37.78825, longitude: -122.4324 }}>
          <Image style={{ width: 50, height: 50 }} source={Images.winning} />
        </MapMarker>

        {position ? (
          <MapMarker coordinate={position}>
            <Image style={{ width: 50, height: 50 }} source={Images.car} />
          </MapMarker>
        ) : null}
        {polylineCoordinates.length > 0 ? (
          <Polyline
            coordinates={polylineCoordinates}
            strokeWidth={5}
            fillColor="red"
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        <Polygon
          coordinates={circlePolygon}
          fillColor="rgba(255,0,0,0.1)"
          strokeColor="rgba(255,0,0,2)"
          strokeWidth={2}
        />
      </MapView>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  itemContainer: { rowGap: 10 },
  title: {
    fontWeight: '500',
  },
  buttonContainer: {
    backgroundColor: 'blue',
    marginHorizontal: 20,
    borderRadius: 16,
  },
});
