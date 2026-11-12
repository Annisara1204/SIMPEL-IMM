"use server";

import { staffClient } from "./internal";

export async function saveObservation(input: {
  participantId: string;
  indicatorId: string;
  score: number | null;
  expectedRevision: number;
}) {
  const { supabase, userId, role } = await staffClient([
    "admin_system",
    "observer",
    "instruktur",
  ]);
  if (
    !/^[0-9a-f-]{36}$/i.test(input.participantId) ||
    !/^[0-9a-f-]{36}$/i.test(input.indicatorId) ||
    (input.score !== null &&
      (!Number.isInteger(input.score) || input.score < 1 || input.score > 5)) ||
    !Number.isInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  )
    return { ok: false as const, message: "Isian tidak valid." };
  const { data: participant } = await supabase
    .from("participants")
    .select("event_id")
    .eq("id", input.participantId)
    .maybeSingle();
  const { data: indicator } = await supabase
    .from("rubric_indicators")
    .select("aspect_id")
    .eq("id", input.indicatorId)
    .maybeSingle();
  const { data: aspect } = indicator
    ? await supabase
        .from("rubric_aspects")
        .select("rubric_version_id")
        .eq("id", indicator.aspect_id)
        .maybeSingle()
    : { data: null };
  const { data: version } = aspect
    ? await supabase
        .from("rubric_versions")
        .select("id, event_id, status")
        .eq("id", aspect.rubric_version_id)
        .maybeSingle()
    : { data: null };
  if (
    !participant ||
    !version ||
    version.event_id !== participant.event_id ||
    version.status !== "active"
  )
    return {
      ok: false as const,
      message:
        "Peserta dan indikator tidak berada pada rubrik aktif yang sama.",
    };
  if (role === "observer") {
    const { data: assignment } = await supabase
      .from("observer_assignments")
      .select("id")
      .eq("event_id", participant.event_id)
      .eq("observer_id", userId)
      .maybeSingle();
    if (!assignment)
      return {
        ok: false as const,
        message: "Anda tidak ditugaskan pada kegiatan ini.",
      };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase
      .from("instructor_event_assignments")
      .select("id")
      .eq("event_id", participant.event_id)
      .eq("instructor_id", userId)
      .limit(1)
      .maybeSingle();
    if (!assignment)
      return {
        ok: false as const,
        message: "Anda tidak ditugaskan pada kegiatan ini.",
      };
  }
  const readLatest = async () => {
    const { data } = await supabase
      .from("observations")
      .select("id, score, revision, updated_at, updated_by_name, updated_by")
      .eq("participant_id", input.participantId)
      .eq("indicator_id", input.indicatorId)
      .maybeSingle();
    return (
      data ?? {
        id: null,
        score: null,
        revision: 0,
        updated_at: null,
        updated_by_name: null,
        updated_by: null,
      }
    );
  };
  const { data: current, error: readError } = await supabase
    .from("observations")
    .select("id, score, revision, updated_at, updated_by_name, updated_by")
    .eq("participant_id", input.participantId)
    .eq("indicator_id", input.indicatorId)
    .maybeSingle();
  if (readError)
    return { ok: false as const, message: "Data belum dapat disimpan." };
  const latest = current ?? {
    id: null,
    score: null,
    revision: 0,
    updated_at: null,
    updated_by_name: null,
    updated_by: null,
  };
  if (latest.revision !== input.expectedRevision)
    return {
      ok: false as const,
      conflict: true as const,
      latest,
      message:
        "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda.",
    };
  const values = { score: input.score, updated_by: userId };
  if (!current) {
    const { error } = await supabase.from("observations").insert({
      ...values,
      participant_id: input.participantId,
      indicator_id: input.indicatorId,
    });
    if (error)
      return error.code === "23505"
        ? {
            ok: false as const,
            conflict: true as const,
            latest: await readLatest(),
            message:
              "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda.",
          }
        : { ok: false as const, message: "Data belum dapat disimpan." };
    return { ok: true as const, revision: 1 };
  }
  const { data: updated, error } = await supabase
    .from("observations")
    .update(values)
    .eq("id", current.id)
    .eq("revision", input.expectedRevision)
    .select("revision")
    .maybeSingle();
  if (error || !updated)
    return {
      ok: false as const,
      conflict: true as const,
      latest: await readLatest(),
      message:
        "Nilai berubah di perangkat lain. Pilih nilai terbaru atau terapkan ulang pilihan Anda.",
    };
  return { ok: true as const, revision: updated.revision as number };
}

