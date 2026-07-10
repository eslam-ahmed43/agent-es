import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import * as dotenv from 'dotenv'

import agentsRoute from './routes/agents.route'
import projectsRoute from './routes/projects.route'
import scenariosRoute from './routes/scenarios.route'
import runsRoute from './routes/runs.route'
import reportsRoute from './routes/reports.route'
import scenarioEngineRoute from './routes/scenario-engine.route'
import executionRoute from './routes/execution.route'
import replayRoute from './routes/replay.route'
import benchmarkRoute from './routes/benchmark.route'
import judgeValidationRoute from './routes/judge-validation.route'
import leaderboardRoute from './routes/leaderboard.route'
import autoImproveRoute from './routes/auto-improve.route'
import regressionRoute from './routes/regression.route'
import analyticsRoute from './routes/analytics.route'
import targetedImproveRoute from './routes/targeted-improve.route'
import versioningRoute from './routes/versioning.route'
import rankingsRoute from './routes/rankings.route'
import overviewRoute from './routes/overview.route'
import reportRoute from './routes/report.route'
import memoryEvalRoute from './routes/memory-eval.route'
import toolEvalRoute from './routes/tool-eval.route'
import costAnalyticsRoute from './routes/cost-analytics.route'


dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({
    origin: ['http://localhost:3000', 'https://agent-es-nu.vercel.app'],
    credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'AgentOS API is running', version: '1.0.0' })
})

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to AgentOS API 🚀' })
})


app.use('/api/agents', agentsRoute)
app.use('/api/projects', projectsRoute)
app.use('/api/scenarios', scenariosRoute)
app.use('/api/runs', runsRoute)
app.use('/api/scenario-engine', scenarioEngineRoute)
app.use('/api/execution', executionRoute)
app.use('/api/execution', replayRoute)
app.use('/api/benchmarks', benchmarkRoute)
app.use('/api/judge-validation', judgeValidationRoute)
app.use('/api/leaderboard', leaderboardRoute)
app.use('/api/improve', autoImproveRoute)
app.use('/api/regression', regressionRoute)
app.use('/api/analytics', analyticsRoute)
app.use('/api/targeted-improve', targetedImproveRoute)
app.use('/api/versions', versioningRoute)
app.use('/api/rankings', rankingsRoute)
app.use('/api/overview', overviewRoute)
app.use('/api/reports', reportRoute)
app.use('/api/reports', reportsRoute)
app.use('/api/memory-eval', memoryEvalRoute)
app.use('/api/tool-eval', toolEvalRoute)
app.use('/api/cost-analytics', costAnalyticsRoute)


app.listen(PORT, () => {
    console.log(`AgentOS Backend running on http://localhost:${PORT}`)
})

export default app