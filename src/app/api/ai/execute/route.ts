import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

interface ExecuteRequest {
  taskId: string
  agentId: string
  userMessage: string
  taskContext?: {
    title?: string
    description?: string
    status?: string
    priority?: string
  }
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExecuteRequest
    const { taskId, agentId, userMessage, taskContext, history = [] } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured on server' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch agent details for system prompt
    const { data: agent } = await supabase
      .from('agents')
      .select('name, type, capabilities, description')
      .eq('id', agentId)
      .single()

    const systemPrompt = `Você é ${agent?.name || 'um agente IA'}, um agente especializado trabalhando em colaboração com um humano numa plataforma de gestão de tarefas chamada roadMap.

${agent?.description ? `Sua descrição: ${agent.description}` : ''}
${agent?.capabilities ? `Suas capacidades: ${JSON.stringify(agent.capabilities)}` : ''}

## Contexto da tarefa atual:
Título: ${taskContext?.title || 'Sem título'}
Status: ${taskContext?.status || 'Desconhecido'}
Prioridade: ${taskContext?.priority || 'Normal'}
${taskContext?.description ? `Descrição: ${taskContext.description}` : ''}

## Seu papel:
- Ajudar o usuário a executar essa tarefa
- Fazer perguntas quando necessário para esclarecer requisitos
- Propor passos concretos, checklists e próximas ações
- Quando o usuário pedir, produzir artefatos (código, texto, análises)
- Ser claro, objetivo e prático. Responda em português brasileiro.`

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ]

    // Persist user message
    await supabase.from('task_ai_messages').insert({
      task_id: taskId,
      agent_id: agentId,
      role: 'user',
      content: userMessage,
    })

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      return NextResponse.json(
        { error: `Anthropic API error: ${errText}` },
        { status: anthropicResponse.status }
      )
    }

    const result = await anthropicResponse.json()
    const assistantText = result.content?.[0]?.text || ''

    // Persist assistant message
    await supabase.from('task_ai_messages').insert({
      task_id: taskId,
      agent_id: agentId,
      role: 'assistant',
      content: assistantText,
      metadata: { model: result.model, usage: result.usage },
    })

    return NextResponse.json({
      message: assistantText,
      usage: result.usage,
    })
  } catch (err: any) {
    console.error('AI execute error:', err)
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
