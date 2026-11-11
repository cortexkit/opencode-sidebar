import {
  SidebarFrame,
  SidebarGaugeRow,
  SidebarSection,
  SidebarStatRow,
  SidebarTextRow,
} from '@cortexkit/opencode-sidebar'
import { Show } from 'solid-js'
import { type FrameInput, NOW } from './cases.js'
import { appearance, theme } from './render-support.js'

export function ParityFrame(props: { input: FrameInput; collapsed: boolean }) {
  return (
    <SidebarFrame
      header={{ badge: 'TEST', version: props.input.version }}
      accounts={props.input.accounts}
      theme={theme}
      appearance={appearance}
      showQuota={true}
      now={NOW}
      collapsed={props.collapsed}
      collapsible={props.input.collapsible}
      onToggle={() => {}}
      beforeQuota={() => (
        <SidebarTextRow text='auth needs attention' tone='warning' />
      )}
      afterQuota={() => (
        <SidebarStatRow label='prepaid' value='1,235 credits' />
      )}
      sections={() => (
        <>
          <Show when={props.input.gauges}>
            <SidebarGaugeRow label='ctx' used={55} value='483K/872K' />
            <SidebarGaugeRow label='zero' used={0} />
            <SidebarGaugeRow label='full' used={100} />
            <SidebarGaugeRow label='unknown' />
            <SidebarStatRow
              label='Status'
              value='Context summary pending until the current response completes'
            />
          </Show>
          <Show when={props.input.accounts.length === 0}>
            <SidebarTextRow text='No accounts' />
          </Show>
          <SidebarSection title='Routing'>
            <SidebarStatRow label='Route' value='main-first' tone='accent' />
            <SidebarStatRow
              label='Killswitch'
              value='production-team@example.com blocked'
              tone='error'
            />
          </SidebarSection>
        </>
      )}
    />
  )
}
