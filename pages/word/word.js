const { FSRS, State, Rating } = require('../../lib/fsrs.js');
const wordList = require('../../data/wordList.js');
const db = wx.cloud.database();
const app = getApp();

Page({
  data: {
    words: wordList,
    currentWord: null,
    currentIndex: -1,
    wordStates: {},
    flipped: false,
    todayCount: 0,
    finished: false,
    cycleCount: 0
  },

  onLoad() {
    this.fsrs = new FSRS();
    this.initFromCloud();
  },

  async initFromCloud() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await db.collection('user_progress').doc(app.globalData.openid).get();
      this.setData({ wordStates: (res.data && res.data.wordStates) || {} });
    } catch (e) {
      console.log("无历史数据，使用默认状态");
      // 尝试从本地缓存恢复
      try {
        const localStates = wx.getStorageSync('wordStates');
        if (localStates) {
          this.setData({ wordStates: localStates });
        }
      } catch (e2) {
        console.log("本地缓存也无数据");
      }
    }
    this.loadNextWord();
    wx.hideLoading();
  },

  async saveToCloud() {
    // 同时保存到本地缓存作为备份
    try {
      wx.setStorageSync('wordStates', this.data.wordStates);
    } catch (e) {
      console.log("本地缓存保存失败");
    }

    try {
      await db.collection('user_progress').doc(app.globalData.openid).set({
        data: { wordStates: this.data.wordStates }
      });
    } catch (e) {
      // 如果文档不存在，尝试创建
      try {
        await db.collection('user_progress').add({
          data: {
            _id: app.globalData.openid,
            wordStates: this.data.wordStates
          }
        });
      } catch (e2) {
        console.error("保存失败", e2);
      }
    }
  },

  flipCard() {
    this.setData({ flipped: !this.data.flipped });
  },

  loadNextWord() {
    const { currentIndex, words, wordStates } = this.data;
    let newIndex = currentIndex + 1;

    // 如果已学完一轮，重新开始循环
    if (newIndex >= words.length) {
      const newCycleCount = this.data.cycleCount + 1;
      this.setData({ cycleCount: newCycleCount });
      newIndex = 0;
    }

    const word = words[newIndex];

    // 使用完整路径更新 wordStates，避免动态 key 兼容性问题
    const key = 'wordStates.' + word.word;
    if (!wordStates[word.word]) {
      const newState = {};
      newState[key] = {
        stability: 0,
        difficulty: 0,
        state: State.New,
        due: Date.now(),
        scheduled_days: 0,
        last_review: null
      };
      this.setData(newState);
    }

    this.setData({
      currentIndex: newIndex,
      currentWord: word,
      flipped: false
    });
  },

  rateAgain() {
    this.rateWord(Rating.Again);
  },
  rateHard() {
    this.rateWord(Rating.Hard);
  },
  rateGood() {
    this.rateWord(Rating.Good);
  },

  async rateWord(rating) {
    const { currentWord, wordStates } = this.data;
    if (!currentWord) return;

    const now = new Date();
    const storedCard = wordStates[currentWord.word];
    const card = {
      ...storedCard,
      due: storedCard.due ? new Date(storedCard.due) : now
    };

    const result = this.fsrs.repeat(card, now);
    const updated = result[rating].card;

    // 使用完整路径更新，避免动态 key 兼容性问题
    const key = 'wordStates.' + currentWord.word;
    const updateData = {};
    updateData[key] = {
      ...updated,
      due: updated.due instanceof Date ? updated.due.getTime() : Date.now(),
      last_review: updated.last_review instanceof Date ? updated.last_review.getTime() : null
    };
    updateData.todayCount = this.data.todayCount + 1;
    this.setData(updateData);

    // 等待保存完成
    await this.saveToCloud();

    // 检查是否达到每日目标
    if (this.data.todayCount >= app.globalData.dailyGoal) {
      wx.redirectTo({
        url: '/pages/complete/complete?count=' + this.data.todayCount
      });
      return;
    }

    this.loadNextWord();
  },

  backHome() {
    wx.navigateBack();
  }
});
