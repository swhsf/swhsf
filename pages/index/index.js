const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    loading: true,
    dailyGoal: 20,
    reviewCount: 0,
    newCount: 0,
    totalLearned: 0,
    retryCount: 0
  },

  onShow() {
    this.data.retryCount = 0
    this.loadData()
  },

  async loadData() {
    // 限制重试次数，避免无限循环
    if (!app.globalData.openid) {
      if (this.data.retryCount < 20) {
        this.data.retryCount++
        setTimeout(() => this.loadData(), 500)
      } else {
        console.log("获取 openid 超时，使用本地缓存数据")
        this.loadFromLocal()
      }
      return
    }

    try {
      const res = await db.collection('user_progress').doc(app.globalData.openid).get()
      const data = res.data
      const now = Date.now()
      let review = 0, newCount = 0
      const states = (data && data.wordStates) || {}

      for (let word in states) {
        const card = states[word]
        if (card.due <= now && card.scheduled_days > 0) review++
        if (card.scheduled_days === 0) newCount++
      }

      this.setData({
        reviewCount: review,
        newCount: newCount,
        totalLearned: Object.keys(states).length,
        dailyGoal: app.globalData.dailyGoal,
        loading: false
      })
    } catch (e) {
      console.log("加载数据失败", e)
      // 尝试从本地缓存加载
      this.loadFromLocal()
    }
  },

  loadFromLocal() {
    try {
      const localStates = wx.getStorageSync('wordStates')
      if (localStates) {
        const now = Date.now()
        let review = 0, newCount = 0
        for (let word in localStates) {
          const card = localStates[word]
          if (card.due <= now && card.scheduled_days > 0) review++
          if (card.scheduled_days === 0) newCount++
        }
        this.setData({
          reviewCount: review,
          newCount: newCount,
          totalLearned: Object.keys(localStates).length,
          dailyGoal: app.globalData.dailyGoal,
          loading: false
        })
        return
      }
    } catch (e) {
      console.log("本地缓存加载失败", e)
    }
    this.setData({ loading: false, reviewCount: 0, newCount: 0, totalLearned: 0 })
  },

  setGoal() {
    wx.showModal({
      title: '设置每日单词数',
      editable: true,
      placeholderText: String(this.data.dailyGoal),
      success: (res) => {
        if (res.confirm && res.content > 0) {
          app.globalData.dailyGoal = Number(res.content)
          this.setData({ dailyGoal: app.globalData.dailyGoal })
        }
      }
    })
  },

  startStudy() {
    wx.navigateTo({ url: '/pages/word/word' })
  }
})