export async function saveAssessmentRating(input: {
  participantId: string;
  rubricVersionId: string;
  indicatorId: string;
  score: number | null;
  responseStatus: "scored" | "not_observed" | "unrated";
  evidence: string;
  expectedRevision: number;
}) {
  const { supabase, userId, role } = await staffClient([
    "admin_system",
    "observer",
    "instruktur",
  ]);
  if (
    !/^[0-9a-f-]{36}$/i.test(input.participantId) ||
    !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId) ||
    !/^[0-9a-f-]{36}$/i.test(input.indicatorId) ||
    input.evidence.length > 3000 ||
    !Number.isInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    !["scored", "not_observed", "unrated"].includes(input.responseStatus) ||
    (input.responseStatus === "scored"
      ? !Number.isInteger(input.score) ||
        (input.score ?? 0) < 1 ||
        (input.score ?? 0) > 5
      : input.score !== null)
  )
    return { ok: false as const, message: "Isian penilaian tidak valid." };
  if (role === "admin_system")
    return {
      ok: false as const,
      message:
        "Admin Sistem hanya memfinalisasi, bukan mengisi penilaian observer.",
    };
  const { data: participant } = await supabase
    .from("participants")
    .select("event_id")
    .eq("id", input.participantId)
    .maybeSingle();
  const { data: version } = await supabase
    .from("rubric_versions")
    .select("id,event_id,status")
    .eq("id", input.rubricVersionId)
    .maybeSingle();
  if (
    !participant ||
    !version ||
    participant.event_id !== version.event_id ||
    version.status !== "active"
  )
    return {
      ok: false as const,
      message: "Sesi atau rubrik aktif tidak cocok.",
    };
  const assignment =
    role === "observer"
      ? await supabase
          .from("observer_assignments")
          .select("id")
          .eq("event_id", participant.event_id)
          .eq("observer_id", userId)
          .maybeSingle()
      : await supabase
          .from("instructor_event_assignments")
          .select("id")
          .eq("event_id", participant.event_id)
          .eq("instructor_id", userId)
          .limit(1)
          .maybeSingle();
  if (!assignment.data)
    return {
      ok: false as const,
      message: "Anda tidak ditugaskan pada kegiatan ini.",
    };
  let { data: submission, error: submissionError } = await supabase
    .from("assessment_submissions")
    .select("id,status")
    .eq("rubric_version_id", version.id)
    .eq("participant_id", input.participantId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (!submission && !submissionError) {
    const created = await supabase
      .from("assessment_submissions")
      .insert({
        rubric_version_id: version.id,
        participant_id: input.participantId,
        observer_id: userId,
      })
      .select("id,status")
      .single();
    submission = created.data;
    submissionError = created.error;
  }
  if (submissionError || !submission || submission.status !== "draft")
    return {
      ok: false as const,
      message:
        "Asesmen sudah dikirim atau tidak dapat diedit. Buka kembali untuk revisi.",
    };
  const query = () =>
    supabase
      .from("assessment_ratings")
      .select("id,score,response_status,evidence,revision,updated_at")
      .eq("rubric_version_id", version.id)
      .eq("participant_id", input.participantId)
      .eq("indicator_id", input.indicatorId)
      .eq("observer_id", userId)
      .maybeSingle();
  const { data: current, error } = await query();
  if (error)
    return { ok: false as const, message: "Nilai belum dapat dibaca." };
  const latest = current ?? {
    id: null,
    score: null,
    response_status: "unrated",
    evidence: "",
    revision: 0,
    updated_at: null,
  };
  if (latest.revision !== input.expectedRevision)
    return {
      ok: false as const,
      conflict: true as const,
      latest,
      message:
        "Data berubah di perangkat lain. Pilih data terbaru atau terapkan ulang setelah memeriksanya.",
    };
  const fields = {
    score: input.score,
    response_status: input.responseStatus,
    evidence: input.evidence.trim(),
  };
  if (!current) {
    if (input.expectedRevision !== 0)
      return {
        ok: false as const,
        conflict: true as const,
        latest,
        message: "Versi penilaian tidak cocok.",
      };
    const { data: inserted, error: insertError } = await supabase
      .from("assessment_ratings")
      .insert({
        ...fields,
        submission_id: submission.id,
        rubric_version_id: version.id,
        participant_id: input.participantId,
        observer_id: userId,
        indicator_id: input.indicatorId,
      })
      .select("id,score,response_status,evidence,revision,updated_at")
      .single();
    if (insertError || !inserted) {
      const { data: raced } = await query();
      return raced
        ? {
            ok: false as const,
            conflict: true as const,
            latest: raced,
            message: "Isian baru saja berubah. Periksa versi terbaru.",
          }
        : { ok: false as const, message: "Nilai gagal disimpan." };
    }
    return { ok: true as const, record: inserted };
  }
  const { data: updated, error: updateError } = await supabase
    .from("assessment_ratings")
    .update(fields)
    .eq("id", current.id)
    .eq("revision", input.expectedRevision)
    .select("id,score,response_status,evidence,revision,updated_at")
    .maybeSingle();
  if (updateError || !updated) {
    const { data: raced } = await query();
    return {
      ok: false as const,
      conflict: true as const,
      latest: raced ?? latest,
      message: "Isian berubah saat disimpan. Periksa versi terbaru.",
    };
  }
  return { ok: true as const, record: updated };
}

