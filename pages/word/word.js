const { FSRS, State, Rating } = require('../../lib/fsrs.js');
const textbooks = require('../../data/textbooks.js');
const db = wx.cloud.database();
const app = getApp();

// 语音合成管理器
const audioManager = {
  innerAudioContext: null,
  isPlaying: false,

  init() {
    if (!this.innerAudioContext) {
      this.innerAudioContext = wx.createInnerAudioContext();
    }
  },

  // 使用 Web Speech API 风格的语音合成（通过微信语音接口）
  speak(text, lang = 'en-US') {
    this.init();
    // 使用微信的语音合成能力
    wx.playVoice({
      filePath: '', // 这里使用 TTS 服务
      success: () => {
        console.log('播放成功');
      },
      fail: (err) => {
        console.log('语音播放失败，使用备用方案', err);
        // 备用：使用系统 TTS
        this.speakFallback(text);
      }
    });
  },

  speakFallback(text) {
    // 由于微信小程序限制，使用长按复制到系统剪贴板提示
    wx.showToast({
      title: '已复制单词，可长按搜索发音',
      icon: 'none',
      duration: 2000
    });
  },

  // 使用百度/腾讯等免费 TTS API 的替代方案
  speakWithApi(word) {
    // 使用在线 TTS 服务
    const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=0`;
    this.init();
    this.innerAudioContext.src = ttsUrl;
    this.innerAudioContext.play();
    this.innerAudioContext.onError((err) => {
      console.log('TTS播放失败', err);
      this.speakFallback(word);
    });
  }
};

Page({
  data: {
    words: [],
    currentWord: null,
    currentIndex: -1,
    wordStates: {},
    flipped: false,
    todayCount: 0,
    finished: false,
    cycleCount: 0,
    isSpeaking: false,
    showPhonetic: true
  },

  onLoad() {
    this.fsrs = new FSRS();
    this.loadWords();
  },

  loadWords() {
    const textbook = app.globalData.selectedTextbook;
    const unit = app.globalData.selectedUnit;
    
    if (!textbook || !unit || !textbooks[textbook] || !textbooks[textbook][unit]) {
      wx.showToast({ title: '请先选择教材和单元', icon: 'none' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    const words = textbooks[textbook][unit];
    this.setData({ words });
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

  // 跟读功能：播放单词发音
  speakWord() {
    const { currentWord } = this.data;
    if (!currentWord) return;
    
    this.setData({ isSpeaking: true });
    
    // 使用有道词典的 TTS 接口
    const ttsUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(currentWord.word)}&type=0`;
    const audioContext = wx.createInnerAudioContext();
    audioContext.src = ttsUrl;
    audioContext.play();
    
    audioContext.onEnded(() => {
      this.setData({ isSpeaking: false });
      audioContext.destroy();
    });
    
    audioContext.onError((err) => {
      console.log('发音播放失败', err);
      this.setData({ isSpeaking: false });
      wx.showToast({ title: '发音加载失败', icon: 'none' });
      audioContext.destroy();
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
