// Camera and GPS live here so the rest of the app does not care whether it runs in a browser or inside the Android app.
// TODO(block 4): when running natively, use @capacitor/geolocation and @capacitor/camera here.

const LOCATION_ERRORS = {
  1: 'Permiso de ubicación denegado. Actívalo en la configuración del navegador o del teléfono.',
  2: 'No se pudo obtener la ubicación. Revisa que el GPS esté encendido.',
  3: 'La ubicación tardó demasiado. Inténtalo de nuevo, idealmente al aire libre.',
};

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Este dispositivo no permite obtener la ubicación'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_m: Math.round(position.coords.accuracy),
        }),
      (error) => reject(new Error(LOCATION_ERRORS[error.code] ?? 'No se pudo obtener la ubicación')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
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
