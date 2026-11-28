"use server";
import { sessionLoginUrl } from "@/lib/session-login";
import { FormFieldError, runAction } from "@/lib/action-error";
import { uuidPattern } from "@/lib/validation";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const mandateBucket = "commissariat-mandates";
const photoBucket = "submission-photos";
const maxMandateSize = 10 * 1024 * 1024;
const maxPhotoSize = 5 * 1024 * 1024;

async function commissariatClient() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect(await sessionLoginUrl());
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, commissariat_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role !== "komisariat" || !profile.commissariat_id)
    throw new Error("Akun Komisariat belum ditautkan oleh Admin Sistem.");
  return { supabase, userId, commissariatId: profile.commissariat_id };
}

async function validatePdf(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 1)
    throw new Error("Pilih Surat Mandat dalam format PDF.");
  if (file.size > maxMandateSize)
    throw new Error("Ukuran Surat Mandat maksimal 10 MB.");
  const signature = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (file.type !== "application/pdf" || signature !== "%PDF-")
    throw new Error("Berkas harus berupa PDF yang valid.");
  return file;
}

async function validatePhoto(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 1) return null;
  if (file.size > maxPhotoSize) throw new Error("Ukuran foto maksimal 5 MB.");
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpeg =
    file.type === "image/jpeg" &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff;
  const png =
    file.type === "image/png" &&
    signature[0] === 0x89 &&
    signature[1] === 0x50 &&
    signature[2] === 0x4e &&
    signature[3] === 0x47 &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a;
  if (!jpeg && !png)
    throw new Error("Isi foto harus benar-benar berupa JPG atau PNG.");
  return {
    file,
    mimeType: jpeg ? "image/jpeg" : "image/png",
    extension: jpeg ? "jpg" : "png",
  };
}

async function getDraftSubmission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  submissionId: string,
  commissariatId: string,
) {
  if (!uuidPattern.test(submissionId))
    throw new Error("ID pengajuan tidak valid.");
  const { data: submission, error } = await supabase
    .from("commissariat_submissions")
    .select("id, event_id, commissariat_id, status, mandate_path")
    .eq("id", submissionId)
    .eq("commissariat_id", commissariatId)
    .maybeSingle();
  if (error || !submission)
    throw new Error("Pengajuan tidak ditemukan atau akses ditolak.");
  if (submission.status !== "draft")
    throw new Error(
      "Pengajuan sudah dikirim dan tidak dapat diedit. Batalkan sebelum Observer mulai meninjau untuk mengajukan ulang.",
    );
  return submission;
}

async function createSubmissionImpl(formData: FormData) {
  const { supabase } = await commissariatClient();
  const eventId = String(formData.get("eventId") ?? "");
  if (!uuidPattern.test(eventId)) throw new Error("Pilih kegiatan yang valid.");
  const { data, error } = await supabase.rpc("create_commissariat_submission", {
    p_event_id: eventId,
  });
  if (error || !data)
    throw new Error(
      error?.code === "23505"
        ? "Komisariat Anda sudah memiliki pengajuan aktif untuk kegiatan ini."
        : error?.message ||
            "Draf pengajuan gagal dibuat. Pastikan migrasi pengajuan Komisariat sudah dijalankan.",
    );
  revalidatePath("/dashboard/pengajuan");
}

