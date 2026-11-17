// 「サンプルを読み込む」ボタンで追加される、語の仲間とテンプレート文。
// id は固定。同じサンプルを何度読み込んでも、二重には増えない。
//
// テンプレートの作りかた
//   - familyId なし：どの語の仲間を入れても文法の位置が変わらない文（位置だけで解ける問題）
//   - familyId あり：意味まで見ないと解けない問題（名詞＋名詞・人か物か・分詞）は、
//                    その語の仲間専用にしてある

import type { FormKey, PatternId, Template, WordFamily } from '../types'

function family(
  key: string,
  forms: Partial<Record<FormKey, string>>,
  meanings: Partial<Record<FormKey, string>>,
): WordFamily {
  return { id: `starter-${key}`, ...forms, meanings: meanings as Record<string, string> }
}

export const STARTER_FAMILIES: WordFamily[] = [
  family(
    'decide',
    { verb: 'decide', noun: 'decision', adj: 'decisive', adv: 'decisively', ing: 'deciding', ed: 'decided' },
    { verb: '決める', noun: '決定', adj: '決定的な', adv: 'きっぱりと', ing: '決めている', ed: '決められた' },
  ),
  family(
    'apply',
    { verb: 'apply', noun: 'application', person: 'applicant', adj: 'applicable', ing: 'applying', ed: 'applied' },
    { verb: '申し込む', noun: '申込書、応募', person: '応募者', adj: '適用できる', ing: '申し込んでいる', ed: '応用された' },
  ),
  family(
    'employ',
    { verb: 'employ', noun: 'employment', person: 'employee', ing: 'employing', ed: 'employed' },
    { verb: '雇う', noun: '雇用', person: '従業員', ing: '雇っている', ed: '雇われている' },
  ),
  family(
    'attract',
    { verb: 'attract', noun: 'attraction', adj: 'attractive', adv: 'attractively', ing: 'attracting', ed: 'attracted' },
    { verb: '引きつける', noun: '呼び物、魅力', adj: '魅力的な', adv: '魅力的に', ing: '引きつけている', ed: '引きつけられた' },
  ),
  family(
    'consider',
    { verb: 'consider', noun: 'consideration', adj: 'considerable', adv: 'considerably', ing: 'considering', ed: 'considered' },
    { verb: 'よく考える', noun: '考慮', adj: 'かなりの', adv: 'かなり', ing: '考えている', ed: '考慮された' },
  ),
  family(
    'succeed',
    { verb: 'succeed', noun: 'success', adj: 'successful', adv: 'successfully', ing: 'succeeding', ed: 'succeeded' },
    { verb: '成功する', noun: '成功', adj: '成功した', adv: 'うまく', ing: '成功している', ed: '成功した' },
  ),
  family(
    'manage',
    { verb: 'manage', noun: 'management', person: 'manager', adj: 'managerial', ing: 'managing', ed: 'managed' },
    { verb: '管理する', noun: '経営、管理', person: '管理者', adj: '管理の', ing: '管理している', ed: '管理された' },
  ),
  family(
    'produce',
    { verb: 'produce', noun: 'production', person: 'producer', adj: 'productive', adv: 'productively', ing: 'producing', ed: 'produced' },
    { verb: '生産する', noun: '生産', person: '生産者', adj: '生産的な', adv: '生産的に', ing: '生産している', ed: '生産された' },
  ),
]

// テンプレートを作る小さな道具。id は「パターン名＋連番」で固定する。
const counters: Record<string, number> = {}
function t(
  pattern: PatternId,
  text: string,
  answerPos: FormKey,
  translation: string,
  clue: string,
  familyKey?: string,
): Template {
  counters[pattern] = (counters[pattern] ?? 0) + 1
  const template: Template = { id: `starter-t-${pattern}-${counters[pattern]}`, pattern, text, answerPos, translation, clue }
  if (familyKey) template.familyId = `starter-${familyKey}`
  return template
}

