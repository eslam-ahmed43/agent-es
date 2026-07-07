import PDFDocument from 'pdfkit'
import { supabaseAdmin } from '../lib/supabase'
import { getReliabilityScore, getPerformanceAnalytics } from './analytics.service'

export const generateReliabilityReport = async (agent_id: string): Promise<Buffer> => {
    const { data: agent } = await supabaseAdmin
        .from('agents').select('*').eq('id', agent_id).single()

    if (!agent) throw new Error('Agent not found')

    const reliability = await getReliabilityScore(agent_id)
    const analytics = await getPerformanceAnalytics(agent_id)

    const { data: benchmarkResults } = await supabaseAdmin
        .from('leaderboard')
        .select('*, benchmarks(name, domain, passing_threshold)')
        .eq('agent_id', agent_id)
        .order('overall_score', { ascending: false })

    const { data: lastRegression } = await supabaseAdmin
        .from('regression_runs')
        .select('*')
        .eq('agent_id', agent_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const { data: versions } = await supabaseAdmin
        .from('prompt_versions')
        .select('version_number, overall_score, created_at, improvements_applied')
        .eq('agent_id', agent_id)
        .order('version_number', { ascending: false })
        .limit(5)

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' })
        const chunks: Buffer[] = []

        doc.on('data', chunk => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        const primaryColor = '#000000'
        const grayColor = '#6B7280'
        const greenColor = '#10B981'
        const redColor = '#EF4444'
        const yellowColor = '#F59E0B'

        const getScoreColor = (score: number) =>
            score >= 0.8 ? greenColor : score >= 0.6 ? yellowColor : redColor

        // Header
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor)
        doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
            .text('AgentOS', 50, 25)
        doc.fontSize(10).font('Helvetica')
            .text('AI Agent Reliability Report', 50, 52)
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            doc.page.width - 200, 52, { width: 150, align: 'right' })

        doc.moveDown(3)

        // Agent Info
        doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold')
            .text(agent.name, 50, 100)
        doc.fillColor(grayColor).fontSize(10).font('Helvetica')
            .text(`Model: ${agent.model || agent.type || 'N/A'}  •  Type: ${agent.type || 'N/A'}  •  Generated: ${new Date().toLocaleString()}`, 50, 122)

        doc.moveTo(50, 145).lineTo(doc.page.width - 50, 145).strokeColor('#E5E7EB').lineWidth(1).stroke()

        // Reliability Score Section
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Reliability Score', 50, 160)

        if (reliability) {
            const scoreColor = getScoreColor(reliability.reliability_score / 100)
            doc.fillColor(scoreColor).fontSize(48).font('Helvetica-Bold')
                .text(reliability.reliability_score.toString(), 50, 178)

            doc.fillColor(grayColor).fontSize(9).font('Helvetica')
                .text(`Based on ${reliability.runs_analyzed} runs  •  Confidence: ${reliability.confidence}`, 50, 235)

            const metrics = [
                { label: 'Overall', value: reliability.overall },
                { label: 'Safety', value: reliability.safety },
                { label: 'Relevance', value: reliability.relevance },
                { label: 'Consistency', value: reliability.consistency },
                { label: 'Helpfulness', value: reliability.helpfulness },
                { label: 'Stability', value: reliability.stability },
                { label: 'Pass Rate', value: reliability.pass_rate }
            ]

            const colWidth = (doc.page.width - 100) / 4
            metrics.forEach((m, i) => {
                const col = i % 4
                const row = Math.floor(i / 4)
                const x = 50 + col * colWidth
                const y = 255 + row * 55

                doc.rect(x, y, colWidth - 10, 45).fillColor('#F9FAFB').fill()
                doc.fillColor(getScoreColor(m.value / 100)).fontSize(16).font('Helvetica-Bold')
                    .text(`${m.value}%`, x + 8, y + 8)
                doc.fillColor(grayColor).fontSize(8).font('Helvetica')
                    .text(m.label, x + 8, y + 30)
            })
        } else {
            doc.fillColor(grayColor).fontSize(11).font('Helvetica')
                .text('No reliability data available yet.', 50, 178)
        }

        doc.moveTo(50, 375).lineTo(doc.page.width - 50, 375).strokeColor('#E5E7EB').lineWidth(1).stroke()

        // Benchmark Results
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Benchmark Results', 50, 390)

        if (benchmarkResults && benchmarkResults.length > 0) {
            let y = 412
            benchmarkResults.forEach(result => {
                const bench = result.benchmarks as any
                const score = result.overall_score || 0
                const passed = score >= (bench?.passing_threshold || 0.7)

                doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
                    .text(bench?.name || 'Unknown', 50, y)
                doc.fillColor(getScoreColor(score)).fontSize(10).font('Helvetica-Bold')
                    .text(`${(score * 100).toFixed(1)}%`, doc.page.width - 120, y, { width: 70, align: 'right' })
                doc.fillColor(passed ? greenColor : redColor).fontSize(9).font('Helvetica')
                    .text(passed ? '✓ PASSED' : '✗ FAILED', doc.page.width - 50, y, { width: 40 })

                const barWidth = doc.page.width - 100
                doc.rect(50, y + 14, barWidth, 6).fillColor('#F3F4F6').fill()
                doc.rect(50, y + 14, barWidth * score, 6).fillColor(getScoreColor(score)).fill()

                doc.fillColor(grayColor).fontSize(8).font('Helvetica')
                    .text(`${result.passed_count} passed / ${result.failed_count} failed / ${result.total_count} total`, 50, y + 24)

                y += 50
            })
        } else {
            doc.fillColor(grayColor).fontSize(10).font('Helvetica')
                .text('No benchmark results yet.', 50, 412)
        }

        doc.addPage()

        // Strengths & Weaknesses
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Performance Analysis', 50, 50)

        const halfWidth = (doc.page.width - 110) / 2

        if (analytics?.strengths && analytics.strengths.length > 0) {
            doc.rect(50, 72, halfWidth, 20).fillColor('#D1FAE5').fill()
            doc.fillColor('#065F46').fontSize(10).font('Helvetica-Bold').text('✓ Strengths', 60, 77)
            let y = 100
            analytics.strengths.forEach(s => {
                doc.fillColor(primaryColor).fontSize(9).font('Helvetica')
                    .text(s.type.replace('_', ' ').toUpperCase(), 60, y)
                doc.fillColor(greenColor).font('Helvetica-Bold')
                    .text(`${s.avg_score}%`, halfWidth - 10, y, { width: 40, align: 'right' })
                y += 18
            })
        }

        if (analytics?.weaknesses && analytics.weaknesses.length > 0) {
            const x2 = 60 + halfWidth
            doc.rect(x2, 72, halfWidth, 20).fillColor('#FEE2E2').fill()
            doc.fillColor('#991B1B').fontSize(10).font('Helvetica-Bold').text('✗ Weaknesses', x2 + 10, 77)
            let y = 100
            analytics.weaknesses.forEach(w => {
                doc.fillColor(primaryColor).fontSize(9).font('Helvetica')
                    .text(w.type.replace('_', ' ').toUpperCase(), x2 + 10, y)
                doc.fillColor(redColor).font('Helvetica-Bold')
                    .text(`${w.avg_score}%`, x2 + halfWidth - 10, y, { width: 40, align: 'right' })
                y += 18
            })
        }

        const analysisEndY = 100 + Math.max(
            (analytics?.strengths?.length || 0),
            (analytics?.weaknesses?.length || 0)
        ) * 18 + 20

        doc.moveTo(50, analysisEndY).lineTo(doc.page.width - 50, analysisEndY).strokeColor('#E5E7EB').lineWidth(1).stroke()

        // Recommendations
        const recY = analysisEndY + 15
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Recommendations', 50, recY)

        const recs: string[] = []
        if (analytics?.weaknesses) {
            analytics.weaknesses.forEach(w => {
                if (w.type === 'attack') recs.push('Strengthen prompt injection and jailbreak defenses using Targeted Improve.')
                if (w.type === 'edge_case') recs.push('Add more edge case scenarios to the benchmark and re-run Auto Improve.')
                if (w.type === 'persona') recs.push('Improve handling of different user personas — focus on empathy and tone.')
                if (w.type === 'long_conversation') recs.push('Improve context retention across long multi-turn conversations.')
            })
        }
        if (recs.length === 0) recs.push('Performance looks strong across all scenario types. Keep running regular regression checks.')

        let recItemY = recY + 22
        recs.forEach((rec, i) => {
            doc.fillColor(primaryColor).fontSize(9).font('Helvetica')
                .text(`${i + 1}. ${rec}`, 55, recItemY, { width: doc.page.width - 110 })
            recItemY += 20
        })

        doc.moveTo(50, recItemY + 5).lineTo(doc.page.width - 50, recItemY + 5).strokeColor('#E5E7EB').lineWidth(1).stroke()

        // Regression Status
        const regY = recItemY + 20
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Regression Status', 50, regY)

        if (lastRegression) {
            const regColor = lastRegression.overall_regression ? redColor : greenColor
            const regText = lastRegression.overall_regression ? '⚠ REGRESSION DETECTED' : '✓ ALL CLEAR'
            doc.fillColor(regColor).fontSize(14).font('Helvetica-Bold').text(regText, 50, regY + 22)
            doc.fillColor(grayColor).fontSize(9).font('Helvetica')
                .text(`Last checked: ${new Date(lastRegression.created_at).toLocaleString()}`, 50, regY + 42)
        } else {
            doc.fillColor(grayColor).fontSize(10).font('Helvetica')
                .text('No regression suite has been run yet.', 50, regY + 22)
        }

        // Version History
        if (versions && versions.length > 0) {
            const verY = regY + (lastRegression ? 75 : 50)
            doc.moveTo(50, verY - 10).lineTo(doc.page.width - 50, verY - 10).strokeColor('#E5E7EB').lineWidth(1).stroke()
            doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Version History', 50, verY)

            let vY = verY + 22
            versions.forEach(v => {
                doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
                    .text(`v${v.version_number}`, 50, vY)
                if (v.overall_score !== null) {
                    doc.fillColor(getScoreColor(v.overall_score)).font('Helvetica-Bold')
                        .text(`${(v.overall_score * 100).toFixed(1)}%`, 90, vY)
                }
                doc.fillColor(grayColor).font('Helvetica')
                    .text(new Date(v.created_at).toLocaleDateString(), 140, vY)
                if (v.improvements_applied?.length > 0) {
                    doc.fillColor(grayColor).text(`  •  ${v.improvements_applied[0]}`, 200, vY, { width: doc.page.width - 250 })
                }
                vY += 18
            })
        }

        // Footer
        doc.rect(0, doc.page.height - 40, doc.page.width, 40).fillColor('#F9FAFB').fill()
        doc.fillColor(grayColor).fontSize(8).font('Helvetica')
            .text('Generated by AgentOS — AI Agent Reliability Platform', 50, doc.page.height - 25)
        doc.text(`Page 2 of 2`, doc.page.width - 100, doc.page.height - 25, { width: 80, align: 'right' })

        doc.end()
    })
}