export async function setAssessmentSubmissionStatus(input: {
  participantId: string;
  rubricVersionId: string;
  status: "submitted" | "draft" | "finalized";
}) {
  const { supabase, userId, role } = await staffClient([
    "admin_system",
    "observer",
    "instruktur",
  ]);
  if (
    !/^[0-9a-f-]{36}$/i.test(input.participantId) ||
    !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId)
  )
    return { ok: false as const, message: "Sesi tidak valid." };
  const { data: participant } = await supabase
    .from("participants")
    .select("event_id")
    .eq("id", input.participantId)
    .maybeSingle();
  const { data: version } = await supabase
    .from("rubric_versions")
    .select("id,event_id,status")
    .eq("id", input.rubricVersionId)
    .maybeSingle();
  if (!participant || !version || participant.event_id !== version.event_id)
    return {
      ok: false as const,
      message: "Peserta tidak cocok dengan versi rubrik.",
    };
  if (input.status === "finalized") {
    if (role !== "admin_system")
      return {
        ok: false as const,
        message: "Hanya Admin Sistem yang dapat memfinalisasi.",
      };
    const { data: submissions } = await supabase
      .from("assessment_submissions")
      .select("id,status,observer_id")
      .eq("participant_id", input.participantId)
      .eq("rubric_version_id", input.rubricVersionId);
    const { data: assigned } = await supabase
      .from("observer_assignments")
      .select("observer_id")
      .eq("event_id", participant.event_id);
    if (
      !assigned?.length ||
      assigned.some(
        (item) =>
          !submissions?.some(
            (entry) =>
              entry.observer_id === item.observer_id &&
              entry.status === "submitted",
          ),
      )
    )
      return {
        ok: false as const,
        message:
          "Semua Observer yang ditugaskan harus mengirim penilaian peserta ini sebelum finalisasi.",
      };
    const { error } = await supabase
      .from("assessment_submissions")
      .update({ status: "finalized", finalized_by: userId })
      .eq("participant_id", input.participantId)
      .eq("rubric_version_id", input.rubricVersionId)
      .eq("status", "submitted");
    return error
      ? { ok: false as const, message: "Finalisasi gagal." }
      : { ok: true as const };
  }
  if (role === "admin_system")
    return {
      ok: false as const,
      message: "Admin Sistem tidak mengubah status pengiriman observer.",
    };
  const assignment =
    role === "observer"
      ? await supabase
          .from("observer_assignments")
          .select("id")
          .eq("event_id", participant.event_id)
          .eq("observer_id", userId)
          .maybeSingle()
      : await supabase
          .from("instructor_event_assignments")
          .select("id")
          .eq("event_id", participant.event_id)
          .eq("instructor_id", userId)
          .limit(1)
          .maybeSingle();
  if (!assignment.data)
    return {
      ok: false as const,
      message: "Anda tidak ditugaskan pada kegiatan ini.",
    };
  const { data: submission } = await supabase
    .from("assessment_submissions")
    .select("id,status")
    .eq("rubric_version_id", version.id)
    .eq("participant_id", input.participantId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (!submission) {
    if (input.status !== "submitted")
      return { ok: false as const, message: "Asesmen belum dimulai." };
    const created = await supabase
      .from("assessment_submissions")
      .insert({
        rubric_version_id: version.id,
        participant_id: input.participantId,
        observer_id: userId,
      })
      .select("id,status")
      .single();
    if (created.error || !created.data)
      return { ok: false as const, message: "Pengiriman gagal." };
    const { error: submitError } = await supabase
      .from("assessment_submissions")
      .update({ status: "submitted" })
      .eq("id", created.data.id)
      .eq("status", "draft");
    return submitError
      ? { ok: false as const, message: "Pengiriman gagal." }
      : { ok: true as const };
  }
  if (submission.status === "finalized")
    return { ok: false as const, message: "Asesmen sudah difinalisasi." };
  const { error } = await supabase
    .from("assessment_submissions")
    .update({ status: input.status })
    .eq("id", submission.id)
    .eq("status", input.status === "draft" ? "submitted" : "draft");
  return error
    ? { ok: false as const, message: "Status asesmen gagal diperbarui." }
    : { ok: true as const };
}

