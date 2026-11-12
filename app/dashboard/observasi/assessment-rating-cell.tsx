"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAssessmentRating } from "../penilaian/actions";

type ResponseStatus = "unrated" | "scored" | "not_observed";
type Value = { score: number | null; response_status: ResponseStatus; evidence: string; revision: number; updated_at: string | null };
type Props = { participantId: string; rubricVersionId: string; indicatorId: string; rating: Value | null; peerRatings: { observer_id:string; observer_name:string; score:number|null; response_status:ResponseStatus; evidence:string }[]; descriptors: Record<string,string>; guidance?: string | null; observerId: string; readOnly?: boolean; locked?: boolean };

export function AssessmentRatingCell(props: Props) {
  const router = useRouter();
  const initial: Value = props.rating ?? { score: null, response_status: "unrated", evidence: "", revision: 0, updated_at: null };
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [conflict, setConflict] = useState<Value | null>(null);
  const [status, setStatus] = useState("Belum ada perubahan");
  const [pending, startTransition] = useTransition();
  const [online, setOnline] = useState(true);
  const storageKey = `dad-assessment:${props.rubricVersionId}:${props.participantId}:${props.indicatorId}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as { value: Value; savedRevision: number };
      if (draft.savedRevision === initial.revision && JSON.stringify(draft.value) !== JSON.stringify(initial)) {
        setValue(draft.value); setStatus(navigator.onLine ? "Draf lokal belum tersinkron" : "Offline · draf disimpan di perangkat ini");
      } else if (draft.savedRevision !== initial.revision) {
        setValue(draft.value); setConflict(initial); setStatus("Konflik draf lokal dengan versi server. Pilih salah satu sebelum melanjutkan.");
      }
    } catch { localStorage.removeItem(storageKey); }
  }, [storageKey]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); setStatus("Koneksi pulih · memeriksa draf lokal…"); };
    const onOffline = () => { setOnline(false); setStatus("Offline · perubahan disimpan di perangkat ini"); };
    setOnline(navigator.onLine);
    window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    const onRemote = (event: Event) => {
      const detail = (event as CustomEvent<{table:string;row:Record<string,unknown>}>).detail;
      const row = detail?.row;
      if (detail?.table !== "assessment_ratings" || row?.participant_id !== props.participantId || row?.indicator_id !== props.indicatorId || row?.observer_id !== props.observerId) return;
      const next: Value = { score: typeof row.score === "number" ? row.score : null, response_status: row.response_status as ResponseStatus, evidence: String(row.evidence ?? ""), revision: Number(row.revision ?? 0), updated_at: typeof row.updated_at === "string" ? row.updated_at : null };
      if (next.revision <= saved.revision) return;
      if (JSON.stringify(value) !== JSON.stringify(saved)) { setConflict(next); setStatus("Konflik: penilaian Anda berubah di perangkat lain."); }
      else { setValue(next); setSaved(next); setStatus("Pembaruan diterima dari perangkat Anda yang lain"); }
    };
    window.addEventListener("assessment-realtime-change", onRemote);
    return () => window.removeEventListener("assessment-realtime-change", onRemote);
  }, [props.participantId, props.indicatorId, props.observerId, saved, value]);

  useEffect(() => {
    if (JSON.stringify(value) === JSON.stringify(saved) || conflict || pending) return;
    localStorage.setItem(storageKey, JSON.stringify({ value, savedRevision: saved.revision }));
    if (!online) { setStatus("Offline · perubahan disimpan di perangkat ini"); return; }
    const timer = window.setTimeout(() => {
      setStatus("Menyimpan…");
      startTransition(async () => {
        const result = await saveAssessmentRating({ participantId: props.participantId, rubricVersionId: props.rubricVersionId, indicatorId: props.indicatorId, score: value.score, responseStatus: value.response_status, evidence: value.evidence, expectedRevision: saved.revision });
        if (!result.ok) {
          if ("conflict" in result && result.conflict) { setConflict(result.latest as Value); setStatus(result.message); }
          else setStatus(result.message);
          return;
        }
        const next = result.record as Value; setSaved(next); setValue(next); localStorage.removeItem(storageKey); setStatus(`Tersimpan · ${new Date(next.updated_at ?? Date.now()).toLocaleTimeString("id-ID")}`); router.refresh();
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [value, saved, conflict, pending, online, storageKey, props.participantId, props.rubricVersionId, props.indicatorId, router]);

  const chooseScore = (raw: string) => setValue((current) => raw === "no" ? { ...current, score: null, response_status: "not_observed" } : raw === "" ? { ...current, score: null, response_status: "unrated" } : { ...current, score: Number(raw), response_status: "scored" });
  const acceptLatest = () => { if (!conflict) return; setValue(conflict); setSaved(conflict); setConflict(null); setStatus("Memakai data terbaru"); };
  const applyMine = () => { if (!conflict) return; setSaved(conflict); setConflict(null); setStatus("Menerapkan ulang draf setelah konflik"); };

  return <div className="observation-cell assessment-rating-cell">
    <label>{props.readOnly ? "Nilai Anda" : "Penilaian Anda"}<select value={value.response_status === "not_observed" ? "no" : value.score?.toString() ?? ""} onChange={(event) => chooseScore(event.target.value)} disabled={props.readOnly || props.locked || pending || !!conflict}><option value="">Belum dinilai</option><option value="no">N/O · Tidak teramati</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} · {(["","Sangat Kurang","Kurang","Cukup","Baik","Sangat Baik"] as string[])[n]}</option>)}</select></label>
    {value.score && <p className="rubric-selected-description"><strong>Anchor skor {value.score}:</strong> {props.descriptors[String(value.score)]}</p>}
    <details className="rubric-score-guide"><summary>Lihat anchor perilaku 1–5</summary>{[1,2,3,4,5].map((n)=><p key={n}><strong>{n} · {(["","Sangat Kurang","Kurang","Cukup","Baik","Sangat Baik"] as string[])[n]}:</strong> {props.descriptors[String(n)]}</p>)}</details>
    {props.guidance && <p className="rubric-selected-description"><strong>Panduan observasi:</strong> {props.guidance}</p>}
    <label>Bukti observasi<textarea value={value.evidence} maxLength={3000} rows={3} onChange={(event)=>setValue((current)=>({...current,evidence:event.target.value}))} disabled={props.readOnly || props.locked || pending || !!conflict} placeholder="Tuliskan perilaku atau bukti konkret yang Anda amati."/></label>
    <small aria-live="polite">{status}</small>
    {(props.readOnly || props.peerRatings.length > 1) && <details className="rubric-score-guide"><summary>{props.readOnly ? `Penilaian observer (${props.peerRatings.length})` : `Penilaian observer lain (${props.peerRatings.length - 1})`}</summary>{props.peerRatings.filter((item)=>props.readOnly || item.observer_id!==props.observerId).map((item)=><article key={item.observer_id}><strong>{item.observer_name}</strong><p>{item.response_status === "scored" ? `Skor ${item.score}` : item.response_status === "not_observed" ? "N/O · Tidak teramati" : "Belum dinilai"}</p>{item.evidence && <p>{item.evidence}</p>}</article>)}</details>}
    {conflict && <div className="observation-conflict" role="alert"><strong>Konflik di perangkat Anda</strong><p>Nilai server: {conflict.response_status === "not_observed" ? "N/O" : conflict.score ?? "Belum dinilai"}; versi {conflict.revision}.</p><button type="button" onClick={acceptLatest}>Muat data terbaru</button><button type="button" onClick={applyMine}>Pertahankan draf saya</button></div>}
  </div>;
}
