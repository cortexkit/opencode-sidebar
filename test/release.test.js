import { expect, test } from 'bun:test'
import { requiredCiJobs, verifyReleaseCi } from '../scripts/verify-ci.mjs'

const sha = 'a'.repeat(40)
const passedRun = {
  id: 7,
  run_number: 1,
  head_sha: sha,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
}
const passedJobs = requiredCiJobs.map((name) => ({
  name,
  conclusion: 'success',
}))
const verify = (runs, jobs = passedJobs) =>
  verifyReleaseCi({
    sha,
    token: 'test-token',
    fetchImpl: async (url) =>
      Response.json(
        url.includes('/jobs?') ? { jobs } : { workflow_runs: runs },
      ),
  })

test('release accepts successful exact main-push CI with every matrix entry', async () => {
  expect(requiredCiJobs).toHaveLength(6)
  await verify([passedRun])
})

test('release refuses CI on another commit or a pull request', async () => {
  await expect(
    verify([{ ...passedRun, head_sha: 'b'.repeat(40) }]),
  ).rejects.toThrow('exact HEAD')
  await expect(
    verify([{ ...passedRun, event: 'pull_request' }]),
  ).rejects.toThrow('exact HEAD')
})

test('release refuses missing or skipped matrix jobs', async () => {
  await expect(verify([passedRun], passedJobs.slice(1))).rejects.toThrow(
    'missing or unsuccessful',
  )
  await expect(
    verify(
      [passedRun],
      passedJobs.map((job, index) =>
        index ? job : { ...job, conclusion: 'skipped' },
      ),
    ),
  ).rejects.toThrow('missing or unsuccessful')
})

test('release does not fall back to an older successful run', async () => {
  await expect(
    verify([
      passedRun,
      { ...passedRun, id: 8, run_number: 2, conclusion: 'failure' },
    ]),
  ).rejects.toThrow('concluded failure')
})

test('release refuses unknown flags before any repository operation', async () => {
  const child = Bun.spawn(
    ['bash', 'scripts/release.sh', '0.1.0', '--dry-run'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const stderr = await new Response(child.stderr).text()
  expect(await child.exited).toBe(1)
  expect(stderr).toContain('the only option is --dry')
})

test('gate rejects unknown flags and fails closed', async () => {
  const child = Bun.spawn(['bash', 'scripts/gate.sh', '--quick'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(child.stdout).text()
  expect(await child.exited).toBe(2)
  expect(stdout).toContain('GATE_FAILED arguments')
  expect(stdout).not.toContain('GATE_OK')
})
