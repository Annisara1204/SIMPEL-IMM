"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveObserverNote } from "../penilaian/actions";

type NoteType = "observation" | "strength" | "development" | "special";
type NoteRevision = { id: number; content_before: string; content_after: string; revision: number; actor_name: string; changed_at: string };
export type NoteRecord = { id: string; participant_id: string; rubric_version_id: string; indicator_id: string | null; author_id: string; author_name: string; note_type: NoteType; content: string; revision: number; updated_at: string; observer_note_revisions?: NoteRevision[] };
type Props = { participantId: string; rubricVersionId: string; currentUserId: string; notes: NoteRecord[] };

const noteTypes: { id: NoteType; label: string; hint: string }[] = [
  { id: "observation", label: "Observasi / bukti", hint: "Tulis perilaku atau ucapan yang benar-benar teramati." },
  { id: "strength", label: "Kekuatan", hint: "Catat kekuatan peserta yang didukung bukti." },
  { id: "development", label: "Area pengembangan", hint: "Catat hal yang dapat dikembangkan dengan cara yang spesifik dan membangun." },
  { id: "special", label: "Catatan khusus", hint: "Informasi kontekstual privat yang relevan untuk tim penilai." },
];

function NoteEditor({ participantId, rubricVersionId, currentUserId, noteType, record, onSaved }: { participantId: string; rubricVersionId: string; currentUserId: string; noteType: NoteType; record: NoteRecord | null; onSaved: (record: NoteRecord) => void }) {
  const router = useRouter();
  const [content, setContent] = useState(record?.content ?? "");
  const [syncedContent, setSyncedContent] = useState(record?.content ?? "");
  const [revision, setRevision] = useState(record?.revision ?? 0);
  const [latest, setLatest] = useState({ content: record?.content ?? "", revision: record?.revision ?? 0, author_name: record?.author_name ?? "Anda" });
  const [conflict, setConflict] = useState<typeof latest | null>(null);
  const [status, setStatus] = useState("Belum ada perubahan");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!record || record.revision <= revision) return;
    const next = { content: record.content, revision: record.revision, author_name: record.author_name };
    if (record.author_id === currentUserId && record.content === content) {
      setContent(next.content);
      setSyncedContent(next.content);
      setRevision(next.revision);
      setLatest(next);
      setStatus("Tersimpan dan tersinkron ke perangkat lain");
      setConflict(null);
    } else if (content !== syncedContent || pending) {
      setLatest(next);
      setConflict(next);
      setStatus("Catatan berubah di perangkat lain. Pilih versi yang akan dipakai.");
    } else {
      setContent(next.content);
      setSyncedContent(next.content);
      setRevision(next.revision);
      setLatest(next);
      setStatus(`Diperbarui di perangkat lain oleh ${next.author_name}`);
    }
  }, [record?.id, record?.revision, record?.content, record?.author_name]);

  useEffect(() => {
    if (content === syncedContent || conflict || pending) return;
    const timer = window.setTimeout(() => {
      setStatus("Menyimpan…");
      startTransition(async () => {
        const result = await saveObserverNote({ participantId, rubricVersionId, noteType, content, expectedRevision: revision });
        if (!result.ok) {
          if ("conflict" in result && result.conflict && "latest" in result) {
            const server = result.latest as { content: string; revision: number; author_name: string };
            const next = { content: server.content, revision: server.revision, author_name: server.author_name };
            setLatest(next);
            setConflict(next);
            onSaved(result.latest as NoteRecord);
            setStatus(result.message);
          } else setStatus(result.message);
          return;
        }
        const saved = result.record as NoteRecord;
        setRevision(saved.revision);
        setLatest({ content: saved.content, revision: saved.revision, author_name: saved.author_name });
        setSyncedContent(saved.content);
        onSaved(saved);
        setStatus("Tersimpan");
        router.refresh();
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [content, syncedContent, revision, conflict, pending, participantId, rubricVersionId, noteType, onSaved]);

  const acceptLatest = () => {
    if (!conflict) return;
    setContent(conflict.content);
    setSyncedContent(conflict.content);
    setRevision(conflict.revision);
    setLatest(conflict);
    setConflict(null);
    setStatus("Menggunakan catatan terbaru");
  };
  const applyMine = () => {
    if (!conflict) return;
    setRevision(conflict.revision);
    setLatest(conflict);
    setConflict(null);
    setStatus("Menerapkan catatan Anda setelah konflik dikonfirmasi…");
  };

  return <div className="observer-note-editor"><label>{noteTypes.find((type) => type.id === noteType)?.label}<textarea value={content} maxLength={3000} rows={3} onChange={(event) => setContent(event.target.value)} disabled={pending || !!conflict} placeholder={noteTypes.find((type) => type.id === noteType)?.hint}/></label><small aria-live="polite">{status}{latest.revision ? ` · versi catatan ${latest.revision}` : ""}</small>{conflict && <div className="observation-conflict" role="alert"><strong>Konflik catatan</strong><p>Versi server: “{conflict.content || "kosong"}”. Pilihan Anda: “{content || "kosong"}”.</p><button type="button" onClick={acceptLatest} disabled={pending}>Gunakan catatan terbaru</button><button type="button" onClick={applyMine} disabled={pending}>Terapkan ulang tulisan saya</button></div>}{record?.observer_note_revisions?.length ? <details className="observation-history"><summary>Riwayat catatan ({record.observer_note_revisions.length})</summary>{[...record.observer_note_revisions].sort((a, b) => b.revision - a.revision).slice(0, 8).map((item) => <p key={item.id}><strong>{item.actor_name}</strong> · “{item.content_before || "kosong"}” → “{item.content_after || "kosong"}” · {new Date(item.changed_at).toLocaleString("id-ID")}</p>)}</details> : null}</div>;
}

export function ObserverNotes(props: Props) {
  const [notes, setNotes] = useState(props.notes);
  useEffect(() => setNotes(props.notes), [props.notes]);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ table: string; row: Record<string, unknown> }>).detail;
      const row = detail?.row;
      if (detail?.table !== "observer_notes" || row.participant_id !== props.participantId || row.rubric_version_id !== props.rubricVersionId) return;
      setNotes((current) => {
        const next = row as unknown as NoteRecord;
        const index = current.findIndex((item) => item.id === next.id || (item.author_id === next.author_id && item.note_type === next.note_type && item.indicator_id === (next.indicator_id ?? null)));
        if (index < 0) return [...current, next];
        const copy = [...current];
        copy[index] = { ...copy[index], ...next, observer_note_revisions: copy[index].observer_note_revisions };
        return copy;
      });
    };
    window.addEventListener("assessment-realtime-change", listener);
    return () => window.removeEventListener("assessment-realtime-change", listener);
  }, [props.participantId, props.rubricVersionId]);

  const update = (saved: NoteRecord) => setNotes((current) => {
    const index = current.findIndex((item) => item.id === saved.id || (item.author_id === saved.author_id && item.note_type === saved.note_type && item.indicator_id === null));
    if (index < 0) return [...current, saved];
    const copy = [...current];
    copy[index] = { ...copy[index], ...saved, observer_note_revisions: copy[index].observer_note_revisions };
    return copy;
  });
  const legacy = notes.filter((note) => note.indicator_id && note.content.trim());
  const shared = notes.filter((note) => note.content.trim() && note.author_id !== props.currentUserId);

  return <details className="observer-notes"><summary>Catatan privat tiap penulis ({notes.filter((note) => note.content.trim()).length})</summary><p>Catatan tidak dibagikan ke peserta atau publik. Setiap penulis mengubah catatannya sendiri; skor indikator tetap satu nilai bersama.</p><div className="observer-notes-grid">{noteTypes.map((type) => <NoteEditor key={type.id} participantId={props.participantId} rubricVersionId={props.rubricVersionId} currentUserId={props.currentUserId} noteType={type.id} record={notes.find((note) => note.author_id === props.currentUserId && note.note_type === type.id && !note.indicator_id) ?? null} onSaved={update}/>)}</div>{shared.length > 0 && <div className="observer-notes-readonly"><h4>Catatan penulis lain</h4>{shared.map((note) => <article key={note.id}><strong>{note.author_name} · {noteTypes.find((type) => type.id === note.note_type)?.label ?? "Catatan"}</strong><p>{note.content}</p><small>{new Date(note.updated_at).toLocaleString("id-ID")}</small></article>)}</div>}{legacy.length > 0 && <div className="observer-notes-readonly"><h4>Catatan lama per indikator</h4>{legacy.map((note) => <article key={note.id}><strong>{note.author_name} · {noteTypes.find((type) => type.id === note.note_type)?.label ?? "Catatan"}</strong><p>{note.content}</p></article>)}</div>}</details>;
}