export async function saveObserverNote(input: {
  participantId: string;
  rubricVersionId: string;
  noteType: "observation" | "strength" | "development" | "special";
  content: string;
  expectedRevision: number;
}) {
  const { supabase, userId, role } = await staffClient([
    "admin_system",
    "observer",
    "instruktur",
  ]);
  if (
    !/^[0-9a-f-]{36}$/i.test(input.participantId) ||
    !/^[0-9a-f-]{36}$/i.test(input.rubricVersionId) ||
    !["observation", "strength", "development", "special"].includes(
      input.noteType,
    ) ||
    input.content.length > 3000 ||
    !Number.isInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  )
    return { ok: false as const, message: "Isian catatan tidak valid." };
  const { data: participant } = await supabase
    .from("participants")
    .select("event_id")
    .eq("id", input.participantId)
    .maybeSingle();
  const { data: version } = await supabase
    .from("rubric_versions")
    .select("id, event_id, status")
    .eq("id", input.rubricVersionId)
    .maybeSingle();
  if (
    !participant ||
    !version ||
    version.event_id !== participant.event_id ||
    version.status !== "active"
  )
    return {
      ok: false as const,
      message:
        "Catatan hanya dapat ditulis pada rubrik aktif untuk kegiatan peserta ini.",
    };
  if (role === "observer") {
    const { data: assignment } = await supabase
      .from("observer_assignments")
      .select("id")
      .eq("event_id", participant.event_id)
      .eq("observer_id", userId)
      .maybeSingle();
    if (!assignment)
      return {
        ok: false as const,
        message: "Anda tidak ditugaskan pada kegiatan ini.",
      };
  }
  if (role === "instruktur") {
    const { data: assignment } = await supabase
      .from("instructor_event_assignments")
      .select("id")
      .eq("event_id", participant.event_id)
      .eq("instructor_id", userId)
      .limit(1)
      .maybeSingle();
    if (!assignment)
      return {
        ok: false as const,
        message: "Anda tidak ditugaskan pada kegiatan ini.",
      };
  }
  const { data: submission } = await supabase
    .from("assessment_submissions")
    .select("id,status")
    .eq("participant_id", input.participantId)
    .eq("rubric_version_id", input.rubricVersionId)
    .eq("observer_id", userId)
    .maybeSingle();
  if (!submission) {
    const { error: submissionError } = await supabase
      .from("assessment_submissions")
      .insert({
        participant_id: input.participantId,
        rubric_version_id: input.rubricVersionId,
        observer_id: userId,
      });
    if (submissionError)
      return {
        ok: false as const,
        message:
          "Ruang penilaian belum dapat dibuka. Pastikan migrasi Fase 5 sudah dijalankan.",
      };
  } else if (submission.status !== "draft")
    return {
      ok: false as const,
      message: "Asesmen sudah dikirim. Buka kembali sebelum mengedit catatan.",
    };
  const queryLatest = () =>
    supabase
      .from("observer_notes")
      .select(
        "id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at",
      )
      .eq("participant_id", input.participantId)
      .eq("rubric_version_id", input.rubricVersionId)
      .eq("author_id", userId)
      .eq("note_type", input.noteType)
      .is("indicator_id", null)
      .maybeSingle();
  const { data: current, error: readError } = await queryLatest();
  if (readError)
    return { ok: false as const, message: "Catatan belum dapat dibaca." };
  const latest = current ?? {
    id: null,
    participant_id: input.participantId,
    rubric_version_id: input.rubricVersionId,
    author_id: userId,
    author_name: "Anda",
    note_type: input.noteType,
    content: "",
    revision: 0,
    updated_at: null,
  };
  if (latest.revision !== input.expectedRevision)
    return {
      ok: false as const,
      conflict: true as const,
      latest,
      message:
        "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda.",
    };
  const content = input.content.trim();
  if (!current && !content) return { ok: true as const, record: latest };
  if (!current) {
    const { data: inserted, error } = await supabase
      .from("observer_notes")
      .insert({
        participant_id: input.participantId,
        rubric_version_id: input.rubricVersionId,
        author_id: userId,
        note_type: input.noteType,
        content,
      })
      .select(
        "id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at",
      )
      .single();
    if (error || !inserted) {
      const { data: raced } = await queryLatest();
      return raced
        ? {
            ok: false as const,
            conflict: true as const,
            latest: raced,
            message:
              "Catatan Anda baru saja berubah. Pilih versi terbaru atau terapkan ulang tulisan Anda.",
          }
        : { ok: false as const, message: "Catatan gagal disimpan." };
    }
    return { ok: true as const, record: inserted };
  }
  const { data: updated, error } = await supabase
    .from("observer_notes")
    .update({ content })
    .eq("id", current.id)
    .eq("revision", input.expectedRevision)
    .select(
      "id, participant_id, rubric_version_id, author_id, author_name, note_type, content, revision, updated_at",
    )
    .maybeSingle();
  if (error || !updated) {
    const { data: raced } = await queryLatest();
    return {
      ok: false as const,
      conflict: true as const,
      latest: raced ?? latest,
      message:
        "Catatan Anda berubah di perangkat lain. Pilih versi terbaru atau terapkan ulang tulisan Anda.",
    };
  }
  return { ok: true as const, record: updated };
}
