import * as MediaLibrary from 'expo-media-library';
import type { ImagePickerAsset } from 'expo-image-picker';

// EXIF spec: GPSAltitudeRef — 0=above sea level, 1=below
const ALTITUDE_REF_ABOVE = 0 as const;
const ALTITUDE_REF_BELOW = 1 as const;

type GpsFields = Partial<{
  GPSLatitude: number;
  GPSLongitude: number;
  GPSLatitudeRef: 'N' | 'S';
  GPSLongitudeRef: 'E' | 'W';
  GPSAltitude: number;
  GPSAltitudeRef: 0 | 1;
}>;

export type LocationResolveResult = {
  gps: GpsFields;
  warning: 'permission_denied' | 'no_assetid' | 'no_location' | 'error' | null;
};

const EMPTY_RESULT: LocationResolveResult = { gps: {}, warning: null };

function hasExistingGps(exif: ImagePickerAsset['exif']): boolean {
  if (!exif) return false;
  return typeof exif.GPSLatitude === 'number' && typeof exif.GPSLongitude === 'number';
}

function extractAltitude(location: unknown): number | null {
  if (typeof location !== 'object' || location === null) return null;
  const alt = (location as { altitude?: unknown }).altitude;
  return typeof alt === 'number' && Number.isFinite(alt) ? alt : null;
}

function buildGpsFields(latitude: number, longitude: number, altitude: number | null): GpsFields {
  const fields: GpsFields = {
    GPSLatitude: Math.abs(latitude),
    GPSLongitude: Math.abs(longitude),
    GPSLatitudeRef: latitude >= 0 ? 'N' : 'S',
    GPSLongitudeRef: longitude >= 0 ? 'E' : 'W',
  };
  if (altitude !== null) {
    fields.GPSAltitude = Math.abs(altitude);
    fields.GPSAltitudeRef = altitude >= 0 ? ALTITUDE_REF_ABOVE : ALTITUDE_REF_BELOW;
  }
  return fields;
}

async function ensurePermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await MediaLibrary.requestPermissionsAsync();
  return asked.granted;
}

/**
 * iOS PHPicker는 프레임워크 레벨에서 asset.exif의 GPS 섹션을 strip함.
 * expo-media-library.getAssetInfoAsync(assetId)는 원본 PHAsset의 location을
 * 반환하므로, 이를 EXIF 표준 flat 키로 변환해 client_exif에 병합한다.
 *
 * 업로드 블로킹 금지: 권한 거부·에러 시에도 빈 gps + warning만 반환.
 */
export async function resolveAssetLocation(
  asset: Pick<ImagePickerAsset, 'assetId' | 'exif'>,
): Promise<LocationResolveResult> {
  if (hasExistingGps(asset.exif)) return EMPTY_RESULT;
  if (!asset.assetId) return { gps: {}, warning: 'no_assetid' };

  try {
    if (!(await ensurePermission())) {
      return { gps: {}, warning: 'permission_denied' };
    }
    const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
    const location = info.location;
    if (
      !location ||
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      return { gps: {}, warning: 'no_location' };
    }
    return {
      gps: buildGpsFields(location.latitude, location.longitude, extractAltitude(location)),
      warning: null,
    };
  } catch {
    return { gps: {}, warning: 'error' };
  }
}
