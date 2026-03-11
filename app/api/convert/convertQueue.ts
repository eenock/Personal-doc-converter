/**
 *
 * Jobs are processed in parallel up to MAX_CONCURRENT. Each job
 * has an id, status, and result/error payload. The frontend polls
 * GET /api/convert?id=<jobId> to check status.
 */

export type JobStatus = "queued" | "processing" | "done" | "error"

export interface Job {
    id: string
    status: JobStatus
    filename?: string
    mimeType?: string
    result?: Buffer
    error?: string
    createdAt: number
}

const MAX_CONCURRENT = 4          // parallel conversions
const JOB_TTL_MS = 5 * 60_000 // 5 min — auto-purge completed jobs

const jobs = new Map<string, Job>()
let running = 0

const queue: Array<() => void> = []

function next() {
    if (running >= MAX_CONCURRENT || queue.length === 0) return
    const run = queue.shift()!
    running++
    run()
}

/** Enqueue a conversion task. Returns job id immediately. */
export function enqueue(
    id: string,
    task: () => Promise<{ filename: string; mimeType: string; result: Buffer }>
): string {
    const job: Job = { id, status: "queued", createdAt: Date.now() }
    jobs.set(id, job)

    const run = async () => {
        job.status = "processing"
        try {
            const { filename, mimeType, result } = await task()
            job.status = "done"
            job.filename = filename
            job.mimeType = mimeType
            job.result = result
        } catch (err) {
            job.status = "error"
            job.error = err instanceof Error ? err.message : String(err)
        } finally {
            running--
            schedulePurge(id)
            next()
        }
    }

    queue.push(run)
    next()

    return id
}

export function getJob(id: string): Job | undefined {
    return jobs.get(id)
}

function schedulePurge(id: string) {
    setTimeout(() => jobs.delete(id), JOB_TTL_MS)
}