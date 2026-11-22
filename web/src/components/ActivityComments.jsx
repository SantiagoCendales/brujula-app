import { useCallback, useRef, useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { request } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useActivityChanges } from '@/lib/liveUpdates';
import { useApi } from '@/lib/useApi';

const MAX_COMMENT_LENGTH = 2000;

export default function ActivityComments({ activityId, userId, role }) {
  const { data, error, loading, reload } = useApi(`/activities/${activityId}/comments`);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [editVisibility, setEditVisibility] = useState(null);
  const [visibilityTarget, setVisibilityTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const visibilityTrigger = useRef(null);
  const isClient = role === 'client';
  const reloadComments = useCallback((event) => {
    if (event.activity_id === Number(activityId) && ['comment_added', 'comment_updated'].includes(event.change)) reload();
  }, [activityId, reload]);
  useActivityChanges(reloadComments);

  function openVisibility(target, element) {
    visibilityTrigger.current = element;
    setVisibilityTarget(target);
  }

  function chooseVisibility(value) {
    if (visibilityTarget === 'edit') setEditVisibility(value);
    else setVisibility(value);
    setVisibilityTarget(null);
    setSaveError('');
  }

  async function submit(event, commentId = null) {
    event.preventDefault();
    const text = (commentId ? editBody : body).trim();
    if (!text) {
      setSaveError('Escribe una novedad antes de guardar.');
      return;
    }
    const selectedVisibility = commentId ? editVisibility : visibility;
    if (!isClient && !selectedVisibility) {
      setSaveError('Selecciona si el comentario es interno o público.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await request(`/activities/${activityId}/comments${commentId ? `/${commentId}` : ''}`, {
        method: commentId ? 'PATCH' : 'POST',
        body: isClient ? { body: text } : { body: text, visibility: selectedVisibility },
      });
      if (commentId) {
        setEditingId(null);
        setEditBody('');
        setEditVisibility(null);
      } else {
        setBody('');
        setVisibility(null);
      }
      reload();
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ErrorMessage>{error?.message || saveError}</ErrorMessage>
      {loading && !data && <Skeleton className="h-24 rounded-xl" />}
      {data && (
        <>
          {data.comments.length === 0 && <p className="text-muted-foreground">Todavía no hay novedades.</p>}
          <ul className="flex flex-col gap-3">
            {data.comments.map((comment) => (
              <li key={comment.id}>
                <Card size="sm" className={comment.visibility === 'internal' ? 'text-primary' : undefined}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{comment.author.name}</p>
                        {!isClient && (
                          <p className="text-xs font-medium">{comment.visibility === 'internal' ? 'Interno' : 'Público'}</p>
                        )}
                        <p className={`text-xs ${comment.visibility === 'internal' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {formatDateTime(comment.created_at)}
                        </p>
                        {comment.edited_at && (
                          <p className={`text-xs ${comment.visibility === 'internal' ? 'text-primary' : 'text-muted-foreground'}`}>
                            Editado: {formatDateTime(comment.edited_at)}
                          </p>
                        )}
                      </div>
                      {comment.author.id === userId && editingId === null && (
                        <Button type="button" variant="ghost" size="lg" disabled={saving} onClick={() => {
                          setEditingId(comment.id);
                          setEditBody(comment.body);
                          setEditVisibility(comment.visibility);
                          setSaveError('');
                        }}>
                          Editar
                        </Button>
                      )}
                    </div>
                    {editingId === comment.id ? (
                      <form className="flex flex-col gap-3" onSubmit={(event) => submit(event, comment.id)}>
                        {!isClient && (
                          <Button type="button" variant="ghost" size="lg" className="min-h-12 self-start"
                            disabled={saving} onClick={(event) => openVisibility('edit', event.currentTarget)}>
                            {editVisibility === 'internal' ? 'Interno' : 'Público'} · Cambiar visibilidad
                          </Button>
                        )}
                        {!isClient && comment.visibility === 'public' && editVisibility === 'internal' && (
                          <p className="text-sm text-muted-foreground">
                            Al hacerlo interno dejará de estar visible para el cliente, pero no se puede deshacer una lectura anterior.
                          </p>
                        )}
                        <Label htmlFor={`edit-comment-${comment.id}`}>Editar novedad</Label>
                        <Textarea id={`edit-comment-${comment.id}`} value={editBody} maxLength={MAX_COMMENT_LENGTH} disabled={saving}
                          onChange={(event) => setEditBody(event.target.value)} />
                        <Button type="submit" size="touch" disabled={saving}>Guardar cambios</Button>
                        <Button type="button" variant="outline" size="touch" disabled={saving} onClick={() => {
                          setEditingId(null);
                          setSaveError('');
                        }}>Cancelar</Button>
                      </form>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{comment.body}</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Label htmlFor="new-comment">Nueva novedad</Label>
            <Textarea id="new-comment" value={body} maxLength={MAX_COMMENT_LENGTH} disabled={saving}
              readOnly={!isClient && !visibility}
              aria-haspopup={!isClient && !visibility ? 'dialog' : undefined}
              onClick={(event) => { if (!isClient && !visibility) openVisibility('new', event.currentTarget); }}
              onKeyDown={(event) => {
                if (!isClient && !visibility && (event.key === 'Enter' || event.key === ' ' || event.key.length === 1)) {
                  event.preventDefault();
                  openVisibility('new', event.currentTarget);
                }
              }}
              onChange={(event) => setBody(event.target.value)}
              placeholder={!isClient && !visibility ? 'Toca aquí para elegir la visibilidad' : 'Escribe una novedad de la actividad'} />
            {!isClient && visibility && (
              <Button type="button" variant="ghost" size="lg" className="min-h-12 self-start"
                disabled={saving} onClick={(event) => openVisibility('new', event.currentTarget)}>
                {visibility === 'internal' ? 'Interno' : 'Público'} · Cambiar visibilidad
              </Button>
            )}
            <Button type="submit" size="touch" disabled={saving || (!isClient && !visibility)}>Enviar novedad</Button>
          </form>
        </>
      )}
      <Dialog open={visibilityTarget !== null} onOpenChange={(open) => { if (!open) setVisibilityTarget(null); }}>
        <DialogContent showCloseButton={false} onCloseAutoFocus={(event) => {
          event.preventDefault();
          visibilityTrigger.current?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>¿Quién puede ver esta novedad?</DialogTitle>
            <DialogDescription>Elige la visibilidad del comentario.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button type="button" size="touch" variant="outline" onClick={() => chooseVisibility('internal')}>
              Comentario interno
            </Button>
            <p className="text-sm text-muted-foreground">Solo el personal con acceso a la actividad.</p>
            <Button type="button" size="touch" variant="outline" onClick={() => chooseVisibility('public')}>
              Comentario público
            </Button>
            <p className="text-sm text-muted-foreground">El cliente también podrá verlo.</p>
            <Button type="button" size="touch" variant="ghost" onClick={() => setVisibilityTarget(null)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
