import { Camera, CircleCheck, Circle, LoaderCircle, MapPin, Plus, Send, Undo2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiUrl, request } from '@/lib/api';
import { compressImage, getLocation, isNativeApp, takeNativePhoto } from '@/lib/device';
import { formatDateTime } from '@/lib/format';
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

  async function uploadPhoto(category, image) {
    setUploadingCategory(category);
    try {
      const compressed = await compressImage(image);
      const form = new FormData();
      form.append('category', category);
      form.append('photo', compressed, 'photo.jpg');
      const result = await request(`/activities/${activity.id}/photos`, { method: 'POST', body: form });
      onChange(result.activity);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingCategory(null);
    }
  }

  async function openCamera(category) {
    setError('');
    if (!isNativeApp) {
      setPendingCategory(category);
      inputRef.current.click();
      return;
    }
    try {
      const image = await takeNativePhoto();
      if (image) await uploadPhoto(category, image);
    } catch (cameraError) {
      setError(cameraError.message);
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const category = pendingCategory;
    setPendingCategory(null);
    if (file && category) await uploadPhoto(category, file);
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

function ReturnedNotice({ activity }) {
  const lastReturn = activity.events.findLast((event) => event.type === 'returned');
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900">
      <Undo2 />
      <AlertTitle>El CEC devolvió el informe</AlertTitle>
      <AlertDescription className="text-amber-900">
        {lastReturn?.note}
        <span className="mt-1 block text-xs opacity-80">
          {lastReturn?.user.name} · {formatDateTime(lastReturn?.created_at)}
        </span>
      </AlertDescription>
    </Alert>
  );
}

// On site it closes with "Terminé" (with GPS); after a return it resubmits to CEC (no GPS, the original stays).
// TODO(T11): replace the inline textarea with Sebas's <ReportField />.
function ReportAndFinishStep({ activity, onChange }) {
  const isCorrection = activity.status === 'returned';
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
      const result = isCorrection
        ? await request(`/activities/${activity.id}/resubmit`, { method: 'POST' })
        : await request(`/activities/${activity.id}/finish`, { method: 'POST', body: await getLocation() });
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
          {missing.length > 0 && (
            <p className="text-muted-foreground">
              Para {isCorrection ? 'reenviar' : 'terminar'} faltan: {missing.join(', ')}.
            </p>
          )}
          <Button size="touch" onClick={handleFinish} disabled={missing.length > 0 || finishing}>
            {finishing ? <LoaderCircle className="animate-spin" /> : isCorrection ? <Send /> : <CircleCheck />}
            {finishing ? 'Enviando…' : isCorrection ? 'Reenviar al CEC' : 'Terminé'}
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
  if (activity.status === 'on_site' || activity.status === 'returned') {
    return (
      <>
        {activity.status === 'returned' && <ReturnedNotice activity={activity} />}
        <PhotosStep activity={activity} onChange={onChange} />
        <ReportAndFinishStep activity={activity} onChange={onChange} />
      </>
    );
  }
  return null;
}