async function uploadMandateImpl(formData: FormData) {
  const { supabase, commissariatId } = await commissariatClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  const submission = await getDraftSubmission(
    supabase,
    submissionId,
    commissariatId,
  );
  const file = await validatePdf(formData.get("mandate"));
  const path = `${submission.event_id}/${commissariatId}/${submission.id}/mandate-${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(mandateBucket)
    .upload(path, file, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError)
    throw new Error(
      "Surat Mandat gagal diunggah. Pastikan migrasi pengajuan Komisariat sudah dijalankan.",
    );
  const { error } = await supabase
    .from("commissariat_submissions")
    .update({ mandate_path: path, updated_at: new Date().toISOString() })
    .eq("id", submission.id);
  if (error) {
    await supabase.storage.from(mandateBucket).remove([path]);
    throw new Error("Surat Mandat gagal ditautkan ke pengajuan.");
  }
  if (submission.mandate_path)
    await supabase.storage
      .from(mandateBucket)
      .remove([submission.mandate_path]);
  revalidatePath("/dashboard/pengajuan");
}

function participantFields(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const major = String(formData.get("major") ?? "").trim();
  const entryYear = Number(formData.get("entryYear"));
  const position = String(formData.get("position") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 120)
    throw new FormFieldError(
      "displayName",
      "Nama lengkap wajib diisi antara 2 dan 120 karakter.",
    );
  if (major.length < 2 || major.length > 120)
    throw new FormFieldError(
      "major",
      "Jurusan atau program studi wajib diisi antara 2 dan 120 karakter.",
    );
  if (!Number.isInteger(entryYear) || entryYear < 1900 || entryYear > 2100)
    throw new FormFieldError(
      "entryYear",
      "Tahun angkatan harus berupa tahun antara 1900 dan 2100.",
    );
  if (position.length > 120)
    throw new FormFieldError(
      "position",
      "Jabatan peserta maksimal 120 karakter.",
    );
  return {
    display_name: displayName,
    major,
    entry_year: entryYear,
    position: position || null,
  };
}

async function addApplicantImpl(formData: FormData) {
  const { supabase, userId, commissariatId } = await commissariatClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  const submission = await getDraftSubmission(
    supabase,
    submissionId,
    commissariatId,
  );
  const fields = participantFields(formData);
  const image = await validatePhoto(formData.get("photo"));
  const participantId = crypto.randomUUID();
  const path = image
    ? `${submission.event_id}/${commissariatId}/${submission.id}/${participantId}/${crypto.randomUUID()}.${image.extension}`
    : null;
  if (image && path) {
    const { error: uploadError } = await supabase.storage
      .from(photoBucket)
      .upload(path, image.file, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError)
      throw new Error(
        "Foto peserta gagal diunggah. Pastikan migrasi pengajuan Komisariat sudah dijalankan.",
      );
  }
  const { error } = await supabase
    .from("commissariat_submission_participants")
    .insert({
      id: participantId,
      submission_id: submission.id,
      ...fields,
      photo_path: path,
      created_by: userId,
    });
  if (error) {
    if (path) await supabase.storage.from(photoBucket).remove([path]);
    throw new Error("Profil peserta gagal disimpan.");
  }
  revalidatePath("/dashboard/pengajuan");
}

async function editApplicantImpl(formData: FormData) {
  const { supabase, commissariatId } = await commissariatClient();
  const participantId = String(formData.get("participantId") ?? "");
  if (!uuidPattern.test(participantId))
    throw new Error("ID peserta tidak valid.");
  const { data: current, error: currentError } = await supabase
    .from("commissariat_submission_participants")
    .select("id, submission_id, photo_path")
    .eq("id", participantId)
    .maybeSingle();
  if (currentError || !current)
    throw new Error("Peserta tidak ditemukan atau akses ditolak.");
  await getDraftSubmission(supabase, current.submission_id, commissariatId);
  const fields = participantFields(formData);
  const file = formData.get("photo");
  const newPhoto = file instanceof File && file.size > 0;
  const image = newPhoto ? await validatePhoto(file) : null;
  let photoPath = current.photo_path;
  if (image) {
    const { data: parent } = await supabase
      .from("commissariat_submissions")
      .select("event_id")
      .eq("id", current.submission_id)
      .maybeSingle();
    if (!parent) throw new Error("Kegiatan pengajuan tidak ditemukan.");
    photoPath = `${parent.event_id}/${commissariatId}/${current.submission_id}/${participantId}/${crypto.randomUUID()}.${image.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(photoBucket)
      .upload(photoPath, image.file, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw new Error("Foto baru gagal diunggah.");
  }
  const { error } = await supabase
    .from("commissariat_submission_participants")
    .update({
      ...fields,
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", participantId);
  if (error) {
    if (image) await supabase.storage.from(photoBucket).remove([photoPath]);
    throw new Error("Perubahan profil peserta gagal disimpan.");
  }
  if (image && current.photo_path)
    await supabase.storage.from(photoBucket).remove([current.photo_path]);
  revalidatePath("/dashboard/pengajuan");
}

async function removeApplicantImpl(formData: FormData) {
  const { supabase, commissariatId } = await commissariatClient();
  const participantId = String(formData.get("participantId") ?? "");
  if (!uuidPattern.test(participantId))
    throw new Error("ID peserta tidak valid.");
  const { data: current } = await supabase
    .from("commissariat_submission_participants")
    .select("id, submission_id, photo_path")
    .eq("id", participantId)
    .maybeSingle();
  if (!current) throw new Error("Peserta tidak ditemukan atau akses ditolak.");
  await getDraftSubmission(supabase, current.submission_id, commissariatId);
  const { error } = await supabase
    .from("commissariat_submission_participants")
    .delete()
    .eq("id", participantId);
  if (error) throw new Error("Peserta gagal dihapus dari draf.");
  if (current.photo_path)
    await supabase.storage.from(photoBucket).remove([current.photo_path]);
  revalidatePath("/dashboard/pengajuan");
}

async function submitSubmissionImpl(formData: FormData) {
  const { supabase, commissariatId } = await commissariatClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  await getDraftSubmission(supabase, submissionId, commissariatId);
  const { error } = await supabase.rpc("submit_commissariat_submission", {
    p_submission_id: submissionId,
  });
  if (error) throw new Error("Pengajuan gagal dikirim.");
  revalidatePath("/dashboard/pengajuan");
  revalidatePath("/dashboard/pengajuan");
}

async function cancelSubmissionImpl(formData: FormData) {
  const { supabase, commissariatId } = await commissariatClient();
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!uuidPattern.test(submissionId))
    throw new Error("ID pengajuan tidak valid.");
  const { data: submission } = await supabase
    .from("commissariat_submissions")
    .select("id, commissariat_id")
    .eq("id", submissionId)
    .eq("commissariat_id", commissariatId)
    .maybeSingle();
  if (!submission)
    throw new Error("Pengajuan tidak ditemukan atau akses ditolak.");
  const { error } = await supabase.rpc("cancel_commissariat_submission", {
    p_submission_id: submissionId,
  });
  if (error) throw new Error("Pengajuan gagal dibatalkan.");
  revalidatePath("/dashboard/pengajuan");
  revalidatePath("/dashboard/pengajuan");
}

export async function createSubmission(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => createSubmissionImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function uploadMandate(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => uploadMandateImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function addApplicant(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => addApplicantImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function editApplicant(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => editApplicantImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function removeApplicant(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => removeApplicantImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function submitSubmission(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => submitSubmissionImpl(data),
    ["submissionId", "eventId"],
  );
}

export async function cancelSubmission(formData: FormData) {
  return runAction(
    "/dashboard/pengajuan",
    formData,
    (data) => cancelSubmissionImpl(data),
    ["submissionId", "eventId"],
  );
}
