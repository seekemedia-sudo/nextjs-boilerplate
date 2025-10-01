import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  condition: 'new' | 'used' | 'certified';
  finalUrl: string;
  city?: string | null;
};

function clampHeadline(s: string) {
  return s.length <= 30 ? s : s.slice(0, 30);
}

function clampDesc(s: string) {
  return s.length <= 90 ? s : s.slice(0, 90);
}

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const head = headers.map(csvEscape).join(',');
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  return [head, body].filter(Boolean).join('\n');
}

function buildForVehicles(campaignName: string, vehicles: Vehicle[]) {
  // Campaigns
  const campaignsHeaders = [
    'Campaign',
    'Campaign Type',
    'Status',
    'Daily Budget',
    'Bidding Strategy',
    'Networks',
    'Locations',
    'Languages',
    'Start Date',
    'End Date',
  ];
  const campaignsRows = [
    [
      campaignName,
      'Search',
      'Enabled',
      '0.01',
      'Manual CPC',
      'Google Search;Search Partners',
      'United States',
      'English',
      '',
      '',
    ],
  ];

  // Ad groups
  const adGroupsHeaders = ['Campaign', 'Ad Group', 'Status', 'Default Max. CPC'];
  const adGroupsRows: Array<Array<string | number>> = [];

  // Keywords
  const kwHeaders = ['Campaign', 'Ad Group', 'Criterion Type', 'Keyword', 'Final URL', 'Max CPC'];
  const kwRows: Array<Array<string | number>> = [];

  // RSAs
  const adsHeaders = [
    'Campaign',
    'Ad Group',
    'Final URL',
    'Path 1',
    'Path 2',
    'Headline 1',
    'Headline 2',
    'Headline 3',
    'Description 1',
    'Description 2',
  ];
  const adsRows: Array<Array<string | number>> = [];

  for (const v of vehicles) {
    const adGroupName = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''} | ${v.id}`;
    adGroupsRows.push([campaignName, adGroupName, 'Enabled', '0.01']);

    const core = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`.toLowerCase();
    kwRows.push([campaignName, adGroupName, 'Exact', `[${core}]`, v.finalUrl, '0.01']);
    kwRows.push([
      campaignName,
      adGroupName,
      'Phrase',
      `"${v.make.toLowerCase()} ${v.model.toLowerCase()}"`,
      v.finalUrl,
      '0.01',
    ]);

    const h1 = clampHeadline(`${v.year} ${v.make} ${v.model}`);
    const h2 = clampHeadline(`${v.condition === 'used' ? 'Used ' : ''}${v.model} in Stock`);
    const h3 = clampHeadline('Test Drive Today');
    const d1 = clampDesc(
      `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''}. In stock. Transparent pricing.`
    );
    const d2 = clampDesc('Get pre-approved online. Visit our site for photos & price.');

    const path1 = v.model.toLowerCase().replace(/\s+/g, '-');
    const path2 = v.trim ? v.trim.toLowerCase().replace(/\s+/g, '-') : 'details';

    adsRows.push([campaignName, adGroupName, v.finalUrl, path1, path2, h1, h2, h3, d1, d2]);
  }

  return {
    campaignsCsv: toCsv(campaignsHeaders, campaignsRows),
    adGroupsCsv: toCsv(adGroupsHeaders, adGroupsRows),
    keywordsCsv: toCsv(kwHeaders, kwRows),
    adsCsv: toCsv(adsHeaders, adsRows),
  };
}

// Demo inventory for quick validation (Used only)
function demoVehiclesFor(url: string): Vehicle[] {
  if (url.includes('autonationtoyotafortmyers.com')) {
    return [
      {
        id: 'VIN123456',
        year: 2021,
        make: 'Toyota',
        model: 'Camry',
        trim: 'SE',
        condition: 'used',
        finalUrl:
          'https://www.autonationtoyotafortmyers.com/used/Toyota/2021-Toyota-Camry-VIN123456.htm',
        city: 'Fort Myers',
      },
      {
        id: 'VIN987654',
        year: 2020,
        make: 'Toyota',
        model: 'RAV4',
        trim: 'XLE',
        condition: 'used',
        finalUrl:
          'https://www.autonationtoyotafortmyers.com/used/Toyota/2020-Toyota-RAV4-VIN987654.htm',
        city: 'Fort Myers',
      },
    ];
  }
  return [
    {
      id: 'VIN000001',
      year: 2019,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      condition: 'used',
      finalUrl: url || 'https://example.com',
      city: null,
    },
  ];
}

export async function POST(request: Request) {
  const { dealershipUrl } = await request.json();
  const url: string = typeof dealershipUrl === 'string' && dealershipUrl ? dealershipUrl : '';

  const vehicles = demoVehiclesFor(url);
  const campaignName = 'Dealer Search – Staging';

  const { campaignsCsv, adGroupsCsv, keywordsCsv, adsCsv } = buildForVehicles(
    campaignName,
    vehicles
  );

  const zip = new JSZip();
  zip.file('Campaigns.csv', campaignsCsv);
  zip.file('AdGroups.csv', adGroupsCsv);
  zip.file('Keywords.csv', keywordsCsv);
  zip.file('Ads_RSA.csv', adsCsv);

  const content = await zip.generateAsync({ type: 'nodebuffer' });

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="google-ads-search.zip"',
    },
  });
}
