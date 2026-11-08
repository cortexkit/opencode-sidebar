import type {
  AccountView,
  SidebarWindowPart,
} from '@cortexkit/opencode-sidebar'

export const NOW = Date.parse('2026-06-01T12:00:00Z')
export const widths = [16, 36, 37, 42] as const
export const HEIGHT = 64

export const firstPart: SidebarWindowPart = {
  kind: 'window',
  reading: 'known',
  name: '5h',
  short: '5h',
  figure: '60% left',
  remainingPercent: 60,
  resetIn: '4h',
  checkedAt: NOW,
  resetSinceReading: false,
}
export const secondPart: SidebarWindowPart = {
  kind: 'window',
  reading: 'known',
  name: '7d',
  short: '7d',
  figure: '30% left',
  remainingPercent: 30,
  checkedAt: NOW,
  resetSinceReading: false,
}
export const main: AccountView = {
  id: 'main',
  label: 'production-team@example.com',
  status: { text: 'blocked', tone: 'error' },
  blocked: true,
  indicatorTone: 'error',
  hasQuota: true,
  collapsedQuotaText: '5h 60% · 7d 30% left',
  groups: [
    {
      rows: [
        {
          part: firstPart,
          pace: {
            text: 'deficit 25% · out in 1h45m',
            tone: 'warning',
            overlay: { kind: 'deficit', percent: 15 },
          },
        },
        {
          part: secondPart,
          pace: {
            text: 'reserve 10% · lasts',
            tone: 'textMuted',
            overlay: { kind: 'reserve', percent: 80 },
          },
        },
      ],
    },
  ],
}
export interface FrameInput {
  name: string
  accounts: readonly AccountView[]
  version?: string
}
export const cases: FrameInput[] = [
  { name: 'blocked-pace-long-stat', accounts: [main], version: 'v1.8.4' },
  {
    name: 'multiple-low-stale-empty-missing',
    version: 'v1.8.4',
    accounts: [
      {
        ...main,
        id: 'active-low',
        label: 'active-low',
        blocked: false,
        status: { text: 'active', tone: 'success' },
        collapsedQuotaText: '5h <1% · 7d 100% left',
        groups: [
          {
            rows: [
              {
                part: {
                  ...firstPart,
                  figure: '<1% left',
                  remainingPercent: 0.4,
                  resetIn: '2h',
                },
              },
              {
                part: {
                  ...secondPart,
                  figure: '100% left',
                  remainingPercent: 100,
                  resetIn: '6d23h',
                },
              },
            ],
          },
        ],
      },
      {
        ...main,
        id: 'stale',
        label: 'stale-idle-long-account-name',
        quotaAge: 'checked 1h ago',
        collapsedQuotaText: '5h reset',
        collapsed: { muted: true },
        groups: [
          {
            rows: [
              {
                part: {
                  ...firstPart,
                  resetIn: undefined,
                  resetSinceReading: true,
                },
              },
            ],
          },
        ],
      },
      {
        id: 'empty',
        label: 'empty',
        status: { text: 'idle', tone: 'textMuted' },
        blocked: false,
        indicatorTone: 'textMuted',
        hasQuota: false,
        groups: [],
      },
      {
        id: 'missing',
        label: 'missing',
        status: { text: 'idle', tone: 'textMuted' },
        blocked: false,
        indicatorTone: 'textMuted',
        hasQuota: false,
        groups: [],
        emptyQuotaText: { expanded: 'checking…', collapsed: '—' },
      },
    ],
  },
  {
    name: 'credits-hidden-version',
    accounts: [
      {
        ...main,
        collapsedQuotaText: '5h 0% · cr 20% left',
        groups: [
          {
            rows: [
              {
                part: { ...firstPart, figure: '0% left', remainingPercent: 0 },
              },
              {
                part: {
                  kind: 'budget',
                  reading: 'known',
                  name: 'credits',
                  short: 'cr',
                  figure: 'credits 20% left',
                  remainingPercent: 20,
                  resetIn: '1d',
                  resetSinceReading: false,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  { name: 'no-accounts', accounts: [], version: 'v1.8.4' },
]
