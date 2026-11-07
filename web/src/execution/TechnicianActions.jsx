import { Camera, CircleCheck, Circle, LoaderCircle, MapPin, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiUrl, request } from '@/lib/api';
import { compressImage, getLocation } from '@/lib/device';
import { PHOTO_CATEGORY_LABELS } from '@/lib/labels';
import { MAX_REPORT_LENGTH, REQUIRED_PHOTOS } from '@/lib/rules';

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
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">Cuando estés en el sitio, marca tu llegada. Se guarda la hora y tu ubicación.</p>
        <Button size="touch" onClick={handleArrive} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <MapPin />}
          {busy ? 'Obteniendo ubicación…' : 'Llegué'}
        </Button>
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fotos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

        {[...REQUIRED_PHOTOS, 'other'].map((category) => {
          const photos = activity.photos.filter((photo) => photo.category === category);
          const isRequired = category !== 'other';
          const done = photos.length > 0;
          const StatusIcon = !isRequired ? Plus : done ? CircleCheck : Circle;
          return (
            <div key={category} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-medium">
                  <StatusIcon className={`size-5 ${done ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  {PHOTO_CATEGORY_LABELS[category]}
                  {isRequired && !done && <span className="text-xs text-destructive">obligatoria</span>}
                </p>
                <Button variant="secondary" size="lg" onClick={() => openCamera(category)} disabled={uploadingCategory !== null}>
                  {uploadingCategory === category ? <LoaderCircle className="animate-spin" /> : <Camera />}
                  {uploadingCategory === category ? 'Subiendo…' : 'Tomar'}
                </Button>
              </div>
              {photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={apiUrl(photo.url)}
                        alt={PHOTO_CATEGORY_LABELS[category]}
                        className="aspect-square w-full rounded-md object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={() => handleDelete(photo.id)}
                        aria-label="Eliminar foto"
                        className="absolute top-1 right-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <ErrorMessage>{error}</ErrorMessage>
      </CardContent>
    </Card>
  );
}

// TODO(T11): replace the inline textarea with Sebas's <ReportField />.
function ReportAndFinishStep({ activity, onChange }) {
  const [draft, setDraft] = useState(activity.report ?? '');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const isDirty = draft !== activity.report;
  const missing = [
    ...activity.missing_photos.map((category) => PHOTO_CATEGORY_LABELS[category]),
    ...(draft.trim() === '' ? ['el informe'] : []),
  ];

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
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Label htmlFor="report" className="text-base">
            Informe
          </Label>
          <Textarea
            id="report"
            rows={6}
            maxLength={MAX_REPORT_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="¿Qué encontraste y qué hiciste?"
            className="text-base"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {draft.length} / {MAX_REPORT_LENGTH}
            </span>
            {isDirty && <span className="text-amber-700">Sin guardar</span>}
          </div>
          <Button variant="outline" size="touch" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? 'Guardando…' : 'Guardar informe'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          {missing.length > 0 && <p className="text-muted-foreground">Para terminar faltan: {missing.join(', ')}.</p>}
          <Button size="touch" onClick={handleFinish} disabled={missing.length > 0 || finishing}>
            {finishing ? <LoaderCircle className="animate-spin" /> : <CircleCheck />}
            {finishing ? 'Cerrando…' : 'Terminé'}
          </Button>
          <ErrorMessage>{error}</ErrorMessage>
        </CardContent>
      </Card>
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
