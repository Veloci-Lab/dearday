import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

serve(async () => {
  try {
    console.log('[daily-question-push] start')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    /* 1️⃣ 오늘 날짜 (KST 기준) 질문 조회 */
    const today = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    )
      .toISOString()
      .slice(0, 10)

    console.log('[daily-question-push] today:', today)

    /* 오늘의 질문 조회 */
    const { data: questionData, error: questionError } = await supabase
      .from('daily_questions')
      .select('question_text')
      .eq('question_date', today)
      .single()

    if (questionError || !questionData) {
      console.error('[daily-question-push] question not found:', questionError)
      return new Response('question not found', { status: 404 })
    }

    const questionText = questionData.question_text
    console.log('[daily-question-push] question:', questionText)

    /* 2️⃣ 푸시 대상 조회 */
    const { data: users, error } = await supabase.rpc(
      'get_daily_question_push_targets',
      { target_date: today }
    )

    if (error) {
      console.error(error)
      return new Response('query error', { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log('[daily-question-push] no targets')
      return new Response('no targets', { status: 200 })
    }

    /* 3️⃣ Expo Push Payload 생성 */
    const payloads = users.map((u: any) => ({
      to: u.push_token,
      sound: 'default',
      title: '오늘의 질문이 도착해 있어요.💌',
      body: questionText,
      data: {
        type: 'daily_question',
        date: today,
      },
    }))

    /* 4️⃣ Expo Push 전송 */
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloads),
    })

    const result = await res.json()
    console.log('[daily-question-push] expo result:', result)

    /* 5️⃣ 성공한 유저만 sent 기록 */
    if (Array.isArray(result.data)) {
      const sentRows = result.data
        .map((r: any, idx: number) => {
          if (r.status === 'ok') {
            return {
              profile_id: users[idx].profile_id,
              sent_date: today,
            }
          }
          return null
        })
        .filter(Boolean)

      if (sentRows.length > 0) {
        const { error: insertError } = await supabase
          .from('daily_question_sent')
          .insert(sentRows)

        if (insertError) {
          console.error('[daily-question-push] insert error:', insertError)
        } else {
          console.log(
            `[daily-question-push] recorded ${sentRows.length} sent rows`
          )
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[daily-question-push] error:', err)
    return new Response('internal error', { status: 500 })
  }
})
