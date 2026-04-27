interface PdfCoResponse {
  url: string;
  error: boolean;
  status: number;
  name?: string;
  message?: string;
}

// Calls PDF.co synchronously (async:false) and returns the final PDF URL directly.
// Throws on any error so callers can handle failure uniformly.
export async function submitPdfJob(url: string): Promise<string> {
  const response = await fetch(process.env.KHAN_PDF_API_URL_TO_PDF_URL!, {
    method: "POST",
    headers: {
      "x-api-key": process.env.KHAN_PDF_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      name: "khanpdf.pdf",
      async: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`PDF.co returned ${response.status}: ${response.statusText}`);
  }

  const data: PdfCoResponse = await response.json();

  if (data.error) {
    throw new Error(`PDF.co error: ${data.message ?? "unknown"}`);
  }

  if (!data.url) {
    throw new Error("PDF.co returned no URL in response");
  }

  return data.url;
}
