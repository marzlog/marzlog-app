import * as Location from 'expo-location';
import type { LocationResolveResult } from './resolveAssetLocation';

const ALTITUDE_REF_ABOVE = 0 as const;
const ALTITUDE_REF_BELOW = 1 as const;

const CURRENT_LOCATION_TIMEOUT_MS = 8000;
const LAST_KNOWN_MAX_AGE_MS = 60 * 1000;

function buildGpsFields(
  latitude: number,
  longitude: number,
  altitude: number | null,
): LocationResolveResult['gps'] {
  const fields: LocationResolveResult['gps'] = {
    GPSLatitude: Math.abs(latitude),
    GPSLongitude: Math.abs(longitude),
    GPSLatitudeRef: latitude >= 0 ? 'N' : 'S',
    GPSLongitudeRef: longitude >= 0 ? 'E' : 'W',
  };
  if (altitude !== null && Number.isFinite(altitude)) {
    fields.GPSAltitude = Math.abs(altitude);
    fields.GPSAltitudeRef = altitude >= 0 ? ALTITUDE_REF_ABOVE : ALTITUDE_REF_BELOW;
  }
  return fields;
}

async function ensurePermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.granted;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location_timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * 카메라 직촬 사진에 현재 위치를 EXIF flat 키로 주입한다.
 * expo-image-picker의 launchCameraAsync는 temp 파일로만 저장되어 PHAsset이 없기 때문에
 * resolveAssetLocation(MediaLibrary)로는 GPS를 얻을 수 없음. 대신 촬영 시점의 현재 위치를
 * expo-location으로 조회해 iOS 기본 카메라 앱과 동일한 의미의 GPS 태그를 만든다.
 *
 * 최근 캐시된 위치(getLastKnownPositionAsync)를 우선 시도해 즉시 반환하고,
 * 없을 때만 getCurrentPositionAsync를 타임아웃(2s) 안에서 호출한다.
 * 권한 거부·타임아웃·에러 시 업로드를 블로킹하지 않고 warning만 반환.
 */
export async function resolveCurrentLocation(): Promise<LocationResolveResult> {
  try {
    if (!(await ensurePermission())) {
      return { gps: {}, warning: 'permission_denied' };
    }

    const cached = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    });
    let coords = cached?.coords ?? null;
    if (!coords) {
      const fresh = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        CURRENT_LOCATION_TIMEOUT_MS,
      );
      coords = fresh.coords;
    }

    if (
      !coords ||
      typeof coords.latitude !== 'number' ||
      typeof coords.longitude !== 'number'
    ) {
      return { gps: {}, warning: 'no_location' };
    }

    return {
      gps: buildGpsFields(
        coords.latitude,
        coords.longitude,
        typeof coords.altitude === 'number' ? coords.altitude : null,
      ),
      warning: null,
    };
  } catch {
    return { gps: {}, warning: 'error' };
  }
}
