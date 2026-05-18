// lib/fsrs.js
const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3
}

const Rating = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4
}

class FSRS {
  constructor() {
    this.w = [0.4, 0.6, 2.4, 5.8, 4.9, 0.9, 0.8, 0.1, 1.6, 0.1, 1, 0.2, 1.7]
  }

  repeat(card, now) {
    const res = {}
    const lastD = card.difficulty
    const lastS = card.stability

    if (card.state === State.New) card.state = State.Learning

    for (const r of [1,2,3,4]) {
      const newCard = JSON.parse(JSON.stringify(card))
      newCard.last_review = now

      if (newCard.state === State.Learning || newCard.state === State.Relearning) {
        if (r === 1) {
          newCard.stability = 0.4
          newCard.difficulty = Math.min(Math.max(lastD - 0.4, 1), 10)
        } else if (r === 2) {
          newCard.stability = lastS + 0.2
          newCard.difficulty = Math.min(Math.max(lastD - 0.2, 1), 10)
        } else if (r === 3) {
          newCard.stability = lastS + 0.4
          newCard.difficulty = Math.min(Math.max(lastD, 1), 10)
          newCard.state = State.Review
        } else {
          newCard.stability = lastS + 0.6
          newCard.difficulty = Math.min(Math.max(lastD + 0.2, 1), 10)
          newCard.state = State.Review
        }
        newCard.scheduled_days = 0
        newCard.due = new Date(now.getTime() + 60000)
      } else if (newCard.state === State.Review) {
        newCard.difficulty = Math.min(Math.max(lastD - 0.4 + 0.4 * r, 1), 10)
        // 计算稳定性，确保不会为负数
        let stability = lastS * (1 + Math.exp(11 - newCard.difficulty) / 10 * (r * 2 - 3))
        if (stability < 0.1) stability = 0.1
        newCard.stability = stability
        newCard.scheduled_days = Math.max(Math.round(newCard.stability), 0)
        newCard.due = new Date(now.getTime() + newCard.scheduled_days * 86400000)
        // 如果 scheduled_days 为 0，至少安排 1 分钟后复习
        if (newCard.scheduled_days === 0) {
          newCard.due = new Date(now.getTime() + 60000)
        }
      }
      res[r] = { card: newCard }
    }
    return res
  }
}

module.exports = { FSRS, State, Rating }
