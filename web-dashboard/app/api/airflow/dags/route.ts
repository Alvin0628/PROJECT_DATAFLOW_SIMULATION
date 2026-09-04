import { NextResponse } from "next/server";

export async function GET() {
  const AIRFLOW_URL = process.env.AIRFLOW_API_URL;
  const USERNAME = process.env.AIRFLOW_USERNAME;
  const PASSWORD = process.env.AIRFLOW_PASSWORD;

  if (!AIRFLOW_URL || !USERNAME || !PASSWORD) {
    return NextResponse.json(
      { error: "Airflow credentials belum diatur di .env" },
      { status: 500 },
    );
  }

  try {
    // Basic Auth
    const basicAuth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

    // Get DAGs from Airflow
    const res = await fetch(`${AIRFLOW_URL}/dags`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      // real time status
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Airflow API Error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();

    return NextResponse.json({ data: data.dags });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan yang tidak diketahui saat menghubungi Airflow";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