export const STARTER_TEMPLATES: Template[] = [
  // ---- 名詞 ----
  t('noun_det', 'The ------- of the new policy was announced yesterday.', 'noun',
    '新しい方針の（　）は昨日発表された。', 'The ------- of → 冠詞 The のあと・of の前は名詞'),
  t('noun_det', "Mr. Kim's ------- was received with great interest.", 'noun',
    'キム氏の（　）は大きな関心をもって受け止められた。', "所有格 Mr. Kim's のあとは名詞"),
  t('noun_obj', 'The company is seeking ------- from all employees.', 'noun',
    '会社は全従業員からの（　）を求めている。', 'seeking（他動詞）のあと、「〜を」にあたる部分は名詞'),
  t('noun_obj', 'Our team needs ------- before the deadline.', 'noun',
    '私たちのチームは締め切り前に（　）を必要としている。', 'needs（他動詞）の目的語は名詞'),
  t('noun_prep', 'The proposal was approved without -------.', 'noun',
    'その提案は（　）なしで承認された。', 'without（前置詞）のあとは名詞'),
  t('noun_prep', 'The launch was postponed because of -------.', 'noun',
    '発売は（　）のために延期された。', 'because of（前置詞）のあとは名詞'),
  t('noun_subj', '------- is expected to improve the company\'s performance.', 'noun',
    '（　）は会社の業績を改善すると期待されている。', '文頭・動詞 is の前の主語は名詞'),
  t('noun_subj', 'At the end of the year, ------- will be reviewed by the committee.', 'noun',
    '年末に、（　）は委員会によって見直される。', 'カンマのあと・will be の前の主語は名詞'),
  t('noun_noun', 'The ------- contract must be signed by both parties.', 'noun',
    '（　）契約は双方が署名しなければならない。', 'contract（名詞）を修飾して「〜に関する契約」→ 名詞＋名詞', 'employ'),
  t('noun_noun', 'The ------- line was shut down for repairs.', 'noun',
    '（　）ラインは修理のために停止された。', 'line（名詞）を修飾して「〜ライン」→ 名詞＋名詞（production line）', 'produce'),
  t('noun_person', 'The ------- for the position must submit a résumé by Friday.', 'person',
    'その職への（　）は金曜までに履歴書を提出しなければならない。', '提出する主体は「人」→ -ant / -ee / -er の人を表す名詞', 'apply'),
  t('noun_person', 'Please submit your ------- online by the end of the month.', 'noun',
    '月末までにオンラインで（　）を提出してください。', 'submit の目的語は「物（書類）」→ -tion の名詞', 'apply'),
  t('noun_person', 'Each ------- will receive a security badge on the first day.', 'person',
    '各（　）は初日にセキュリティバッジを受け取る。', 'Each のあと、バッジを受け取るのは「人」', 'employ'),
  t('noun_person', 'Mr. Kim ended his ------- with the firm last year.', 'noun',
    'キム氏は昨年、その会社との（　）を終えた。', 'his のあと、ended の目的語は「行為・状態」を表す名詞', 'employ'),
  t('noun_person', 'Our -------, Ms. Lopez, approved the new schedule.', 'person',
    '私たちの（　）であるロペスさんが新しいスケジュールを承認した。', 'Ms. Lopez と言い換えられるのは「人」', 'manage'),
  t('noun_person', 'Increased ------- will lower the cost of each unit.', 'noun',
    '（　）の増加は、1個あたりの費用を下げるだろう。', 'Increased のあと、「量・行為」を表す名詞', 'produce'),

  // ---- 形容詞 ----
  t('adj_noun', 'This is a very ------- proposal.', 'adj',
    'これはとても（　）な提案だ。', 'very のあと・名詞 proposal の前は形容詞'),
  t('adj_noun', 'We received a most ------- response from the client.', 'adj',
    '私たちは取引先から最も（　）な返事を受け取った。', 'most のあと・名詞 response の前は形容詞'),
  t('adj_be', 'The new schedule is ------- for all staff.', 'adj',
    '新しいスケジュールは全スタッフにとって（　）だ。', 'is（be動詞）のあとは形容詞'),
  t('adj_be', 'Our results were ------- this year.', 'adj',
    '今年の私たちの結果は（　）だった。', 'were（be動詞）のあとは形容詞'),

  // ---- 副詞 ----
  t('adv_verb', 'Ms. Tanaka ------- reviewed the report before the meeting.', 'adv',
    'タナカさんは会議の前にレポートを（　）見直した。', '主語 Ms. Tanaka と動詞 reviewed の間は副詞'),
  t('adv_verb', 'The new system has ------- improved our workflow.', 'adv',
    '新しいシステムは私たちの作業の流れを（　）改善した。', 'has と過去分詞 improved の間は副詞'),
  t('adv_end', 'Mr. Lee explained everything -------.', 'adv',
    'リー氏はすべてを（　）説明した。', '文が完成している（explained everything）→ あとに付け足すのは副詞'),
  t('adv_end', 'The team finished it -------.', 'adv',
    'チームはそれを（　）終えた。', '文が完成している（finished it）→ あとに付け足すのは副詞'),
  t('adv_adj', 'The report was ------- useful for our planning.', 'adv',
    'そのレポートは私たちの計画にとって（　）役に立った。', '形容詞 useful の前は副詞'),
  t('adv_adj', 'Careful planning is ------- important to our success.', 'adv',
    '慎重な計画は私たちの成功にとって（　）重要だ。', '形容詞 important の前は副詞'),

  // ---- 動詞 ----
  t('verb_modal', 'Employees should ------- the form before leaving.', 'verb',
    '従業員は退出前に用紙を（　）べきだ。', '助動詞 should のあとは動詞の原形'),
  t('verb_modal', 'Ms. Cho plans to ------- the budget next month.', 'verb',
    'チョーさんは来月、予算を（　）つもりだ。', 'to のあと（不定詞）は動詞の原形'),

  // ---- 分詞（意味まで見ないと解けないので、語の仲間専用） ----
  t('participle', 'We are ------- hiring two new engineers.', 'ing',
    '私たちは新しい技術者を2名雇うことを（　）いる。', '主語 We が「考える」側 → 能動の -ing（are considering）', 'consider'),
  t('participle', 'The proposal was ------- carefully by the board.', 'ed',
    'その提案は役員会によって慎重に（　）。', '提案は「考慮される」側 → 受け身の -ed（was considered）', 'consider'),
  t('participle', 'The company is ------- in the overseas market.', 'ing',
    'その会社は海外市場で（　）いる。', 'is のあとで「〜している」（進行形）→ -ing', 'succeed'),
  t('participle', 'The new exhibit is ------- many visitors.', 'ing',
    '新しい展示は多くの来場者を（　）いる。', 'あとに目的語 many visitors がある → 能動の -ing', 'attract'),
  t('participle', 'Many visitors were ------- by the new exhibit.', 'ed',
    '多くの来場者が新しい展示に（　）。', 'by（〜によって）が続く → 受け身の -ed', 'attract'),
  t('participle', 'The goods ------- in this factory are exported worldwide.', 'ed',
    'この工場で（　）商品は世界中に輸出されている。', 'goods は「生産される」側 → 後ろから修飾する -ed', 'produce'),
  t('participle', 'The firm is ------- over fifty people.', 'ing',
    'その会社は50人以上を（　）いる。', 'あとに目的語 over fifty people がある → 能動の -ing', 'employ'),
]
