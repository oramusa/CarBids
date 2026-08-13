export type Recall = {
  campaignNumber: string;
  component: string;
  summary: string;
  reportDate: string;
};

/**
 * Free, public, no-key NHTSA recall lookup by make/model/year — real
 * government safety-recall data, distinct from (and not a substitute for)
 * accident history, which has no free public data source.
 */
export async function getRecalls(
  make: string,
  model: string,
  year: number
): Promise<Recall[]> {
  try {
    const res = await fetch(
      `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!res.ok) return [];

    const data: {
      results?: {
        NHTSACampaignNumber: string;
        Component: string;
        Summary: string;
        ReportReceivedDate: string;
      }[];
    } = await res.json();

    return (data.results ?? []).map((r) => ({
      campaignNumber: r.NHTSACampaignNumber,
      component: r.Component,
      summary: r.Summary,
      reportDate: r.ReportReceivedDate,
    }));
  } catch {
    return [];
  }
}
