export default function DashboardLoading() {
  return (
    <div className="setup-message" aria-busy="true" aria-live="polite">
      <h1>Memuat…</h1>
      <p>Mohon tunggu sebentar, data sedang diambil.</p>
    </div>
  );
}
