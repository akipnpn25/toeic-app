// 「サンプル単語を読み込む」ボタンで追加される、例文つきの単語（TOEIC によく出る24語）。
// 語彙問題を試すためのもの。自分の単語と一緒に使っても、いらなければ単語一覧から消せる。
//
// 例文には、見出しの英単語を「そのままの形」で入れる（deadline は deadline のまま）。
// 動詞は原形で入る文にしてある。

import type { WordEntry } from '../logic/words'

export const STARTER_WORDS: WordEntry[] = [
  // ---- 名詞 ----
  { word: 'deadline', meanings: ['締め切り'], pos: 'noun', examples: ['We must finish the project before the deadline next Friday.'] },
  { word: 'invoice', meanings: ['請求書'], pos: 'noun', examples: ['Payment is due within thirty days of the invoice date.'] },
  { word: 'budget', meanings: ['予算'], pos: 'noun', examples: ['The cost of the new equipment is over our budget.'] },
  { word: 'agenda', meanings: ['議題、予定表'], pos: 'noun', examples: ['The agenda for tomorrow\'s meeting has been sent by e-mail.'] },
  { word: 'warranty', meanings: ['保証'], pos: 'noun', examples: ['The warranty covers repairs for one year after purchase.'] },
  { word: 'supplier', meanings: ['供給業者'], pos: 'noun', examples: ['We have changed our supplier to reduce shipping costs.'] },

  // ---- 動詞 ----
  { word: 'submit', meanings: ['提出する'], pos: 'verb', examples: ['All employees must submit their expense reports by Friday.'] },
  { word: 'postpone', meanings: ['延期する'], pos: 'verb', examples: ['Heavy rain forced the company to postpone the outdoor event until next week.'] },
  { word: 'require', meanings: ['必要とする'], pos: 'verb', examples: ['This position will require at least three years of experience.'] },
  { word: 'attend', meanings: ['出席する'], pos: 'verb', examples: ['More than two hundred people are expected to attend the conference.'] },
  { word: 'purchase', meanings: ['購入する'], pos: 'verb', examples: ['Customers can purchase tickets online or at the box office.'] },
  { word: 'revise', meanings: ['修正する'], pos: 'verb', examples: ['Please revise the schedule and send it back to me by noon.'] },
  { word: 'approve', meanings: ['承認する'], pos: 'verb', examples: ['The board is expected to approve the new budget next week.'] },
  { word: 'distribute', meanings: ['配布する'], pos: 'verb', examples: ['Volunteers will distribute free samples at the entrance.'] },

  // ---- 形容詞 ----
  { word: 'available', meanings: ['利用できる、手が空いている'], pos: 'adj', examples: ['The conference room is not available on Tuesday afternoon.'] },
  { word: 'mandatory', meanings: ['義務的な'], pos: 'adj', examples: ['Attendance at the safety training is mandatory for all new employees.'] },
  { word: 'tentative', meanings: ['仮の'], pos: 'adj', examples: ['The date of the meeting is tentative and may change.'] },
  { word: 'complimentary', meanings: ['無料の'], pos: 'adj', examples: ['Guests receive a complimentary breakfast with their room.'] },
  { word: 'accurate', meanings: ['正確な'], pos: 'adj', examples: ['Please make sure that all the information on the form is accurate.'] },
  { word: 'eligible', meanings: ['資格のある'], pos: 'adj', examples: ['Employees who have worked here for a year are eligible for a bonus.'] },

  // ---- 副詞 ----
  { word: 'promptly', meanings: ['速やかに'], pos: 'adv', examples: ['Please reply promptly so that we can confirm your reservation.'] },
  { word: 'currently', meanings: ['現在'], pos: 'adv', examples: ['Our office is currently looking for a new accountant.'] },
  { word: 'recently', meanings: ['最近'], pos: 'adv', examples: ['The company has recently moved its headquarters to Seattle.'] },
  { word: 'previously', meanings: ['以前に'], pos: 'adv', examples: ['Ms. Ito had previously worked in the sales department before she joined us.'] },
]
