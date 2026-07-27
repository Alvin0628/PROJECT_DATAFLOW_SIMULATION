CARA AKSES & RUN DAG VIA AIRFLOW UI
====================================

STEP 1: Buka Airflow UI
=======================
URL: http://localhost:8080

Default credentials (biasanya):
  Username: airflow
  Password: airflow

STEP 2: Cari DAG "operational_incremental_loading"
===================================================

Setelah login:
1. Klik menu "DAGs" (di sebelah kiri)
2. Cari: "operational_incremental_loading"
3. DAG akan terlihat dengan status: ACTIVE (tidak paused)

STEP 3: Lihat DAG Detail
========================

Klik pada nama DAG "operational_incremental_loading"

Akan melihat:
- DAG information (schedule, owner, tags)
- Task visualization (4 tasks):
  ├── check_pipeline_completion
  ├── incremental_loader_batch
  ├── validate_batch_processing
  └── report_pipeline_status
  
- Graph view (dependency flow)
- Calendar view (past & future runs)
- Runs list

STEP 4: Trigger DAG Manual (RUN SEKARANG)
==========================================

Opsi 1: Dari Graph View
  1. Di tab "Graph" → ada button "Trigger DAG" (atas kanan)
  2. Klik button tersebut
  3. Optional: Edit parameters (biarkan default)
  4. Klik "Trigger"
  5. DAG akan langsung run

Opsi 2: Dari DAG List
  1. Di halaman DAGs list
  2. Cari "operational_incremental_loading"
  3. Klik ikon "Play" (▶) di sebelah kanan
  4. Klik "Trigger DAG"
  5. DAG akan langsung run

Opsi 3: Dari Code View
  1. Tab "Code" → klik tombol "Trigger"
  2. Pilih waktu & config
  3. Klik "Trigger"

STEP 5: Monitor Execution
=========================

Setelah trigger:
1. DAG akan appear di "Runs" section
2. Status akan berubah:
   - queued → running → success (atau failed)
3. Klik pada run untuk lihat detail
4. Klik pada task untuk lihat logs

LOGS VIEW:
  - Setiap task punya logs
  - Klik task → "Logs" tab
  - Akan melihat:
    * Pipeline progress
    * Batch size loaded
    * Users inserted
    * Metadata updated
    * Final status

STEP 6: Monitor Progress dari Dashboard
=======================================

Setelah run selesai:
1. Klik "DAG Runs" (tab)
2. Lihat run history
3. Klik run terbaru untuk detail
4. Lihat task status (success/failed)
5. Lihat timeline (berapa lama setiap task)

STEP 7: Set Schedule
====================

DAG sudah set dengan schedule "*/5 * * * *" (setiap 5 menit)

Bisa di-edit dari UI:
1. Klik "Edit" (di DAG detail)
2. Atau klik "Pause" untuk stop auto-run
3. Atau klik "Trigger" untuk manual run

AUTO RUN:
  - DAG akan auto-run setiap 5 menit
  - Tidak perlu di-trigger manual
  - Terus berjalan sampai offset >= total_users
  - Lalu auto-stop (pipeline complete)

MANUAL RUN:
  - Trigger button untuk run kapan saja
  - Tidak mengganggu schedule
  - Useful untuk testing/debugging

============================================================================
SUMMARY: DAG DAPAT DIAKSES & DI-RUN DARI AIRFLOW UI
============================================================================

✅ Airflow UI: http://localhost:8080
✅ DAG name: operational_incremental_loading
✅ Status: ACTIVE (auto-run every 5 minutes)
✅ Dapat di-trigger manual dari UI
✅ Logs visible dari UI
✅ Progress dapat di-monitor dari UI
✅ Tidak perlu command line untuk run

KEUNTUNGAN AIRFLOW UI:
- Visual workflow (graph view)
- Easy monitoring
- Historical runs tracking
- Task-level debugging
- Real-time logs
- No CLI needed
- Pretty interface

============================================================================
