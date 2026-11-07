import { Camera, CameraDirection, EncodingType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Camera and GPS live here so the rest of the app does not care whether it runs in a browser or inside the Android app.

export const isNativeApp = Capacitor.isNativePlatform();

const LOCATION_ERRORS = {
  denied: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador o del teléfono.',
  unavailable: 'No se pudo obtener la ubicación. Revisa que el GPS esté encendido.',
  timeout: 'La ubicación tardó demasiado. Inténtalo de nuevo, idealmente al aire libre.',
};

const BROWSER_LOCATION_ERRORS = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

const LOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 };

function toLocation(coords) {
  return { lat: coords.latitude, lng: coords.longitude, accuracy_m: Math.round(coords.accuracy) };
}

function nativeLocationError(error) {
  const message = String(error?.message ?? '');
  if (/denied|permission/i.test(message)) return LOCATION_ERRORS.denied;
  if (/timeout|timed out/i.test(message)) return LOCATION_ERRORS.timeout;
  return LOCATION_ERRORS.unavailable;
}

export async function getLocation() {
  if (isNativeApp) {
    try {
      const position = await Geolocation.getCurrentPosition(LOCATION_OPTIONS);
      return toLocation(position.coords);
    } catch (error) {
      throw new Error(nativeLocationError(error));
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no permite obtener la ubicación'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toLocation(position.coords)),
      (error) => reject(new Error(LOCATION_ERRORS[BROWSER_LOCATION_ERRORS[error.code]] ?? LOCATION_ERRORS.unavailable)),
      LOCATION_OPTIONS,
    );
  });
}

// Native camera only (in the browser the page uses <input type="file" capture>). Returns null if the user cancels.
export async function takeNativePhoto() {
  try {
    const photo = await Camera.takePhoto({
      quality: 85,
      targetWidth: 1600,
      correctOrientation: true,
      encodingType: EncodingType.JPEG,
      cameraDirection: CameraDirection.Rear,
      editable: 'no',
      saveToGallery: false,
    });
    const response = await fetch(photo.webPath);
    return response.blob();
  } catch (error) {
    if (/cancel/i.test(String(error?.message ?? ''))) return null;
    throw new Error('No se pudo abrir la cámara. Revisa el permiso de cámara de la app.');
  }
}

// Phone photos weigh 3–6 MB; resizing to 1600 px JPEG leaves ~300 KB, which uploads fast on mobile data.
export async function compressImage(file, { maxSide = 1600, quality = 0.8 } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la foto'))),
      'image/jpeg',
      quality,
    );
  });
}
