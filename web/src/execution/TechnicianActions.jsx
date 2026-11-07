import { useRef, useState } from 'react';
import { apiUrl, request } from '../lib/api.js';
import { compressImage, getLocation } from '../lib/device.js';
import { PHOTO_CATEGORY_LABELS } from '../lib/labels.js';
import { MAX_REPORT_LENGTH, REQUIRED_PHOTOS } from '../lib/rules.js';

const primaryButton = 'w-full rounded-xl bg-brand py-4 text-lg font-semibold text-white disabled:opacity-60';

function ArriveStep({ activity, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleArrive() {
    setBusy(true);
    setError('');
    try {
      const location = await getLocation();
      const result = await request(`/activities/${activity.id}/arrive`, { method: 'POST', body: location });
      onChange(result.activity);
    } catch (arriveError) {
      setError(arriveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">Cuando estés en el sitio, marca tu llegada. Se guarda la hora y tu ubicación.</p>
      <button type="button" onClick={handleArrive} disabled={busy} className={primaryButton}>
        {busy ? 'Obteniendo ubicación…' : '📍 Llegué'}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

// TODO(T10, T12): replace the inline checklist and thumbnails with Sebas's <PhotoChecklist /> and <PhotoGrid />.
function PhotosStep({ activity, onChange }) {
  const inputRef = useRef(null);
  const [pendingCategory, setPendingCategory] = useState(null);
  const [uploadingCategory, setUploadingCategory] = useState(null);
  const [error, setError] = useState('');

  function openCamera(category) {
    setPendingCategory(category);
    setError('');
    inputRef.current.click();
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !pendingCategory) return;

    setUploadingCategory(pendingCategory);
    try {
      const compressed = await compressImage(file);
      const form = new FormData();
      form.append('category', pendingCategory);
      form.append('photo', compressed, 'photo.jpg');
      const result = await request(`/activities/${activity.id}/photos`, { method: 'POST', body: form });
      onChange(result.activity);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingCategory(null);
      setPendingCategory(null);
    }
  }

  async function handleDelete(photoId) {
    setError('');
    try {
      const result = await request(`/photos/${photoId}`, { method: 'DELETE' });
      onChange(result.activity);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const categories = [...REQUIRED_PHOTOS, 'other'];

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Fotos</h2>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

      <ul className="flex flex-col gap-3">
        {categories.map((category) => {
          const photos = activity.photos.filter((photo) => photo.category === category);
          const isRequired = category !== 'other';
          const done = photos.length > 0;
          return (
            <li key={category} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {isRequired ? (done ? '✅' : '⬜') : '➕'} {PHOTO_CATEGORY_LABELS[category]}
                  {isRequired && !done && <span className="ml-1 text-xs text-red-700">obligatoria</span>}
                </p>
                <button
                  type="button"
                  onClick={() => openCamera(category)}
                  disabled={uploadingCategory !== null}
                  className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {uploadingCategory === category ? 'Subiendo…' : '📷 Tomar'}
                </button>
              </div>
              {photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img src={apiUrl(photo.url)} alt={PHOTO_CATEGORY_LABELS[category]} className="aspect-square w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDelete(photo.id)}
                        aria-label="Eliminar foto"
                        className="absolute top-1 right-1 rounded-full bg-black/60 px-2 text-sm text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

// TODO(T11): replace the inline textarea with Sebas's <ReportField />.
function ReportAndFinishStep({ activity, onChange }) {
  const [draft, setDraft] = useState(activity.report ?? '');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const isDirty = draft !== activity.report;
  const canFinish = activity.missing_photos.length === 0 && draft.trim() !== '';

  async function saveReport() {
    const result = await request(`/activities/${activity.id}/report`, { method: 'PATCH', body: { report: draft } });
    onChange(result.activity);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await saveReport();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError('');
    try {
      if (isDirty) await saveReport();
      const location = await getLocation();
      const result = await request(`/activities/${activity.id}/finish`, { method: 'POST', body: location });
      onChange(result.activity);
    } catch (finishError) {
      setError(finishError.message);
      setFinishing(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <label htmlFor="report" className="font-semibold">
          Informe
        </label>
        <textarea
          id="report"
          rows={6}
          maxLength={MAX_REPORT_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="¿Qué encontraste y qué hiciste?"
          className="rounded-xl border border-slate-300 px-4 py-3 text-base"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {draft.length} / {MAX_REPORT_LENGTH}
          </span>
          {isDirty && <span className="text-amber-700">Sin guardar</span>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="rounded-xl border border-brand py-3 font-semibold text-brand disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar informe'}
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm">
        {!canFinish && (
          <p className="text-sm text-slate-600">
            Para terminar faltan:{' '}
            {[
              ...activity.missing_photos.map((category) => PHOTO_CATEGORY_LABELS[category]),
              ...(draft.trim() === '' ? ['el informe'] : []),
            ].join(', ')}
            .
          </p>
        )}
        <button type="button" onClick={handleFinish} disabled={!canFinish || finishing} className={primaryButton}>
          {finishing ? 'Cerrando…' : '✅ Terminé'}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </>
  );
}

// What the technician who holds the activity can do, depending on its status.
export default function TechnicianActions({ activity, onChange }) {
  if (activity.status === 'assigned') return <ArriveStep activity={activity} onChange={onChange} />;
  if (activity.status === 'on_site') {
    return (
      <>
        <PhotosStep activity={activity} onChange={onChange} />
        <ReportAndFinishStep activity={activity} onChange={onChange} />
      </>
    );
  }
  return null;
}
